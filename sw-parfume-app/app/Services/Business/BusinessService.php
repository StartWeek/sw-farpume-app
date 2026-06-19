<?php

namespace App\Services\Business;

use App\Models\Business\BarangBibit;
use App\Models\Business\Botol;
use App\Models\Business\Brand;
use App\Models\Business\Customer;
use App\Models\Business\Gudang;
use App\Models\Business\Hutang;
use App\Models\Business\KasMutasi;
use App\Models\Business\MutasiStok;
use App\Models\Business\Pembelian;
use App\Models\Business\Penjualan;
use App\Models\Business\Piutang;
use App\Models\Business\PiutangSupplier;
use App\Models\Business\Sales;
use App\Models\Business\StokGudang;
use App\Models\Business\Supplier;
use App\Models\Business\Wangi;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BusinessService
{
    public const MASTERS = [
        'wangi' => ['model' => Wangi::class, 'code' => 'kode_wangi', 'prefix' => 'WNG', 'label' => 'Data Wangi'],
        'brand' => ['model' => Brand::class, 'code' => 'kode_brand', 'prefix' => 'BRD', 'label' => 'Data Brand'],
        'gudang' => ['model' => Gudang::class, 'code' => 'kode_gudang', 'prefix' => 'GDG', 'label' => 'Data Gudang'],
        'supplier' => ['model' => Supplier::class, 'code' => 'kode_supplier', 'prefix' => 'SUP', 'label' => 'Data Supplier'],
        'customer' => ['model' => Customer::class, 'code' => 'kode_customer', 'prefix' => 'CUS', 'label' => 'Data Customer'],
        'sales' => ['model' => Sales::class, 'code' => 'kode_sales', 'prefix' => 'SLS', 'label' => 'Data Sales'],
        'botol' => ['model' => Botol::class, 'code' => 'kode_botol', 'prefix' => 'BTL', 'label' => 'Master Botol'],
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
            $wangi = Wangi::query()->findOrFail($payload['id_wangi']);
            $brand = Brand::query()->findOrFail($payload['id_brand']);

            if (BarangBibit::query()->where('id_wangi', $wangi->id)->where('id_brand', $brand->id)->exists()) {
                throw ValidationException::withMessages(['id_brand' => 'Kombinasi wangi dan brand sudah ada.']);
            }

            return BarangBibit::query()->create([
                ...$payload,
                'kode_barang' => $this->nextCode(BarangBibit::class, 'kode_barang', 'BRG'),
                'nama_barang' => "{$wangi->nama_wangi} - {$brand->nama_brand}",
                'jenis_barang' => $payload['jenis_barang'] ?? 'BIBIT',
                'satuan_dasar' => 'ML',
            ]);
        });
    }

    public function updateBarang(BarangBibit $barang, array $payload): BarangBibit
    {
        return DB::transaction(function () use ($barang, $payload) {
            $wangi = Wangi::query()->findOrFail($payload['id_wangi']);
            $brand = Brand::query()->findOrFail($payload['id_brand']);

            $exists = BarangBibit::query()
                ->whereKeyNot($barang->id)
                ->where('id_wangi', $wangi->id)
                ->where('id_brand', $brand->id)
                ->exists();

            if ($exists) {
                throw ValidationException::withMessages(['id_brand' => 'Kombinasi wangi dan brand sudah ada.']);
            }

            $barang->update([
                ...$payload,
                'nama_barang' => "{$wangi->nama_wangi} - {$brand->nama_brand}",
                'jenis_barang' => $payload['jenis_barang'] ?? 'BIBIT',
                'satuan_dasar' => 'ML',
            ]);

            return $barang->refresh();
        });
    }

    public function replaceStock(int $gudangId, int $barangId, float $qtyMl, array $meta): StokGudang
    {
        $barang = BarangBibit::query()->findOrFail($barangId);
        $stock = StokGudang::query()->firstOrCreate(
            ['id_gudang' => $gudangId, 'id_barang' => $barangId],
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

        MutasiStok::query()->create([
            'tanggal' => now()->toDateString(),
            'tipe_mutasi' => $qtyMl < 0 ? 'KELUAR' : 'MASUK',
            'sumber_transaksi' => $meta['sumber_transaksi'] ?? 'ADJUSTMENT',
            'no_transaksi' => $meta['no_transaksi'] ?? 'MANUAL',
            'id_gudang' => $gudangId,
            'id_barang' => $barangId,
            'qty_ml' => abs($qtyMl),
            'stok_sebelum_ml' => $before,
            'stok_sesudah_ml' => $after,
            'keterangan' => $meta['keterangan'] ?? null,
            'created_by' => $meta['created_by'] ?? null,
        ]);

        return $stock->refresh();
    }

    public function createStockMutation(array $payload): StokGudang
    {
        $multiplier = ($payload['tipe_mutasi'] ?? 'MASUK') === 'KELUAR' ? -1 : 1;

        return DB::transaction(fn () => $this->replaceStock(
            (int) $payload['id_gudang'],
            (int) $payload['id_barang'],
            ((float) $payload['qty_ml']) * $multiplier,
            [
                'sumber_transaksi' => 'ADJUSTMENT',
                'no_transaksi' => $payload['no_transaksi'] ?? 'MANUAL',
                'keterangan' => $payload['keterangan'] ?? 'Input manual inventory',
                'created_by' => $payload['created_by'] ?? auth()->user()?->name,
            ]
        ));
    }

    private function purchaseDetail(array $item): array
    {
        $type = $this->normalizeItemType($item['tipe_item'] ?? 'BIBIT');
        $unit = strtoupper($item['satuan_input'] ?? 'ML');
        $qtyInput = (float) $item['qty_input'];

        if ($type === 'BOTOL') {
            $this->ensureUnit($unit, ['BOTOL', 'DUS'], 'botol');
            $botol = Botol::query()->findOrFail($item['item_id'] ?? $item['id_botol'] ?? null);
            $qtyBotol = $unit === 'DUS' ? $this->dusToBotol($qtyInput, (int) $botol->isi_per_dus) : $qtyInput;
            $price = (float) ($item['harga'] ?? $item['harga_beli_per_botol'] ?? $botol->harga_beli_per_botol);
            $subtotal = $unit === 'DUS' ? $qtyInput * $price : $qtyBotol * $price;

            return [
                'tipe_item' => 'BOTOL',
                'item_id' => $botol->id,
                'nama_item' => $botol->nama_botol,
                'id_barang' => null,
                'qty_input' => $qtyInput,
                'satuan_input' => $unit,
                'qty_ml' => 0,
                'konversi_qty_dasar' => $qtyBotol,
                'satuan_dasar' => 'BOTOL',
                'harga' => $price,
                'harga_beli_per_ml' => 0,
                'subtotal' => $subtotal,
            ];
        }

        $this->ensureUnit($unit, ['ML', 'LITER'], 'cairan');
        $barang = BarangBibit::query()->findOrFail($item['item_id'] ?? $item['id_barang'] ?? null);
        $qtyMl = $this->convertToMl($qtyInput, $unit);
        $price = (float) ($item['harga'] ?? $item['harga_beli_per_ml'] ?? $barang->harga_beli_per_ml);
        $subtotal = $qtyMl * $price;

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
            'harga_beli_per_ml' => $price,
            'subtotal' => $subtotal,
        ];
    }

    private function salesDetail(array $item, string $salesType): array
    {
        $type = $this->normalizeItemType($item['tipe_item'] ?? 'BIBIT');
        $unit = strtoupper($item['satuan_input'] ?? 'ML');
        $qtyInput = (float) ($item['qty_input'] ?? $item['qty_ml'] ?? 0);

        if ($type === 'BOTOL') {
            $this->ensureUnit($unit, ['BOTOL', 'DUS'], 'botol');
            $botol = Botol::query()->findOrFail($item['item_id'] ?? $item['id_botol'] ?? null);
            $qtyBotol = $unit === 'DUS' ? $this->dusToBotol($qtyInput, (int) $botol->isi_per_dus) : $qtyInput;
            $defaultPrice = $unit === 'DUS' && (float) $botol->harga_jual_per_dus > 0
                ? (float) $botol->harga_jual_per_dus
                : (float) $botol->harga_jual_per_botol;
            $price = (float) ($item['harga'] ?? $defaultPrice);
            $modal = $qtyBotol * (float) $botol->harga_beli_per_botol;
            $jual = $unit === 'DUS' ? $qtyInput * $price : $qtyBotol * $price;

            return [
                'tipe_item' => 'BOTOL',
                'item_id' => $botol->id,
                'nama_item' => $botol->nama_botol,
                'id_barang' => null,
                'qty_input' => $qtyInput,
                'satuan_input' => $unit,
                'qty_ml' => 0,
                'konversi_qty_dasar' => $qtyBotol,
                'satuan_dasar' => 'BOTOL',
                'harga' => $price,
                'harga_beli_per_ml' => 0,
                'harga_jual_per_ml' => 0,
                'subtotal_modal' => $modal,
                'subtotal_jual' => $jual,
                'laba_kotor' => $jual - $modal,
            ];
        }

        $this->ensureUnit($unit, ['ML', 'LITER'], 'cairan');
        $barang = BarangBibit::query()->findOrFail($item['item_id'] ?? $item['id_barang'] ?? null);
        $qtyMl = $this->convertToMl($qtyInput, $unit);
        $defaultPrice = $salesType === 'RETAIL' ? (float) $barang->harga_jual_retail_per_ml : (float) $barang->harga_jual_grosir_per_ml;
        $price = (float) ($item['harga'] ?? $defaultPrice);
        $modal = $qtyMl * (float) $barang->harga_beli_per_ml;
        $jual = $qtyMl * $price;

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
            'subtotal_jual' => $jual,
            'laba_kotor' => $jual - $modal,
        ];
    }

    private function applyStockMovement(int $gudangId, array $detail, int $direction, string $number, string $source, array $payload): void
    {
        if ($detail['satuan_dasar'] === 'ML') {
            $this->replaceStock($gudangId, (int) $detail['id_barang'], $direction * (float) $detail['konversi_qty_dasar'], [
                'sumber_transaksi' => $source,
                'no_transaksi' => $number,
                'keterangan' => $source === 'PEMBELIAN' ? 'Pembelian supplier' : 'POS penjualan',
                'created_by' => $payload['created_by'] ?? auth()->user()?->name,
            ]);

            return;
        }

        $botol = Botol::query()->findOrFail($detail['item_id']);
        $after = (float) $botol->stock_botol + ($direction * (float) $detail['konversi_qty_dasar']);

        if ($after < 0) {
            throw ValidationException::withMessages(['items' => "Stok {$botol->nama_botol} tidak mencukupi."]);
        }

        $botol->update(['stock_botol' => $after]);
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

            $payment = $this->paymentAmounts($payload['metode_pembayaran'], $total, (float) ($payload['jumlah_bayar'] ?? 0));
            $number = $this->nextCode(Pembelian::class, 'no_pembelian', 'PBL');
            $pembelian = Pembelian::query()->create([
                'no_pembelian' => $number,
                'tanggal' => $payload['tanggal'] ?? now()->toDateString(),
                'id_supplier' => $payload['id_supplier'],
                'id_gudang' => $payload['id_gudang'],
                'total_qty_ml' => $totalQtyMl,
                'total_qty_botol' => $totalQtyBotol,
                'total_pembelian' => $total,
                'jumlah_bayar' => $payment['paid'],
                'metode_pembayaran' => $payment['stored_method'],
                'status_pembayaran' => $payment['status'],
                'jatuh_tempo' => $payload['jatuh_tempo'] ?? null,
                'keterangan' => $payload['keterangan'] ?? null,
                'created_by' => $payload['created_by'] ?? auth()->user()?->name,
            ]);

            foreach ($details as $detail) {
                $pembelian->details()->create($detail);
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
                    'total_hutang' => $total,
                    'total_bayar' => $payment['paid'],
                    'sisa_hutang' => $payment['remaining'],
                    'status_hutang' => $this->debtStatus($payment['remaining'], $payment['paid']),
                    'jatuh_tempo' => $payload['jatuh_tempo'],
                ]);
            }

            return $pembelian->load(['supplier', 'gudang', 'details.barang', 'details.botol', 'hutang']);
        });
    }

    public function createPenjualan(array $payload): Penjualan
    {
        if (in_array($payload['metode_pembayaran'], ['TEMPO', 'DP'], true) && empty($payload['jatuh_tempo'])) {
            throw ValidationException::withMessages(['jatuh_tempo' => 'Jatuh tempo wajib untuk penjualan tempo.']);
        }

        return DB::transaction(function () use ($payload) {
            $customer = Customer::query()->findOrFail($payload['id_customer']);
            $type = $this->normalizeSalesType($payload['tipe_penjualan'] ?? $customer->tipe_customer);
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

            $payment = $this->paymentAmounts($payload['metode_pembayaran'], $totalJual, (float) ($payload['jumlah_bayar'] ?? 0));
            $number = $this->nextCode(Penjualan::class, 'no_penjualan', 'PJL');
            $penjualan = Penjualan::query()->create([
                'no_penjualan' => $number,
                'tanggal' => $payload['tanggal'] ?? now()->toDateString(),
                'id_customer' => $payload['id_customer'],
                'tipe_penjualan' => $type,
                'id_sales' => $payload['id_sales'] ?? null,
                'id_gudang' => $payload['id_gudang'],
                'total_qty_ml' => $totalQtyMl,
                'total_qty_botol' => $totalQtyBotol,
                'total_penjualan' => $totalJual,
                'jumlah_bayar' => $payment['paid'],
                'total_modal' => $totalModal,
                'laba_kotor' => $totalJual - $totalModal,
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
                $this->recordCash($penjualan->tanggal->toDateString(), $number, 'MASUK', $type === 'RETAIL' ? 'Penjualan retail' : 'Penjualan sales', $customer->nama_customer, $payment['paid'], $payload['keterangan'] ?? null, $payload['created_by'] ?? auth()->user()?->name);
            }

            if ($payment['remaining'] > 0) {
                Piutang::query()->create([
                    'no_piutang' => $this->nextCode(Piutang::class, 'no_piutang', 'PTG'),
                    'tanggal' => $penjualan->tanggal,
                    'id_customer' => $payload['id_customer'],
                    'id_penjualan' => $penjualan->id,
                    'total_piutang' => $totalJual,
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

        $this->recordCash(now()->toDateString(), $hutang->no_hutang, 'KELUAR', 'Pelunasan hutang supplier', $hutang->supplier?->nama_supplier, $amount, $hutang->keterangan, auth()->user()?->name);

        return $hutang->refresh();
    }

    public function createHutangSupplier(array $payload): Hutang
    {
        return Hutang::query()->create([
            'no_hutang' => $this->nextCode(Hutang::class, 'no_hutang', 'HTG'),
            'tanggal' => $payload['tanggal'] ?? now()->toDateString(),
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

        $this->recordCash(now()->toDateString(), $piutang->no_piutang, 'MASUK', 'Pelunasan piutang customer/sales', $piutang->customer?->nama_customer, $amount, null, auth()->user()?->name);

        return $piutang->refresh();
    }

    public function createPiutangSupplier(array $payload): PiutangSupplier
    {
        return PiutangSupplier::query()->create([
            'no_piutang_supplier' => $this->nextCode(PiutangSupplier::class, 'no_piutang_supplier', 'PTS'),
            'tanggal' => $payload['tanggal'] ?? now()->toDateString(),
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
        $today = Carbon::today();
        $month = $today->format('Y-m');
        $salesToday = Penjualan::query()->whereDate('tanggal', $today)->get();
        $buysToday = Pembelian::query()->whereDate('tanggal', $today)->get();
        $stocks = StokGudang::query()->with(['gudang', 'barang.wangi', 'barang.brand'])->get();
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
