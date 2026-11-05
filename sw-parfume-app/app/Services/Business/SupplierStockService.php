<?php

namespace App\Services\Business;

use App\Models\Business\BarangBibit;
use App\Models\Business\BotolKosong;
use App\Models\Business\Supplier;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SupplierStockService
{
    public function move(string $type, int $itemId, int $warehouse, ?int $variant, float $delta, array $meta): void
    {
        // All callers also update the legacy aggregate inside the same DB transaction.
        $quantity = round(abs($delta), 2);
        if ($quantity <= 0) return;
        $date = app(BusinessService::class)->operationalDate()->toDateString();
        $query = DB::table('tt_stok_supplier')->where('item_type', $type)->where('item_id', $itemId)
            ->where('id_gudang', $warehouse)->where('id_botol', $variant ?: null);
        if ($delta > 0) {
            $transfer = ($meta['sumber_transaksi'] ?? '') === 'TRANSFER';
            $supplier = Supplier::query()->when(!$transfer, fn ($q) => $q->where('status', 'AKTIF'))->find($meta['id_supplier'] ?? null);
            if (!$supplier && !$transfer) throw ValidationException::withMessages(['id_supplier' => 'Pilih supplier asal stok yang aktif.']);
            $item = $type === 'BOTOL' ? BotolKosong::query()->findOrFail($itemId) : BarangBibit::query()->findOrFail($itemId);
            $id = DB::table('tt_stok_supplier')->insertGetId([
                'item_type' => $type, 'item_id' => $itemId, 'id_gudang' => $warehouse,
                'id_supplier' => $supplier?->id ?? ($transfer ? ($meta['id_supplier'] ?? null) : null), 'id_botol' => $variant ?: null, 'supplier_name' => ($transfer ? ($meta['supplier_name'] ?? null) : null) ?? $supplier?->nama_supplier ?? 'Saldo awal — supplier belum diketahui',
                'kode_barang' => $item->kode_barang ?? $item->kode_botol, 'nama_barang' => $item->nama_barang ?? $item->nama_botol,
                'unit' => $type === 'BOTOL' ? 'PCS' : 'ML', 'tanggal' => $date,
                'reference' => $meta['no_transaksi'] ?? 'MANUAL', 'qty_received' => $quantity, 'qty_remaining' => $quantity,
                'created_at' => now(), 'updated_at' => now(),
            ]);
            $this->journal($id, $date, 'MASUK', $quantity, 0, $quantity, $meta);
            return;
        }
        $lots = $query->where('qty_remaining', '>', 0)->orderBy('tanggal')->orderBy('id')->lockForUpdate()->get();
        if (round($lots->sum('qty_remaining'), 2) < $quantity) {
            throw ValidationException::withMessages(['items' => 'Stok supplier tidak cukup atau belum sesuai dengan saldo inventory. Periksa saldo per supplier sebelum mengajukan ulang.']);
        }
        foreach ($lots as $lot) {
            $take = min($quantity, (float) $lot->qty_remaining);
            $after = round((float) $lot->qty_remaining - $take, 2);
            DB::table('tt_stok_supplier')->where('id', $lot->id)->update(['qty_remaining' => $after, 'updated_at' => now()]);
            $this->journal($lot->id, $date, 'KELUAR', $take, (float) $lot->qty_remaining, $after, $meta);
            $quantity = round($quantity - $take, 2);
            if ($quantity <= 0) break;
        }
    }

    public function transfer(array $payload, bool $bottle): \Illuminate\Database\Eloquent\Model
    {
        return DB::transaction(function () use ($payload, $bottle) {
            $type = $bottle ? 'BOTOL' : 'BIBIT';
            $remaining = round((float) ($bottle ? $payload['jumlah_botol'] : $payload['qty_ml']), 2);
            $lots = DB::table('tt_stok_supplier')->where('item_type', $type)->where('item_id', $payload['id_barang'])
                ->where('id_gudang', $payload['id_gudang'])->where('qty_remaining', '>', 0)
                ->when(!$bottle && !empty($payload['id_botol']), fn ($q) => $q->where('id_botol', $payload['id_botol']))
                ->orderBy('tanggal')->orderBy('id')->lockForUpdate()->get();
            if (round($lots->sum('qty_remaining'), 2) < $remaining) throw ValidationException::withMessages(['items' => 'Stok gudang sumber tidak cukup untuk dipindahkan.']);
            $business = app(BusinessService::class);
            foreach ($lots as $lot) {
                $take = min($remaining, (float) $lot->qty_remaining);
                $meta = ['supplier_name' => $lot->supplier_name, 'id_supplier' => $lot->id_supplier, 'sumber_transaksi' => 'TRANSFER', 'no_transaksi' => $payload['no_transaksi'], 'created_by' => $payload['created_by'], 'keterangan' => $payload['keterangan'] ?? 'Pindah gudang'];
                if ($bottle) {
                    foreach (['KELUAR' => $payload['id_gudang'], 'MASUK' => $payload['id_gudang_tujuan']] as $direction => $warehouse) {
                        $business->adjustBotolKosongStock([...$meta, 'id_barang' => $lot->item_id, 'id_gudang' => $warehouse, 'tipe_mutasi' => $direction, 'jumlah_botol' => $take]);
                    }
                } else {
                    $business->replaceStock((int) $payload['id_gudang'], (int) $lot->item_id, -$take, $meta, $lot->id_botol);
                    $business->replaceStock((int) $payload['id_gudang_tujuan'], (int) $lot->item_id, $take, $meta, $lot->id_botol);
                }
                $remaining = round($remaining - $take, 2);
                if ($remaining <= 0) break;
            }
            $result = $bottle ? BotolKosong::query()->findOrFail($payload['id_barang']) : \App\Models\Business\StokGudang::query()->where('id_gudang', $payload['id_gudang_tujuan'])->where('id_barang', $payload['id_barang'])->firstOrFail();
            $result->setAttribute('no_transaksi', $payload['no_transaksi']);
            return $result;
        });
    }

    private function journal(int $lot, string $date, string $direction, float $quantity, float $before, float $after, array $meta): void
    {
        DB::table('tt_mutasi_stok_supplier')->insert([
            'stock_lot_id' => $lot, 'tanggal' => $date, 'direction' => $direction, 'quantity' => $quantity,
            'balance_before' => $before, 'balance_after' => $after,
            'reference' => $meta['no_transaksi'] ?? 'MANUAL', 'source' => $meta['sumber_transaksi'] ?? 'ADJUSTMENT',
            'created_by' => $meta['created_by'] ?? null, 'notes' => $meta['keterangan'] ?? null,
            'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    public function withBottleLocations(\Illuminate\Support\Collection $bottles): \Illuminate\Support\Collection
    {
        $locations = DB::table('tt_stok_supplier')->where('item_type', 'BOTOL')->whereIn('item_id', $bottles->pluck('id'))
            ->select('item_id', 'id_gudang')->selectRaw('SUM(qty_remaining) as quantity')->groupBy('item_id', 'id_gudang')->get()->groupBy('item_id');
        return $bottles->map(function ($bottle) use ($locations) {
            $bottle->setAttribute('warehouse_stocks', $locations->get($bottle->id, collect())->values());
            return $bottle;
        });
    }

    public function query(string $mode, array $filters = []): Builder
    {
        $query = DB::table('tt_stok_supplier as l')->leftJoin('tm_gudang as g', 'g.id', '=', 'l.id_gudang');
        $query->when($filters['id_supplier'] ?? null, fn ($q, $id) => $q->where('l.id_supplier', $id))
            ->when($filters['id_gudang'] ?? null, fn ($q, $id) => $q->where('l.id_gudang', $id))
            ->when($filters['id_barang'] ?? null, fn ($q, $id) => $q->where('l.item_type', 'BIBIT')->where('l.item_id', $id))
            ->when($filters['id_botol'] ?? null, fn ($q, $id) => $q->where('l.id_botol', $id))
            ->when($filters['barcode'] ?? null, fn ($q, $code) => $q->where('l.kode_barang', $code));
        if (($filters['jenis_barang'] ?? null) === 'BOTOL') $query->where('l.item_type', 'BOTOL');
        elseif (in_array($filters['jenis_barang'] ?? null, ['BIBIT', 'ABSOLUTE'], true)) {
            $query->where('l.item_type', 'BIBIT')->whereIn('l.item_id', BarangBibit::query()->where('jenis_barang', $filters['jenis_barang'])->select('id'));
        }
        if ($mode === 'mutasi-stok') {
            return $query->join('tt_mutasi_stok_supplier as m', 'm.stock_lot_id', '=', 'l.id')
                ->when($filters['tanggal_dari'] ?? null, fn ($q, $date) => $q->whereDate('m.tanggal', '>=', $date))
                ->when($filters['tanggal_sampai'] ?? null, fn ($q, $date) => $q->whereDate('m.tanggal', '<=', $date))
                ->when($filters['tipe_mutasi'] ?? null, fn ($q, $value) => $q->where('m.direction', $value))
                ->select('m.id', 'm.tanggal', 'm.direction', 'm.quantity', 'm.reference', 'm.source', 'm.created_by', 'm.notes', 'l.kode_barang', 'l.nama_barang', 'l.supplier_name', 'l.unit', 'l.id_supplier', 'l.id_gudang', 'g.nama_gudang')->orderByDesc('m.id');
        }
        $keys = ['l.item_type', 'l.item_id', 'l.id_supplier', 'l.id_gudang', 'l.unit'];
        $query->select($keys)->selectRaw('MIN(l.id) as id, MAX(l.kode_barang) as kode_barang, MAX(l.nama_barang) as nama_barang, MAX(l.supplier_name) as supplier_name, MAX(g.nama_gudang) as nama_gudang');
        if ($mode === 'barang-summary') {
            $from = $filters['tanggal_dari'] ?? app(BusinessService::class)->operationalDate()->toDateString();
            $to = $filters['tanggal_sampai'] ?? app(BusinessService::class)->operationalDate()->toDateString();
            $query->join('tt_mutasi_stok_supplier as m', 'm.stock_lot_id', '=', 'l.id')->whereDate('m.tanggal', '<=', $to)
                ->selectRaw("SUM(CASE WHEN m.tanggal < ? THEN CASE WHEN m.direction = 'MASUK' THEN m.quantity ELSE -m.quantity END ELSE 0 END) as opening", [$from])
                ->selectRaw("SUM(CASE WHEN m.tanggal >= ? AND m.direction = 'MASUK' THEN m.quantity ELSE 0 END) as incoming", [$from])
                ->selectRaw("SUM(CASE WHEN m.tanggal >= ? AND m.direction = 'KELUAR' THEN m.quantity ELSE 0 END) as outgoing", [$from])
                ->selectRaw("SUM(CASE WHEN m.direction = 'MASUK' THEN m.quantity ELSE -m.quantity END) as quantity");
        } else {
            $query->selectRaw('SUM(l.qty_remaining) as quantity');
        }
        $query->groupBy($keys)->orderBy('nama_barang')->orderBy('supplier_name')->orderBy('l.id_gudang');
        if (($filters['stok_status'] ?? null) === 'TERSEDIA') $query->havingRaw('SUM(l.qty_remaining) > 0');
        if (($filters['stok_status'] ?? null) === 'HABIS') $query->havingRaw('SUM(l.qty_remaining) = 0');
        return $query;
    }

    public function withBottleEstimates(\Illuminate\Support\Collection $rows, Builder $query): \Illuminate\Support\Collection
    {
        $liquids = $rows->where('unit', 'ML');
        if ($liquids->isEmpty()) return $rows;

        $key = fn ($row) => implode(':', [$row->item_id, $row->id_supplier ?? '', $row->id_gudang]);
        $variants = (clone $query)
            ->where('l.unit', 'ML')
            ->whereIn('l.item_id', $liquids->pluck('item_id')->unique())
            ->whereIn('l.id_gudang', $liquids->pluck('id_gudang')->unique())
            ->leftJoin('tm_botol as estimate_variant', 'estimate_variant.id', '=', 'l.id_botol')
            ->leftJoin('tm_barang_bibit as estimate_item', 'estimate_item.id', '=', 'l.item_id')
            ->leftJoin('tm_botol as estimate_default', 'estimate_default.id', '=', 'estimate_item.id_botol')
            ->addSelect('l.id_botol')->groupBy('l.id_botol')
            ->selectRaw('MAX(COALESCE(estimate_variant.varian_ml, estimate_default.varian_ml, 0)) as capacity_ml')
            ->reorder()->get()->groupBy($key);

        $format = fn (float $value) => rtrim(rtrim(number_format($value, 2, ',', '.'), '0'), ',');
        foreach ($liquids as $row) {
            $parts = [];
            $byCapacity = $variants->get($key($row), collect())->groupBy(fn ($variant) => (string) (float) $variant->capacity_ml);
            foreach ($byCapacity->sortKeys(SORT_NUMERIC) as $capacity => $balances) {
                $quantity = (float) $balances->sum('quantity');
                if (abs($quantity) < 0.00000001 && abs((float) $row->quantity) > 0.00000001) continue;
                // An equivalent at the displayed current capacity, not a historical physical bottle count.
                if ((float) $capacity > 0) {
                    $fullBottles = floor(($quantity + 0.00000001) / (float) $capacity);
                    $remainingMl = round($quantity - $fullBottles * (float) $capacity, 2);
                    $bottleParts = [];
                    if ($fullBottles != 0) $bottleParts[] = $format($fullBottles).' botol penuh ('.$format((float) $capacity).' ML)';
                    if ($remainingMl > 0) $bottleParts[] = '1 botol isi '.$format($remainingMl).' ML';
                    $parts[] = $bottleParts ? implode(' + ', $bottleParts) : '0 botol';
                } else {
                    $parts[] = $format($quantity).' ML (ukuran botol belum ditentukan)';
                }
            }
            $row->bottle_estimate = implode('; ', $parts);
        }

        return $rows;
    }
}
