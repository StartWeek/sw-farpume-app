<?php

namespace App\Services\Business;

use App\Models\Business\BarangBibit;
use App\Models\Business\Botol;
use App\Models\Business\BotolKosong;
use App\Models\Business\Brand;
use App\Models\Business\Customer;
use App\Models\Business\Gudang;
use App\Models\Business\HistoriSaldoBarang;
use App\Models\Business\Hutang;
use App\Models\Business\KasMutasi;
use App\Models\Business\MutasiStok;
use App\Models\Business\Pembelian;
use App\Models\Business\Penjualan;
use App\Models\Business\Piutang;
use App\Models\Business\PiutangSupplier;
use App\Models\Business\Sales;
use App\Models\Business\SaldoBarang;
use App\Models\Business\StokGudang;
use App\Models\Business\Supplier;
use App\Models\Business\TokoClosing;
use App\Models\Business\SystemDate;
use App\Models\Business\TransaksiBotolKosong;
use App\Models\Business\TransaksiBarangBibit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BusinessService
{
    public const MASTERS = [
        'brand' => ['model' => Brand::class, 'code' => 'kode_brand', 'prefix' => 'BRD', 'label' => 'Data Brand'],
        'gudang' => ['model' => Gudang::class, 'code' => 'kode_gudang', 'prefix' => 'GDG', 'label' => 'Data Gudang'],
        'supplier' => ['model' => Supplier::class, 'code' => 'kode_supplier', 'prefix' => 'SUP', 'label' => 'Data Supplier'],
        'customer' => ['model' => Customer::class, 'code' => 'kode_customer', 'prefix' => 'CUS', 'label' => 'Data Customer'],
        'sales' => ['model' => Sales::class, 'code' => 'kode_sales', 'prefix' => 'SLS', 'label' => 'Data Sales'],
        'botol' => ['model' => Botol::class, 'code' => 'kode_botol', 'prefix' => 'BTL', 'label' => 'Master Botol'],
        'botol-kosong' => ['model' => BotolKosong::class, 'code' => 'kode_botol', 'prefix' => 'BTK', 'label' => 'Master Botol Kosong'],
    ];

    public function nextCode(string $modelClass, string $field, string $prefix): string
    {
        $last = $modelClass::query()->where($field, 'like', "{$prefix}-%")->latest('id')->value($field);
        $number = $last ? ((int) substr((string) $last, strlen($prefix) + 1)) + 1 : 1;

        return sprintf('%s-%04d', $prefix, $number);
    }

    public function createMaster(string $key, array $payload): Model
    {
        $config = self::MASTERS[$key];
        $payload[$config['code']] = $this->nextCode($config['model'], $config['code'], $config['prefix']);

        return $config['model']::query()->create($payload);
    }

    public function createBarang(array $payload): BarangBibit
    {
        return DB::transaction(function () use ($payload) {
            $brand = Brand::query()->findOrFail($payload['id_brand']);

            if (BarangBibit::query()->where('id_brand', $brand->id)->where('nama_barang', $payload['nama_barang'])->exists()) {
                throw ValidationException::withMessages(['nama_barang' => 'Nama barang sudah ada.']);
            }

            return BarangBibit::query()->create([
                ...$payload,
                'kode_barang' => $this->nextCode(BarangBibit::class, 'kode_barang', 'BRG'),
                'jenis_barang' => $payload['jenis_barang'] ?? 'BIBIT',
                'satuan_dasar' => 'ML',
            ]);
        });
    }

    public function updateBarang(BarangBibit $barang, array $payload): BarangBibit
    {
        return DB::transaction(function () use ($barang, $payload) {
            $brand = Brand::query()->findOrFail($payload['id_brand']);

            $exists = BarangBibit::query()
                ->whereKeyNot($barang->id)
                ->where('id_brand', $brand->id)
                ->where('nama_barang', $payload['nama_barang'])
                ->exists();

            if ($exists) {
                throw ValidationException::withMessages(['nama_barang' => 'Nama barang sudah ada.']);
            }

            $newBottleId = (int) $payload['id_botol'];
            $currentBottleId = (int) ($barang->id_botol ?? 0);
            $existingStocks = $barang->stok()->where('stok_ml', '>', 0)->get();
            if ($currentBottleId > 0 && $currentBottleId !== $newBottleId && $existingStocks->isNotEmpty()) {
                throw ValidationException::withMessages(['id_botol' => 'Botol stok tidak dapat diganti selama stok barang masih tersedia.']);
            }

            $barang->update([
                ...$payload,
                'jenis_barang' => $payload['jenis_barang'] ?? 'BIBIT',
                'satuan_dasar' => 'ML',
            ]);

            return $barang->refresh();
        });
    }

    public function replaceStock(int $gudangId, int $barangId, float $qtyMl, array $meta, bool $skipBottleCheck = false, ?int $idBotol = 0): StokGudang
    {
        $barang = BarangBibit::query()->with('botol')->findOrFail($barangId);
        if (! $skipBottleCheck && ! $idBotol && $barang->jenis_barang !== 'ABSOLUTE' && ! $barang->botol) {
            throw ValidationException::withMessages(['items' => "Botol stok untuk {$barang->nama_barang} belum dipilih — pilih varian botol atau atur botol default di master barang."]);
        }
        $stock = StokGudang::query()->firstOrCreate(
            ['id_gudang' => $gudangId, 'id_barang' => $barangId, 'id_botol' => $idBotol ?: null],
            ['stok_ml' => 0, 'stok_reserved_ml' => 0, 'minimum_stok_ml' => $barang->minimum_stok_ml]
        );

        $before = (float) $stock->stok_ml;
        $after = $before + $qtyMl;

        if ($after < 0) {
            throw ValidationException::withMessages(['items' => 'Stok barang tidak mencukupi.']);
        }

        $stock->update([
            'stok_ml' => $after,
            'minimum_stok_ml' => $barang->minimum_stok_ml,
            'last_update' => now(),
        ]);

        $operationalDate = $this->operationalDate()->toDateString();

        MutasiStok::query()->create([
            'tanggal' => $operationalDate,
            'tipe_mutasi' => $qtyMl < 0 ? 'KELUAR' : 'MASUK',
            'sumber_transaksi' => $meta['sumber_transaksi'] ?? 'ADJUSTMENT',
            'no_transaksi' => $meta['no_transaksi'] ?? 'MANUAL',
            'id_gudang' => $gudangId,
            'id_barang' => $barangId,
            'id_botol' => $idBotol,
            'qty_ml' => abs($qtyMl),
            'stok_sebelum_ml' => $before,
            'stok_sesudah_ml' => $after,
            'keterangan' => $meta['keterangan'] ?? null,
            'created_by' => $meta['created_by'] ?? null,
        ]);

        TransaksiBarangBibit::query()->create([
            'tanggal' => $operationalDate,
            'id_gudang' => $gudangId,
            'id_barang' => $barangId,
            'id_botol' => $idBotol ?: null,
            'tipe_mutasi' => $qtyMl < 0 ? 'KELUAR' : 'MASUK',
            'qty_ml' => abs($qtyMl),
            'stok_awal_ml' => $before,
            'stok_akhir_ml' => $after,
            'sumber_transaksi' => $meta['sumber_transaksi'] ?? 'ADJUSTMENT',
            'no_transaksi' => $meta['no_transaksi'] ?? 'MANUAL',
            'keterangan' => $meta['keterangan'] ?? null,
            'created_by' => $meta['created_by'] ?? null,
        ]);

        $this->recordActiveStockBalance(
            $operationalDate,
            $gudangId,
            $barangId,
            $idBotol ?? 0,
            $before,
            $after,
            $qtyMl,
            (float) $barang->minimum_stok_ml,
        );

        return $stock->refresh();
    }

    private function recordActiveStockBalance(
        string $date,
        int $gudangId,
        int $barangId,
        int $botolId,
        float $before,
        float $after,
        float $quantity,
        float $minimumStock,
    ): void {
        $balance = SaldoBarang::query()
            ->where('id_gudang', $gudangId)
            ->where('id_barang', $barangId)
            ->where('id_botol', $botolId)
            ->lockForUpdate()
            ->first();

        if (! $balance) {
            $balance = SaldoBarang::query()->create([
                'tanggal' => $date,
                'id_gudang' => $gudangId,
                'id_barang' => $barangId,
                'id_botol' => $botolId,
                'stok_awal_ml' => $before,
                'stok_akhir_ml' => $before,
                'minimum_stok_ml' => $minimumStock,
            ]);
        } elseif (! $balance->tanggal->isSameDay($date)) {
            $balance->update([
                'tanggal' => $date,
                'stok_awal_ml' => $before,
                'masuk_ml' => 0,
                'keluar_ml' => 0,
                'stok_akhir_ml' => $before,
                'minimum_stok_ml' => $minimumStock,
                'total_mutasi' => 0,
                'terakhir_mutasi' => null,
            ]);
        }

        $balance->update([
            'masuk_ml' => (float) $balance->masuk_ml + max($quantity, 0),
            'keluar_ml' => (float) $balance->keluar_ml + abs(min($quantity, 0)),
            'stok_akhir_ml' => $after,
            'minimum_stok_ml' => $minimumStock,
            'total_mutasi' => $balance->total_mutasi + 1,
            'terakhir_mutasi' => $date,
        ]);
    }

    public function createStockMutation(array $payload): StokGudang
    {
        $multiplier = ($payload['tipe_mutasi'] ?? 'MASUK') === 'KELUAR' ? -1 : 1;

        $qtyMl = (float) ($payload['qty_ml'] ?? 0);
        $idBotol = isset($payload['id_botol']) ? (int) $payload['id_botol'] : null;

        if ($multiplier === 1 && isset($payload['jumlah_botol'])) {
            $barang = BarangBibit::query()->with('botol')->findOrFail($payload['id_barang']);
            if ($barang->jenis_barang === 'ABSOLUTE') {
                $qtyMl = (float) $payload['jumlah_botol'];
            } else {
                // Gunakan varian_ml dari botol yang dipilih, fallback ke default barang
                $varianMl = $idBotol
                    ? (float) (Botol::query()->find($idBotol)?->varian_ml ?? 0)
                    : (float) ($barang->botol->varian_ml ?? 0);

                if ($varianMl <= 0) {
                    throw ValidationException::withMessages(['id_botol' => 'Pilih varian botol terlebih dahulu.']);
                }
                $qtyMl = (float) $payload['jumlah_botol'] * $varianMl;
            }
        }

        return DB::transaction(fn () => $this->replaceStock(
            (int) $payload['id_gudang'],
            (int) $payload['id_barang'],
            $qtyMl * $multiplier,
            [
                'sumber_transaksi' => 'ADJUSTMENT',
                'no_transaksi' => $payload['no_transaksi'] ?? 'MANUAL',
                'keterangan' => $payload['keterangan'] ?? 'Input manual inventory',
                'created_by' => $payload['created_by'] ?? auth()->user()?->name,
            ],
            skipBottleCheck: true,
            idBotol: $idBotol,
        ));
    }

    public function adjustBotolKosongStock(array $payload): void
    {
        $multiplier = ($payload['tipe_mutasi'] ?? 'MASUK') === 'KELUAR' ? -1 : 1;
        $qty = (int) $payload['jumlah_botol'] * $multiplier;

        $botol = BotolKosong::query()->findOrFail((int) $payload['id_barang']);

        $after = (float) $botol->stock + $qty;

        if ($after < 0) {
            throw ValidationException::withMessages(['jumlah_botol' => 'Stok botol kosong tidak mencukupi.']);
        }

        $botol->update(['stock' => $after]);
    }

    public function backfillBotolKosongTransactions(): int
    {
        $purchases = DB::table('tt_pembelian_detail as detail')
            ->join('tt_pembelian as header', 'header.id', '=', 'detail.id_pembelian')
            ->where('detail.tipe_item', 'BOTOL')
            ->whereNotNull('detail.item_id')
            ->selectRaw("header.tanggal, header.id_gudang, detail.item_id as id_botol_kosong, 'PEMBELIAN' as sumber_transaksi, header.no_pembelian as no_transaksi, SUM(detail.konversi_qty_dasar) as qty_botol")
            ->groupBy('header.tanggal', 'header.id_gudang', 'detail.item_id', 'header.no_pembelian')
            ->get();
        $sales = DB::table('tt_penjualan_detail as detail')
            ->join('tt_penjualan as header', 'header.id', '=', 'detail.id_penjualan')
            ->where('detail.tipe_item', 'BOTOL')
            ->whereNotNull('detail.item_id')
            ->selectRaw("header.tanggal, header.id_gudang, detail.item_id as id_botol_kosong, 'PENJUALAN' as sumber_transaksi, header.no_penjualan as no_transaksi, SUM(detail.konversi_qty_dasar) as qty_botol")
            ->groupBy('header.tanggal', 'header.id_gudang', 'detail.item_id', 'header.no_penjualan')
            ->get();

        $inserted = 0;
        $purchases->concat($sales)
            ->sortBy(fn (object $row) => $row->tanggal.'-'.$row->no_transaksi)
            ->groupBy('id_botol_kosong')
            ->each(function ($movements) use (&$inserted): void {
                $botol = BotolKosong::query()->find($movements->first()->id_botol_kosong);
                if (! $botol) {
                    return;
                }

                $netMovement = $movements->sum(fn (object $row) => $row->sumber_transaksi === 'PEMBELIAN'
                    ? (float) $row->qty_botol
                    : -(float) $row->qty_botol);
                $balance = (float) $botol->stock - $netMovement;

                foreach ($movements as $movement) {
                    $quantity = (float) $movement->qty_botol;
                    $direction = $movement->sumber_transaksi === 'PEMBELIAN' ? 1 : -1;
                    $after = $balance + ($direction * $quantity);
                    $exists = TransaksiBotolKosong::query()
                        ->where('id_botol_kosong', $movement->id_botol_kosong)
                        ->where('sumber_transaksi', $movement->sumber_transaksi)
                        ->where('no_transaksi', $movement->no_transaksi)
                        ->exists();

                    if (! $exists) {
                        TransaksiBotolKosong::query()->create([
                            'tanggal' => $movement->tanggal,
                            'id_gudang' => $movement->id_gudang,
                            'id_botol_kosong' => $movement->id_botol_kosong,
                            'tipe_mutasi' => $direction > 0 ? 'MASUK' : 'KELUAR',
                            'qty_botol' => $quantity,
                            'stok_awal' => $balance,
                            'stok_akhir' => $after,
                            'sumber_transaksi' => $movement->sumber_transaksi,
                            'no_transaksi' => $movement->no_transaksi,
                            'keterangan' => $direction > 0 ? 'Backfill pembelian supplier' : 'Backfill penjualan botol kosong',
                            'created_by' => 'SYSTEM BACKFILL',
                        ]);
                        $inserted++;
                    }

                    $balance = $after;
                }
            });

        return $inserted;
    }

    private function filledBottleCount(float $stockMl, float $capacityMl): int
    {
        return $stockMl > 0 && $capacityMl > 0 ? (int) ceil($stockMl / $capacityMl) : 0;
    }

    private function purchaseDetail(array $item): array
    {
        $type = $this->normalizeItemType($item['tipe_item'] ?? 'BIBIT');
        $unit = strtoupper($item['satuan_input'] ?? 'ML');
        $qtyInput = (float) $item['qty_input'];
        $discount = (float) ($item['discount'] ?? 0);

        if ($type === 'BOTOL') {
            $this->ensureUnit($unit, ['BOTOL', 'DUS'], 'botol');
            $botol = BotolKosong::query()->findOrFail($item['item_id'] ?? $item['id_botol'] ?? null);
            $barang = isset($item['id_barang']) ? BarangBibit::query()->find($item['id_barang']) : null;

            $qtyBotol = $unit === 'DUS' ? $this->dusToBotol($qtyInput, 1) : $qtyInput;

            $barangBeliPerBotol = (float) ($barang?->harga_beli_per_botol ?? 0);
            $defaultPrice = $barangBeliPerBotol > 0 ? $barangBeliPerBotol : (float) $botol->harga_beli;
            $price = (float) ($item['harga'] ?? $item['harga_beli_per_botol'] ?? $defaultPrice);

            $subtotal = $unit === 'DUS' ? $qtyInput * $price : $qtyBotol * $price;
            $subtotalAfterDiscount = $subtotal - $discount;

            return [
                'tipe_item' => 'BOTOL',
                'item_id' => $botol->id,
                'nama_item' => $barang?->nama_barang ?? $botol->nama_botol,
                'id_barang' => $barang?->id ?? null,
                'qty_input' => $qtyInput,
                'satuan_input' => $unit,
                'qty_ml' => 0,
                'konversi_qty_dasar' => $qtyBotol,
                'satuan_dasar' => 'BOTOL',
                'harga' => $price,
                'harga_beli_per_ml' => 0,
                'subtotal' => $subtotalAfterDiscount,
                'discount' => $discount,
            ];
        }

        // Pembelian BIBIT/ABSOLUTE
        $this->ensureUnit($unit, ['ML', 'LITER', 'BOTOL'], 'cairan');
        $barang = BarangBibit::query()
            ->with('botol')
            ->findOrFail($item['item_id'] ?? $item['id_barang'] ?? null);

        // Botol varian: prioritaskan id_botol dari user (pilih varian botol saat pembelian),
        // fallback ke botol yang terikat di master barang.
        $botolVarian = null;
        if ($unit === 'BOTOL') {
            $idBotol = $item['id_botol'] ?? null;
            if ($idBotol) {
                $botolVarian = Botol::query()->find($idBotol);
            }
            if (! $botolVarian && ! $barang->botol) {
                throw ValidationException::withMessages([
                    'items' => "Botol stok untuk {$barang->nama_barang} belum dipilih.",
                ]);
            }
        }
        $varianMl = $botolVarian
            ? (float) $botolVarian->varian_ml
            : (float) ($barang->botol->varian_ml ?? 0);

        $qtyMl = $unit === 'BOTOL'
            ? $qtyInput * $varianMl
            : $this->convertToMl($qtyInput, $unit);
        $price = (float) ($item['harga'] ?? $item['harga_beli_per_ml'] ?? $barang->harga_beli_per_ml);
        $subtotal = $qtyMl * $price;
        $subtotalAfterDiscount = $subtotal - $discount;

        return [
            'tipe_item' => $barang->jenis_barang === 'ABSOLUTE' ? 'ABSOLUTE' : 'BIBIT',
            'item_id' => $barang->id,
            'nama_item' => $barang->nama_barang,
            'id_barang' => $barang->id,
            'id_botol' => $botolVarian?->id ?? $barang->botol?->id,
            'qty_input' => $qtyInput,
            'satuan_input' => $unit,
            'qty_ml' => $qtyMl,
            'konversi_qty_dasar' => $qtyMl,
            'satuan_dasar' => 'ML',
            'harga' => $price,
            'harga_beli_per_ml' => $price,
            'subtotal' => $subtotalAfterDiscount,
            'discount' => $discount,
        ];
    }

    private function salesDetail(array $item, string $salesType): array
    {
        $type = $this->normalizeItemType($item['tipe_item'] ?? 'BIBIT');
        $unit = strtoupper($item['satuan_input'] ?? 'ML');
        $qtyInput = (float) ($item['qty_input'] ?? $item['qty_ml'] ?? 0);
        $discount = (float) ($item['discount'] ?? 0);

        if ($type === 'BOTOL') {
            $this->ensureUnit($unit, ['BOTOL', 'DUS'], 'botol');
            $botol = BotolKosong::query()->findOrFail($item['item_id'] ?? $item['id_botol'] ?? null);
            $barang = isset($item['id_barang']) ? BarangBibit::query()->find($item['id_barang']) : null;

            $qtyBotol = $unit === 'DUS' ? $this->dusToBotol($qtyInput, 1) : $qtyInput;

            $barangJualPerBotol = (float) ($barang?->harga_jual_per_botol ?? 0);
            $defaultPrice = $barangJualPerBotol > 0 ? $barangJualPerBotol : (float) $botol->harga_jual;
            $price = (float) ($item['harga'] ?? $defaultPrice);

            $barangBeliPerBotol = (float) ($barang?->harga_beli_per_botol ?? 0);
            $beliPerBotol = $barangBeliPerBotol > 0 ? $barangBeliPerBotol : (float) $botol->harga_beli;
            $modal = $qtyBotol * $beliPerBotol;

            $jual = $unit === 'DUS' ? $qtyInput * $price : $qtyBotol * $price;
            $jualAfterDiscount = $jual - $discount;

            return [
                'tipe_item' => 'BOTOL',
                'item_id' => $botol->id,
                'nama_item' => $barang?->nama_barang ?? $botol->nama_botol,
                'id_barang' => $barang?->id ?? null,
                'qty_input' => $qtyInput,
                'satuan_input' => $unit,
                'qty_ml' => 0,
                'konversi_qty_dasar' => $qtyBotol,
                'satuan_dasar' => 'BOTOL',
                'harga' => $price,
                'harga_beli_per_ml' => 0,
                'harga_jual_per_ml' => 0,
                'subtotal_modal' => $modal,
                'subtotal_jual' => $jualAfterDiscount,
                'laba_kotor' => $jualAfterDiscount - $modal,
                'discount' => $discount,
            ];
        }

        $this->ensureUnit($unit, ['ML', 'LITER'], 'cairan');
        $barang = BarangBibit::query()->findOrFail($item['item_id'] ?? $item['id_barang'] ?? null);
        $qtyMl = $this->convertToMl($qtyInput, $unit);
        $salesPrice = (float) $barang->harga_jual_grosir_per_ml;
        $defaultPrice = $salesType === 'RETAIL' || $salesPrice <= 0
            ? (float) $barang->harga_jual_retail_per_ml
            : $salesPrice;
        $price = (float) ($item['harga'] ?? $defaultPrice);
        $modal = $qtyMl * (float) $barang->harga_beli_per_ml;
        $jual = $qtyMl * $price;
        $jualAfterDiscount = $jual - $discount;

        return [
            'tipe_item' => $barang->jenis_barang === 'ABSOLUTE' ? 'ABSOLUTE' : 'BIBIT',
            'item_id' => $barang->id,
            'nama_item' => $barang->nama_barang,
            'id_barang' => $barang->id,
            'qty_input' => $qtyInput,
            'satuan_input' => $unit,
            'qty_ml' => $qtyMl,
            'konversi_qty_dasar' => $qtyMl,
            'satuan_dasar' => 'ML',
            'harga' => $price,
            'harga_beli_per_ml' => $barang->harga_beli_per_ml,
            'harga_jual_per_ml' => $price,
            'subtotal_modal' => $modal,
            'subtotal_jual' => $jualAfterDiscount,
            'laba_kotor' => $jualAfterDiscount - $modal,
            'discount' => $discount,
        ];
    }

    private function applyStockMovement(int $gudangId, array $detail, int $direction, string $number, string $source, array $payload): void
    {
        if ($detail['satuan_dasar'] === 'ML') {
            $idBotol = isset($detail['id_botol']) ? (int) $detail['id_botol'] : null;

            // Penjualan (KELUAR) tanpa varian spesifik: cari stok dari baris varian manapun (FIFO)
            if ($direction === -1 && $idBotol === null) {
                $stokTersedia = StokGudang::query()
                    ->where('id_gudang', $gudangId)
                    ->where('id_barang', (int) $detail['id_barang'])
                    ->where('stok_ml', '>', 0)
                    ->orderBy('id')
                    ->get();

                if ($stokTersedia->isEmpty()) {
                    throw ValidationException::withMessages(['items' => 'Stok barang tidak mencukupi.']);
                }

                $sisaDikurangi = abs($direction * (float) $detail['konversi_qty_dasar']);
                foreach ($stokTersedia as $stock) {
                    $kurangi = min($sisaDikurangi, (float) $stock->stok_ml);
                    $this->replaceStock(
                        $gudangId,
                        (int) $detail['id_barang'],
                        -$kurangi,
                        [
                            'sumber_transaksi' => $source,
                            'no_transaksi' => $number,
                            'keterangan' => $source === 'PEMBELIAN' ? 'Pembelian supplier' : 'POS penjualan',
                            'created_by' => $payload['created_by'] ?? auth()->user()?->name,
                        ],
                        idBotol: (int) $stock->id_botol,
                    );
                    $sisaDikurangi -= $kurangi;
                    if ($sisaDikurangi <= 0) {
                        break;
                    }
                }

                if ($sisaDikurangi > 0) {
                    throw ValidationException::withMessages(['items' => 'Stok barang tidak mencukupi.']);
                }

                return;
            }

            $this->replaceStock(
                $gudangId,
                (int) $detail['id_barang'],
                $direction * (float) $detail['konversi_qty_dasar'],
                [
                    'sumber_transaksi' => $source,
                    'no_transaksi' => $number,
                    'keterangan' => $source === 'PEMBELIAN' ? 'Pembelian supplier' : 'POS penjualan',
                    'created_by' => $payload['created_by'] ?? auth()->user()?->name,
                ],
                idBotol: $idBotol,
            );

            return;
        }

        $botol = BotolKosong::query()->findOrFail($detail['item_id']);
        if ((int) ($botol->id_gudang ?? 0) !== $gudangId) {
            throw ValidationException::withMessages(['items' => "Stok {$botol->nama_botol} tidak tersedia di gudang yang dipilih."]);
        }

        $after = (float) $botol->stock + ($direction * (float) $detail['konversi_qty_dasar']);

        if ($after < 0) {
            throw ValidationException::withMessages(['items' => "Stok {$botol->nama_botol} tidak mencukupi."]);
        }

        $before = (float) $botol->stock;
        $quantity = (float) $detail['konversi_qty_dasar'];

        $botol->update(['stock' => $after]);
        TransaksiBotolKosong::query()->create([
            'tanggal' => $this->operationalDate()->toDateString(),
            'id_gudang' => $gudangId,
            'id_botol_kosong' => $botol->id,
            'tipe_mutasi' => $direction > 0 ? 'MASUK' : 'KELUAR',
            'qty_botol' => $quantity,
            'stok_awal' => $before,
            'stok_akhir' => $after,
            'sumber_transaksi' => $source,
            'no_transaksi' => $number,
            'keterangan' => $source === 'PEMBELIAN' ? 'Pembelian supplier' : 'Penjualan botol kosong',
            'created_by' => $payload['created_by'] ?? auth()->user()?->name,
        ]);
    }

    private function ensureUnit(string $unit, array $allowed, string $label): void
    {
        if (! in_array($unit, $allowed, true)) {
            throw ValidationException::withMessages(['items' => "Satuan {$unit} tidak valid untuk {$label}."]);
        }
    }

    private function paymentAmounts(string $method, float $total, float $paidInput): array
    {
        $paid = match ($method) {
            'TEMPO' => 0.0,
            'DP' => min($total, max(0, $paidInput)),
            default => $total,
        };
        $remaining = max(0, $total - $paid);

        return [
            'paid' => $paid,
            'remaining' => $remaining,
            'stored_method' => $method === 'DP' ? 'TEMPO' : $method,
            'status' => $remaining <= 0 ? 'LUNAS' : ($paid > 0 ? 'SEBAGIAN' : 'BELUM_LUNAS'),
        ];
    }

    private function recordCash(string $date, string $number, string $direction, string $source, ?string $party, float $amount, ?string $note, ?string $user): KasMutasi
    {
        $lastSaldo = (float) (KasMutasi::query()->latest('id')->value('saldo_akhir') ?? 0);
        $cashIn = $direction === 'MASUK' ? $amount : 0;
        $cashOut = $direction === 'KELUAR' ? $amount : 0;

        return KasMutasi::query()->create([
            'tanggal' => $date,
            'no_transaksi' => $number,
            'jenis_transaksi' => $direction,
            'sumber_transaksi' => $source,
            'pihak' => $party,
            'kas_masuk' => $cashIn,
            'kas_keluar' => $cashOut,
            'saldo_akhir' => $lastSaldo + $cashIn - $cashOut,
            'keterangan' => $note,
            'created_by' => $user,
        ]);
    }

    public function createManualCash(array $payload): KasMutasi
    {
        $lastId = KasMutasi::query()->latest('id')->value('id') ?? 0;
        $number = sprintf('KAS-%s-%04d', now()->format('Ymd'), $lastId + 1);

        return $this->recordCash(
            $this->operationalDate()->toDateString(),
            $number,
            $payload['jenis_transaksi'],
            'MANUAL',
            $payload['pihak'] ?? null,
            (float) $payload['jumlah'],
            $payload['keterangan'] ?? null,
            $payload['created_by'] ?? auth()->user()?->name
        );
    }

    public function createPembelian(array $payload): Pembelian
    {
        if (in_array($payload['metode_pembayaran'], ['TEMPO', 'DP'], true) && empty($payload['jatuh_tempo'])) {
            throw ValidationException::withMessages(['jatuh_tempo' => 'Jatuh tempo wajib untuk pembelian tempo.']);
        }

        return DB::transaction(function () use ($payload) {
            $details = [];
            $totalQtyMl = 0;
            $totalQtyBotol = 0;
            $total = 0;

            foreach ($payload['items'] as $item) {
                $detail = $this->purchaseDetail($item);
                $totalQtyMl += $detail['satuan_dasar'] === 'ML' ? (float) $detail['konversi_qty_dasar'] : 0;
                $totalQtyBotol += $detail['satuan_dasar'] === 'BOTOL' ? (float) $detail['konversi_qty_dasar'] : 0;
                $total += (float) $detail['subtotal'];
                $details[] = $detail;
            }

            $headerDiscount = (float) ($payload['discount'] ?? 0);
            $totalAfterDiscount = max(0, $total - $headerDiscount);
            $payment = $this->paymentAmounts($payload['metode_pembayaran'], $totalAfterDiscount, (float) ($payload['jumlah_bayar'] ?? 0));
            $number = $this->nextCode(Pembelian::class, 'no_pembelian', 'PBL');
            $pembelian = Pembelian::query()->create([
                'no_pembelian' => $number,
                'tanggal' => $this->operationalDate()->toDateString(),
                'id_supplier' => $payload['id_supplier'],
                'id_gudang' => $payload['id_gudang'],
                'total_qty_ml' => $totalQtyMl,
                'total_qty_botol' => $totalQtyBotol,
                'total_pembelian' => $totalAfterDiscount,
                'jumlah_bayar' => $payment['paid'],
                'discount' => $headerDiscount,
                'metode_pembayaran' => $payment['stored_method'],
                'status_pembayaran' => $payment['status'],
                'jatuh_tempo' => $payload['jatuh_tempo'] ?? null,
                'keterangan' => $payload['keterangan'] ?? null,
                'created_by' => $payload['created_by'] ?? auth()->user()?->name,
            ]);

            foreach ($details as $detail) {
                $pembelian->details()->create($detail);
            }

            foreach (collect($details)->sortBy(fn (array $detail) => $detail['satuan_dasar'] === 'BOTOL' ? 0 : 1) as $detail) {
                $this->applyStockMovement((int) $payload['id_gudang'], $detail, 1, $number, 'PEMBELIAN', $payload);
            }

            $supplierName = Supplier::query()->whereKey($payload['id_supplier'])->value('nama_supplier');
            if ($payment['paid'] > 0) {
                $this->recordCash($pembelian->tanggal->toDateString(), $number, 'KELUAR', 'Pembelian supplier', $supplierName, $payment['paid'], $payload['keterangan'] ?? null, $payload['created_by'] ?? auth()->user()?->name);
            }

            if ($payment['remaining'] > 0) {
                Hutang::query()->create([
                    'no_hutang' => $this->nextCode(Hutang::class, 'no_hutang', 'HTG'),
                    'tanggal' => $pembelian->tanggal,
                    'id_supplier' => $payload['id_supplier'],
                    'id_pembelian' => $pembelian->id,
                    'total_hutang' => $totalAfterDiscount,
                    'total_bayar' => $payment['paid'],
                    'sisa_hutang' => $payment['remaining'],
                    'status_hutang' => $this->debtStatus($payment['remaining'], $payment['paid']),
                    'jatuh_tempo' => $payload['jatuh_tempo'],
                ]);
            }

            return $pembelian->load(['supplier', 'gudang', 'details.barang', 'details.botol', 'details.botolVariant', 'hutang']);
        });
    }

    public function createPenjualan(array $payload): Penjualan
    {
        if (in_array($payload['metode_pembayaran'], ['TEMPO', 'DP'], true) && empty($payload['jatuh_tempo'])) {
            throw ValidationException::withMessages(['jatuh_tempo' => 'Jatuh tempo wajib untuk penjualan tempo.']);
        }

        return DB::transaction(function () use ($payload) {
            $customerId = $payload['id_customer'] ?? null;
            $customerName = $customerId ? Customer::query()->findOrFail($customerId)->nama_customer : ($payload['manual_customer_name'] ?? 'Customer Manual');
            $type = $this->normalizeSalesType($payload['tipe_penjualan'] ?? 'RETAIL');
            $details = [];
            $totalQtyMl = 0;
            $totalQtyBotol = 0;
            $totalModal = 0;
            $totalJual = 0;

            foreach ($payload['items'] as $item) {
                $detail = $this->salesDetail($item, $type);
                $totalQtyMl += $detail['satuan_dasar'] === 'ML' ? (float) $detail['konversi_qty_dasar'] : 0;
                $totalQtyBotol += $detail['satuan_dasar'] === 'BOTOL' ? (float) $detail['konversi_qty_dasar'] : 0;
                $totalModal += (float) $detail['subtotal_modal'];
                $totalJual += (float) $detail['subtotal_jual'];
                $details[] = $detail;
            }

            $headerDiscount = (float) ($payload['discount'] ?? 0);
            $totalAfterDiscount = max(0, $totalJual - $headerDiscount);
            $payment = $this->paymentAmounts($payload['metode_pembayaran'], $totalAfterDiscount, (float) ($payload['jumlah_bayar'] ?? 0));
            $number = $this->nextCode(Penjualan::class, 'no_penjualan', 'PJL');
            $penjualan = Penjualan::query()->create([
                'no_penjualan' => $number,
                'tanggal' => $this->operationalDate()->toDateString(),
                'id_customer' => $customerId,
                'manual_customer_name' => $payload['manual_customer_name'] ?? null,
                'tipe_penjualan' => $type,
                'id_sales' => $payload['id_sales'] ?? null,
                'id_gudang' => $payload['id_gudang'],
                'total_qty_ml' => $totalQtyMl,
                'total_qty_botol' => $totalQtyBotol,
                'total_penjualan' => $totalAfterDiscount,
                'jumlah_bayar' => $payment['paid'],
                'discount' => $headerDiscount,
                'total_modal' => $totalModal,
                'laba_kotor' => $totalAfterDiscount - $totalModal,
                'metode_pembayaran' => $payment['stored_method'],
                'status_pembayaran' => $payment['status'],
                'jatuh_tempo' => $payload['jatuh_tempo'] ?? null,
                'keterangan' => $payload['keterangan'] ?? null,
                'created_by' => $payload['created_by'] ?? auth()->user()?->name,
            ]);

            foreach ($details as $detail) {
                $this->applyStockMovement((int) $payload['id_gudang'], $detail, -1, $number, 'PENJUALAN', $payload);
                $penjualan->details()->create($detail);
            }

            if ($payment['paid'] > 0) {
                $this->recordCash($penjualan->tanggal->toDateString(), $number, 'MASUK', $type === 'RETAIL' ? 'Penjualan retail' : 'Penjualan sales', $customerName, $payment['paid'], $payload['keterangan'] ?? null, $payload['created_by'] ?? auth()->user()?->name);
            }

            if ($payment['remaining'] > 0 && $customerId) {
                Piutang::query()->create([
                    'no_piutang' => $this->nextCode(Piutang::class, 'no_piutang', 'PTG'),
                    'tanggal' => $penjualan->tanggal,
                    'id_customer' => $customerId,
                    'id_penjualan' => $penjualan->id,
                    'total_piutang' => $totalAfterDiscount,
                    'total_bayar' => $payment['paid'],
                    'sisa_piutang' => $payment['remaining'],
                    'status_piutang' => $this->debtStatus($payment['remaining'], $payment['paid']),
                    'jatuh_tempo' => $payload['jatuh_tempo'],
                ]);
            }

            return $penjualan->load(['customer', 'sales', 'gudang', 'details.barang', 'details.botol', 'piutang']);
        });
    }

    public function payHutang(Hutang $hutang, float $amount): Hutang
    {
        $paid = (float) $hutang->total_bayar + $amount;
        $remaining = max(0, (float) $hutang->total_hutang - $paid);
        $hutang->update(['total_bayar' => $paid, 'sisa_hutang' => $remaining, 'status_hutang' => $this->debtStatus($remaining, $paid)]);
        $hutang->loadMissing(['pembelian', 'supplier']);

        if ($hutang->pembelian) {
            $hutang->pembelian->update([
                'status_pembayaran' => $remaining <= 0 ? 'LUNAS' : 'BELUM_LUNAS',
            ]);
        }

        $this->recordCash($this->operationalDate()->toDateString(), $hutang->no_hutang, 'KELUAR', 'Pelunasan hutang supplier', $hutang->supplier?->nama_supplier, $amount, $hutang->keterangan, auth()->user()?->name);

        return $hutang->refresh();
    }

    public function createHutangSupplier(array $payload): Hutang
    {
        return Hutang::query()->create([
            'no_hutang' => $this->nextCode(Hutang::class, 'no_hutang', 'HTG'),
            'tanggal' => $this->operationalDate()->toDateString(),
            'id_supplier' => $payload['id_supplier'],
            'id_pembelian' => null,
            'total_hutang' => $payload['total_hutang'],
            'total_bayar' => 0,
            'sisa_hutang' => $payload['total_hutang'],
            'status_hutang' => 'OPEN',
            'jatuh_tempo' => $payload['jatuh_tempo'] ?? null,
            'keterangan' => $payload['keterangan'] ?? null,
            'created_by' => $payload['created_by'] ?? auth()->user()?->name,
        ])->load('supplier');
    }

    public function payPiutang(Piutang $piutang, float $amount): Piutang
    {
        $paid = (float) $piutang->total_bayar + $amount;
        $remaining = max(0, (float) $piutang->total_piutang - $paid);
        $piutang->update(['total_bayar' => $paid, 'sisa_piutang' => $remaining, 'status_piutang' => $this->debtStatus($remaining, $paid)]);
        $piutang->loadMissing(['penjualan', 'customer']);

        if ($piutang->penjualan) {
            $piutang->penjualan->update([
                'status_pembayaran' => $remaining <= 0 ? 'LUNAS' : 'BELUM_LUNAS',
            ]);
        }

        $this->recordCash($this->operationalDate()->toDateString(), $piutang->no_piutang, 'MASUK', 'Pelunasan piutang customer/sales', $piutang->customer?->nama_customer, $amount, null, auth()->user()?->name);

        return $piutang->refresh();
    }

    public function createPiutangSupplier(array $payload): PiutangSupplier
    {
        return PiutangSupplier::query()->create([
            'no_piutang_supplier' => $this->nextCode(PiutangSupplier::class, 'no_piutang_supplier', 'PTS'),
            'tanggal' => $this->operationalDate()->toDateString(),
            'id_supplier' => $payload['id_supplier'],
            'total_piutang' => $payload['total_piutang'],
            'total_bayar' => 0,
            'sisa_piutang' => $payload['total_piutang'],
            'status_piutang' => 'OPEN',
            'jatuh_tempo' => $payload['jatuh_tempo'] ?? null,
            'keterangan' => $payload['keterangan'] ?? null,
            'created_by' => $payload['created_by'] ?? auth()->user()?->name,
        ])->load('supplier');
    }

    public function payPiutangSupplier(PiutangSupplier $piutang, float $amount): PiutangSupplier
    {
        $paid = (float) $piutang->total_bayar + $amount;
        $remaining = max(0, (float) $piutang->total_piutang - $paid);
        $piutang->update(['total_bayar' => $paid, 'sisa_piutang' => $remaining, 'status_piutang' => $this->debtStatus($remaining, $paid)]);

        return $piutang->refresh();
    }

    public function dashboard(): array
    {
        $today = $this->operationalDate();
        $month = $today->format('Y-m');
        $salesToday = Penjualan::query()->whereDate('tanggal', $today)->get();
        $buysToday = Pembelian::query()->whereDate('tanggal', $today)->get();
        $stocks = StokGudang::query()->with(['gudang', 'barang.brand', 'barang.botol'])->get();
        $lowStocks = $stocks->filter(fn (StokGudang $stock) => (float) $stock->stok_ml <= (float) $stock->minimum_stok_ml)->values();

        return [
            'omzet_hari_ini' => $salesToday->sum('total_penjualan'),
            'pembelian_hari_ini' => $buysToday->sum('total_pembelian'),
            'total_inventory_ml' => $stocks->sum('stok_ml'),
            'stok_menipis' => $lowStocks,
            'total_piutang' => Piutang::query()->sum('sisa_piutang'),
            'total_hutang' => Hutang::query()->sum('sisa_hutang'),
            'laba_kotor_hari_ini' => $salesToday->sum('laba_kotor'),
            'laba_kotor_bulan_ini' => Penjualan::query()->where('tanggal', 'like', "{$month}%")->sum('laba_kotor'),
            'inventory_per_gudang' => $stocks->groupBy(fn ($stock) => $stock->gudang?->nama_gudang ?? 'Tidak diketahui')->map(fn ($rows, $name) => ['name' => $name, 'stok_ml' => $rows->sum('stok_ml')])->values(),
        ];
    }

    public function operationalDate(): Carbon
    {
        $system = SystemDate::query()->firstOrCreate(
            ['id' => 1],
            ['tanggal_system' => Carbon::today()->toDateString()]
        );

        return Carbon::parse($system->tanggal_system);
    }

    public function closeStore(?string $date = null, ?string $note = null): TokoClosing
    {
        return DB::transaction(function () use ($date, $note): TokoClosing {
            $system = SystemDate::query()->lockForUpdate()->firstOrCreate(
                ['id' => 1],
                ['tanggal_system' => Carbon::today()->toDateString()]
            );
            $businessDate = Carbon::parse($system->tanggal_system);
            $today = Carbon::today();

            if (! $date) {
                $targetDate = $businessDate->copy();
            } else {
                $targetDate = Carbon::parse($date);
            }

            if ($targetDate->gt($today)) {
                throw ValidationException::withMessages(['tanggal_tutup' => 'Tanggal tutup tidak boleh melebihi tanggal hari ini.']);
            }

            if ($targetDate->lt($businessDate)) {
                throw ValidationException::withMessages(['tanggal_tutup' => 'Tanggal tutup harus sama dengan atau setelah tanggal system.']);
            }

            if (TokoClosing::query()->whereDate('tanggal_tutup', $businessDate)->exists()) {
                throw ValidationException::withMessages(['tanggal_tutup' => 'Tanggal operasional ini sudah ditutup.']);
            }

            $lastClosing = null;

            if ($targetDate->isSameDay($businessDate)) {
                // Single day close — current behavior
                $lastClosing = $this->closeSingleDay($businessDate->copy(), $note, $system);
            } else {
                // Batch close: tutup semua hari dari tanggal operasional sampai sebelum targetDate
                $current = $businessDate->copy();
                while ($current->lt($targetDate)) {
                    $lastClosing = $this->closeSingleDay($current->copy(), $note, $system);
                    $current->addDay();
                }
            }

            return $lastClosing;
        });
    }

    private function closeSingleDay(Carbon $businessDate, ?string $note, SystemDate $system): TokoClosing
    {
        $previousClosing = TokoClosing::query()->whereDate('tanggal_tutup', '<', $businessDate)->latest('tanggal_tutup')->first();
        $saldoAwal = (float) ($previousClosing?->saldo_akhir ?? 0);
        $cashIn = (float) KasMutasi::query()->whereDate('tanggal', $businessDate)->sum('kas_masuk');
        $cashOut = (float) KasMutasi::query()->whereDate('tanggal', $businessDate)->sum('kas_keluar');

        $closing = TokoClosing::query()->create([
            'tanggal_tutup' => $businessDate->toDateString(),
            'saldo_awal' => $saldoAwal,
            'saldo_akhir' => $saldoAwal + $cashIn - $cashOut,
            'total_penjualan' => Penjualan::query()->whereDate('tanggal', $businessDate)->sum('total_penjualan'),
            'total_pembelian' => Pembelian::query()->whereDate('tanggal', $businessDate)->sum('total_pembelian'),
            'keterangan' => $note,
            'created_by' => auth()->user()?->name,
        ]);

        $this->synchronizeActiveStockBalances($businessDate);

        SaldoBarang::query()
            ->whereDate('tanggal', $businessDate)
            ->each(function (SaldoBarang $balance): void {
                HistoriSaldoBarang::query()->updateOrCreate(
                    [
                        'tanggal' => $balance->tanggal->toDateString(),
                        'id_gudang' => $balance->id_gudang,
                        'id_barang' => $balance->id_barang,
                        'id_botol' => $balance->id_botol,
                    ],
                    [
                        'stok_awal_ml' => $balance->stok_awal_ml,
                        'masuk_ml' => $balance->masuk_ml,
                        'keluar_ml' => $balance->keluar_ml,
                        'stok_akhir_ml' => $balance->stok_akhir_ml,
                        'minimum_stok_ml' => $balance->minimum_stok_ml,
                        'total_mutasi' => $balance->total_mutasi,
                        'terakhir_mutasi' => $balance->terakhir_mutasi?->toDateString(),
                        'closed_at' => now(),
                    ],
                );
            });

        $nextBusinessDate = $businessDate->copy()->addDay();
        SaldoBarang::query()->delete();
        $this->synchronizeActiveStockBalances($nextBusinessDate);
        $system->update(['tanggal_system' => $nextBusinessDate->toDateString()]);

        return $closing;
    }

    private function synchronizeActiveStockBalances(Carbon $businessDate): void
    {
        StokGudang::query()->each(function (StokGudang $stock) use ($businessDate): void {
            SaldoBarang::query()->firstOrCreate(
                [
                    'id_gudang' => $stock->id_gudang,
                    'id_barang' => $stock->id_barang,
                    'id_botol' => $stock->id_botol ?? 0,
                ],
                [
                    'tanggal' => $businessDate->toDateString(),
                    'stok_awal_ml' => $stock->stok_ml,
                    'stok_akhir_ml' => $stock->stok_ml,
                    'minimum_stok_ml' => $stock->minimum_stok_ml,
                ],
            );
        });
    }

    public function convertToMl(float $qty, string $unit): float
    {
        return $qty * match (strtoupper($unit)) {
            'LITER', 'BOTOL_1L' => 1000,
            'BOTOL_500ML' => 500,
            'JERIGEN_5L' => 5000,
            default => 1,
        };
    }

    public function literToMl(float $liter): float
    {
        return $liter * 1000;
    }

    public function mlToLiterMl(float $totalMl): array
    {
        return [
            'liter' => (int) floor($totalMl / 1000),
            'ml' => (float) fmod($totalMl, 1000),
        ];
    }

    public function dusToBotol(float $qtyDus, int $isiPerDus): float
    {
        if ($isiPerDus <= 0) {
            throw ValidationException::withMessages(['items' => 'Isi per dus wajib lebih dari 0.']);
        }

        return $qtyDus * $isiPerDus;
    }

    public function botolToDusBotol(float $totalBotol, int $isiPerDus): array
    {
        if ($isiPerDus <= 0) {
            return ['dus' => 0, 'botol' => $totalBotol];
        }

        return [
            'dus' => (int) floor($totalBotol / $isiPerDus),
            'botol' => (float) fmod($totalBotol, $isiPerDus),
        ];
    }

    private function paymentStatus(string $method): string
    {
        return $method === 'TEMPO' ? 'BELUM_LUNAS' : 'LUNAS';
    }

    private function debtStatus(float $remaining, float $paid): string
    {
        if ($remaining <= 0) {
            return 'LUNAS';
        }

        return $paid > 0 ? 'SEBAGIAN' : 'BELUM_LUNAS';
    }

    private function normalizeSalesType(string $type): string
    {
        if ($type === 'BOTOL_KOSONG') {
            return 'BOTOL_KOSONG';
        }

        return in_array($type, ['GROSIR', 'SALES', 'TOKO'], true) ? 'GROSIR' : 'RETAIL';
    }

    private function normalizeItemType(string $type): string
    {
        return match (strtoupper($type)) {
            'BOTOL' => 'BOTOL',
            'ABSOLUTE' => 'ABSOLUTE',
            default => 'BIBIT',
        };
    }
}
