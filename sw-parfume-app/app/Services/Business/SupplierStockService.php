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
            $supplier = Supplier::query()->where('status', 'AKTIF')->find($meta['id_supplier'] ?? null);
            if (!$supplier) throw ValidationException::withMessages(['id_supplier' => 'Pilih supplier asal stok yang aktif.']);
            $item = $type === 'BOTOL' ? BotolKosong::query()->findOrFail($itemId) : BarangBibit::query()->findOrFail($itemId);
            $id = DB::table('tt_stok_supplier')->insertGetId([
                'item_type' => $type, 'item_id' => $itemId, 'id_gudang' => $warehouse,
                'id_supplier' => $supplier->id, 'id_botol' => $variant ?: null, 'supplier_name' => $supplier->nama_supplier,
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
}
