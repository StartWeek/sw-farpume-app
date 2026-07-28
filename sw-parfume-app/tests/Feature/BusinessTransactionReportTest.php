<?php

namespace Tests\Feature;

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
use App\Models\Business\SaldoBarang;
use App\Models\Business\Supplier;
use App\Models\Business\TokoClosing;
use App\Models\Business\SystemDate;
use App\Models\Business\StokGudang;
use App\Models\Business\Wangi;
use App\Models\User;
use App\Services\Business\BusinessService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class BusinessTransactionReportTest extends TestCase
{
    use RefreshDatabase;

    public function test_pembelian_is_available_for_purchase_and_stock_reports(): void
    {
        [$supplier, $gudang, $barang] = $this->seedPurchaseData();

        $pembelian = app(BusinessService::class)->createPembelian([
            'id_supplier' => $supplier->id,
            'id_gudang' => $gudang->id,
            'metode_pembayaran' => 'CASH',
            'items' => [[
                'id_barang' => $barang->id,
                'qty_input' => 2,
                'satuan_input' => 'ML',
                'harga_beli_per_ml' => 1000,
            ]],
        ]);

        $reportRow = Pembelian::query()
            ->with(['supplier', 'gudang', 'details.barang'])
            ->whereKey($pembelian->id)
            ->first();

        $this->assertNotNull($reportRow);
        $this->assertSame('Supplier Test', $reportRow->supplier->nama_supplier);
        $this->assertSame('Gudang Test', $reportRow->gudang->nama_gudang);
        $this->assertCount(1, $reportRow->details);
        $this->assertDatabaseHas('tt_mutasi_stok', [
            'sumber_transaksi' => 'PEMBELIAN',
            'no_transaksi' => $pembelian->no_pembelian,
        ]);
        $this->assertDatabaseHas('tt_barang_bibit', [
            'id_gudang' => $gudang->id,
            'id_barang' => $barang->id,
            'tipe_mutasi' => 'MASUK',
            'qty_ml' => 2,
            'stok_awal_ml' => 0,
            'stok_akhir_ml' => 2,
            'sumber_transaksi' => 'PEMBELIAN',
            'no_transaksi' => $pembelian->no_pembelian,
        ]);
        $this->assertSame(1, MutasiStok::query()->where('no_transaksi', $pembelian->no_pembelian)->count());
    }

    public function test_penjualan_is_available_for_sales_and_stock_reports(): void
    {
        [$supplier, $gudang, $barang] = $this->seedPurchaseData();
        $customer = Customer::query()->create([
            'kode_customer' => 'CUS-0001',
            'nama_customer' => 'Customer Test',
            'tipe_customer' => 'RETAIL',
            'status' => 'AKTIF',
        ]);

        app(BusinessService::class)->createPembelian([
            'id_supplier' => $supplier->id,
            'id_gudang' => $gudang->id,
            'metode_pembayaran' => 'CASH',
            'items' => [[
                'id_barang' => $barang->id,
                'qty_input' => 10,
                'satuan_input' => 'ML',
                'harga_beli_per_ml' => 1000,
            ]],
        ]);

        $penjualan = app(BusinessService::class)->createPenjualan([
            'id_customer' => $customer->id,
            'tipe_penjualan' => 'RETAIL',
            'id_gudang' => $gudang->id,
            'metode_pembayaran' => 'CASH',
            'items' => [[
                'id_barang' => $barang->id,
                'qty_ml' => 3,
            ]],
        ]);

        $reportRow = Penjualan::query()
            ->with(['customer', 'gudang', 'details.barang'])
            ->whereKey($penjualan->id)
            ->first();

        $this->assertNotNull($reportRow);
        $this->assertSame('Customer Test', $reportRow->customer->nama_customer);
        $this->assertSame('Gudang Test', $reportRow->gudang->nama_gudang);
        $this->assertCount(1, $reportRow->details);
        $this->assertDatabaseHas('tt_mutasi_stok', [
            'sumber_transaksi' => 'PENJUALAN',
            'no_transaksi' => $penjualan->no_penjualan,
        ]);
    }

    public function test_supplier_debt_and_receivable_are_available_for_reports(): void
    {
        [$supplier] = $this->seedPurchaseData();

        $hutang = app(BusinessService::class)->createHutangSupplier([
            'id_supplier' => $supplier->id,
            'total_hutang' => 50000,
            'jatuh_tempo' => now()->addWeek()->toDateString(),
            'keterangan' => 'Hutang supplier manual',
        ]);
        $piutangSupplier = app(BusinessService::class)->createPiutangSupplier([
            'id_supplier' => $supplier->id,
            'total_piutang' => 25000,
            'jatuh_tempo' => now()->addWeek()->toDateString(),
            'keterangan' => 'Piutang supplier manual',
        ]);

        $hutangReportRow = Hutang::query()->with('supplier')->whereKey($hutang->id)->first();
        $piutangReportRow = PiutangSupplier::query()->with('supplier')->whereKey($piutangSupplier->id)->first();

        $this->assertNotNull($hutangReportRow);
        $this->assertNull($hutangReportRow->id_pembelian);
        $this->assertSame('Supplier Test', $hutangReportRow->supplier->nama_supplier);
        $this->assertSame('50000.00', $hutangReportRow->sisa_hutang);
        $this->assertNotNull($piutangReportRow);
        $this->assertSame('Supplier Test', $piutangReportRow->supplier->nama_supplier);
        $this->assertSame('25000.00', $piutangReportRow->sisa_piutang);
    }

    public function test_tempo_payments_update_source_transaction_status(): void
    {
        [$supplier, $gudang, $barang] = $this->seedPurchaseData();
        $customer = Customer::query()->create([
            'kode_customer' => 'CUS-0001',
            'nama_customer' => 'Customer Test',
            'tipe_customer' => 'RETAIL',
            'status' => 'AKTIF',
        ]);

        app(BusinessService::class)->createPembelian([
            'id_supplier' => $supplier->id,
            'id_gudang' => $gudang->id,
            'metode_pembayaran' => 'CASH',
            'items' => [[
                'id_barang' => $barang->id,
                'qty_input' => 10,
                'satuan_input' => 'ML',
                'harga_beli_per_ml' => 1000,
            ]],
        ]);

        $tempoPembelian = app(BusinessService::class)->createPembelian([
            'id_supplier' => $supplier->id,
            'id_gudang' => $gudang->id,
            'metode_pembayaran' => 'TEMPO',
            'jatuh_tempo' => now()->addWeek()->toDateString(),
            'items' => [[
                'id_barang' => $barang->id,
                'qty_input' => 2,
                'satuan_input' => 'ML',
                'harga_beli_per_ml' => 1000,
            ]],
        ]);
        $tempoPenjualan = app(BusinessService::class)->createPenjualan([
            'id_customer' => $customer->id,
            'tipe_penjualan' => 'RETAIL',
            'id_gudang' => $gudang->id,
            'metode_pembayaran' => 'TEMPO',
            'jatuh_tempo' => now()->addWeek()->toDateString(),
            'items' => [[
                'id_barang' => $barang->id,
                'qty_ml' => 2,
            ]],
        ]);

        app(BusinessService::class)->payHutang($tempoPembelian->hutang, 2000);
        app(BusinessService::class)->payPiutang($tempoPenjualan->piutang, 3000);

        $this->assertSame('LUNAS', $tempoPembelian->refresh()->status_pembayaran);
        $this->assertSame('LUNAS', $tempoPenjualan->refresh()->status_pembayaran);
    }

    public function test_barang_summary_report_tracks_stock_in_and_out(): void
    {
        [$supplier, $gudang, $barang] = $this->seedPurchaseData();
        $customer = Customer::query()->create([
            'kode_customer' => 'CUS-0001',
            'nama_customer' => 'Customer Test',
            'tipe_customer' => 'RETAIL',
            'status' => 'AKTIF',
        ]);
        $user = User::query()->create([
            'username' => 'super',
            'name' => 'Super User',
            'email' => 'super@example.test',
            'password' => 'secret',
            'role' => 'superadmin',
        ]);

        app(BusinessService::class)->createPembelian([
            'id_supplier' => $supplier->id,
            'id_gudang' => $gudang->id,
            'metode_pembayaran' => 'CASH',
            'items' => [[
                'id_barang' => $barang->id,
                'qty_input' => 10,
                'satuan_input' => 'ML',
                'harga_beli_per_ml' => 1000,
            ]],
        ]);
        app(BusinessService::class)->createPenjualan([
            'id_customer' => $customer->id,
            'tipe_penjualan' => 'RETAIL',
            'id_gudang' => $gudang->id,
            'metode_pembayaran' => 'CASH',
            'items' => [[
                'id_barang' => $barang->id,
                'qty_ml' => 3,
            ]],
        ]);

        $this->actingAs($user)
            ->get('/admin/laporan/barang-summary?search=1')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/business/ReportPage', false)
                ->where('type', 'barang-summary')
                ->where('searched', true)
                ->has('rows.data', 1)
                ->where('rows.data.0.total_masuk_ml', 10)
                ->where('rows.data.0.total_keluar_ml', 3)
                ->where('rows.data.0.selisih_ml', 7)
                ->where('rows.data.0.stok_awal_ml', '0.00')
                ->where('rows.data.0.stok_akhir_ml', '7.00')
            );

        SystemDate::query()->updateOrCreate(['id' => 1], ['tanggal_system' => '2099-01-02']);
        app(BusinessService::class)->createPembelian([
            'id_supplier' => $supplier->id,
            'id_gudang' => $gudang->id,
            'metode_pembayaran' => 'CASH',
            'items' => [[
                'id_barang' => $barang->id,
                'qty_input' => 5,
                'satuan_input' => 'ML',
                'harga_beli_per_ml' => 1000,
            ]],
        ]);

        $this->get('/admin/laporan/barang-summary?search=1&tanggal_dari=2099-01-02&tanggal_sampai=2099-01-02')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('rows.data.0.stok_awal_ml', '7.00')
                ->where('rows.data.0.total_masuk_ml', 5)
                ->where('rows.data.0.total_keluar_ml', 0)
                ->where('rows.data.0.stok_akhir_ml', '12.00')
            );
    }

    public function test_empty_bottle_purchase_is_recorded_in_stock_and_item_summary_reports(): void
    {
        [$supplier, $gudang, $barang] = $this->seedPurchaseData();
        $botol = BotolKosong::query()->create([
            'kode_botol' => 'BTK-0010',
            'id_gudang' => $gudang->id,
            'nama_botol' => 'Botol Kosong 100 ML',
            'harga_beli' => 1000,
            'stock' => 100,
            'satuan' => 'BOTOL',
            'status' => 'AKTIF',
        ]);
        $user = User::query()->create([
            'username' => 'bottle-report',
            'name' => 'Bottle Report',
            'email' => 'bottle-report@example.test',
            'password' => 'secret',
            'role' => 'superadmin',
        ]);

        $purchase = app(BusinessService::class)->createPembelian([
            'id_supplier' => $supplier->id,
            'id_gudang' => $gudang->id,
            'metode_pembayaran' => 'CASH',
            'items' => [[
                'tipe_item' => 'BOTOL',
                'item_id' => $botol->id,
                'qty_input' => 10,
                'satuan_input' => 'BOTOL',
                'harga' => 1000,
            ]],
        ]);
        app(BusinessService::class)->createPembelian([
            'id_supplier' => $supplier->id,
            'id_gudang' => $gudang->id,
            'metode_pembayaran' => 'CASH',
            'items' => [[
                'tipe_item' => 'BIBIT',
                'item_id' => $barang->id,
                'qty_input' => 25,
                'satuan_input' => 'ML',
                'harga' => 1000,
            ]],
        ]);

        $this->assertDatabaseHas('tt_botol_kosong', [
            'id_botol_kosong' => $botol->id,
            'tipe_mutasi' => 'MASUK',
            'qty_botol' => 10,
            'stok_awal' => 100,
            'stok_akhir' => 110,
            'sumber_transaksi' => 'PEMBELIAN',
            'no_transaksi' => $purchase->no_pembelian,
        ]);

        $this->actingAs($user)
            ->get('/admin/laporan/stok?search=1&jenis_barang=BOTOL')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('rows.data', 0)
                ->has('botolStock', 1)
                ->where('botolStock.0.stok_botol', 110)
            );

        $this->get('/admin/laporan/barang-summary?search=1&jenis_barang=BOTOL')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('rows.data', 0)
                ->has('botolSummary', 1)
                ->where('botolSummary.0.stok_awal', 100)
                ->where('botolSummary.0.total_masuk', 10)
                ->where('botolSummary.0.total_keluar', 0)
                ->where('botolSummary.0.stok_akhir', 110)
            );

        $this->get('/admin/laporan/stok?search=1&jenis_barang=BIBIT')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('rows.data', 1)
                ->where('rows.data.0.nama_item', $barang->nama_barang)
                ->has('botolStock', 0)
            );

        $this->get('/admin/laporan/barang-summary?search=1&jenis_barang=BIBIT')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('rows.data', 1)
                ->where('rows.data.0.barang.id', $barang->id)
                ->has('botolSummary', 0)
            );
    }

    public function test_legacy_empty_bottle_purchase_can_be_backfilled_for_item_summary(): void
    {
        [$supplier, $gudang] = $this->seedPurchaseData();
        $botol = BotolKosong::query()->create([
            'kode_botol' => 'BTK-LEGACY',
            'id_gudang' => $gudang->id,
            'nama_botol' => 'Botol Kosong Lama',
            'harga_beli' => 1000,
            'stock' => 100,
            'satuan' => 'BOTOL',
            'status' => 'AKTIF',
        ]);

        $purchase = app(BusinessService::class)->createPembelian([
            'id_supplier' => $supplier->id,
            'id_gudang' => $gudang->id,
            'metode_pembayaran' => 'CASH',
            'items' => [[
                'tipe_item' => 'BOTOL',
                'item_id' => $botol->id,
                'qty_input' => 10,
                'satuan_input' => 'BOTOL',
                'harga' => 1000,
            ]],
        ]);
        DB::table('tt_botol_kosong')->truncate();

        app(BusinessService::class)->backfillBotolKosongTransactions();

        $this->assertDatabaseHas('tt_botol_kosong', [
            'id_botol_kosong' => $botol->id,
            'tipe_mutasi' => 'MASUK',
            'qty_botol' => 10,
            'stok_awal' => 100,
            'stok_akhir' => 110,
            'sumber_transaksi' => 'PEMBELIAN',
            'no_transaksi' => $purchase->no_pembelian,
        ]);
    }

    public function test_barang_balance_is_snapshotted_and_carried_to_the_next_operational_day(): void
    {
        [$supplier, $gudang, $barang] = $this->seedPurchaseData();
        $today = now()->toDateString();
        $tomorrow = now()->addDay()->toDateString();
        SystemDate::query()->updateOrCreate(['id' => 1], ['tanggal_system' => $today]);

        app(BusinessService::class)->createPembelian([
            'id_supplier' => $supplier->id,
            'id_gudang' => $gudang->id,
            'metode_pembayaran' => 'CASH',
            'items' => [[
                'id_barang' => $barang->id,
                'qty_input' => 10,
                'satuan_input' => 'ML',
                'harga_beli_per_ml' => 1000,
            ]],
        ]);

        $this->assertDatabaseHas('tt_saldo_barang', [
            'id_gudang' => $gudang->id,
            'id_barang' => $barang->id,
            'stok_awal_ml' => 0,
            'masuk_ml' => 10,
            'keluar_ml' => 0,
            'stok_akhir_ml' => 10,
        ]);
        $this->assertTrue(SaldoBarang::query()->whereDate('tanggal', $today)->exists());

        app(BusinessService::class)->closeStore();

        $this->assertDatabaseHas('th_saldo_barang', [
            'id_gudang' => $gudang->id,
            'id_barang' => $barang->id,
            'stok_awal_ml' => 0,
            'masuk_ml' => 10,
            'keluar_ml' => 0,
            'stok_akhir_ml' => 10,
        ]);
        $this->assertTrue(HistoriSaldoBarang::query()->whereDate('tanggal', $today)->exists());
        $this->assertDatabaseHas('tt_saldo_barang', [
            'id_gudang' => $gudang->id,
            'id_barang' => $barang->id,
            'stok_awal_ml' => 10,
            'masuk_ml' => 0,
            'keluar_ml' => 0,
            'stok_akhir_ml' => 10,
        ]);
        $this->assertTrue(SaldoBarang::query()->whereDate('tanggal', $tomorrow)->exists());

        $user = User::query()->create([
            'username' => 'balance-report',
            'name' => 'Balance Report',
            'password' => 'secret',
            'role' => 'superadmin',
        ]);

        $this->actingAs($user)
            ->get("/admin/laporan/barang-summary?search=1&tanggal_dari={$tomorrow}&tanggal_sampai={$tomorrow}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('rows.data', 1)
                ->where('rows.data.0.stok_awal_ml', '10.00')
                ->where('rows.data.0.total_masuk_ml', 0)
                ->where('rows.data.0.total_keluar_ml', 0)
                ->where('rows.data.0.stok_akhir_ml', '10.00')
            );

        $this->get("/admin/laporan/barang-summary?search=1&tanggal_dari={$today}&tanggal_sampai={$today}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('rows.data', 1)
                ->where('rows.data.0.stok_awal_ml', '0.00')
                ->where('rows.data.0.total_masuk_ml', 10)
                ->where('rows.data.0.total_keluar_ml', 0)
                ->where('rows.data.0.stok_akhir_ml', '10.00')
            );
    }

    public function test_mixed_perfume_and_bottle_transactions_convert_stock_cash_and_receivables(): void
    {
        [$supplier, $gudang, $barang] = $this->seedPurchaseData();
        $botol = Botol::query()->create([
            'kode_botol' => 'BTL-0001',
            'varian_ml' => 100,
            'nama_botol' => 'Botol 100ml',
            'isi_per_dus' => 100,
            'harga_beli_per_botol' => 1000,
            'harga_jual_per_botol' => 1500,
            'harga_jual_per_dus' => 140000,
            'status' => 'AKTIF',
        ]);
        $customer = Customer::query()->create([
            'kode_customer' => 'CUS-0001',
            'nama_customer' => 'Customer Sales',
            'tipe_customer' => 'SALES',
            'status' => 'AKTIF',
        ]);

        app(BusinessService::class)->createPembelian([
            'id_supplier' => $supplier->id,
            'id_gudang' => $gudang->id,
            'metode_pembayaran' => 'DP',
            'jumlah_bayar' => 50000,
            'jatuh_tempo' => now()->addWeek()->toDateString(),
            'items' => [
                ['tipe_item' => 'BIBIT', 'item_id' => $barang->id, 'qty_input' => 1, 'satuan_input' => 'LITER', 'harga' => 1000],
                ['tipe_item' => 'BOTOL', 'item_id' => $botol->id, 'qty_input' => 2, 'satuan_input' => 'DUS', 'harga' => 100000],
            ],
        ]);

        $this->assertDatabaseHas('tt_stok_gudang', ['id_barang' => $barang->id, 'stok_ml' => 1000]);
        $this->assertSame('200.00', $botol->refresh()->stock_botol);
        $this->assertSame(1, Hutang::query()->count());
        $this->assertSame('KELUAR', KasMutasi::query()->first()->jenis_transaksi);

        app(BusinessService::class)->createPenjualan([
            'id_customer' => $customer->id,
            'tipe_penjualan' => 'SALES',
            'id_gudang' => $gudang->id,
            'metode_pembayaran' => 'TEMPO',
            'jatuh_tempo' => now()->addWeek()->toDateString(),
            'items' => [
                ['tipe_item' => 'BIBIT', 'item_id' => $barang->id, 'qty_input' => 0.5, 'satuan_input' => 'LITER'],
                ['tipe_item' => 'BOTOL', 'item_id' => $botol->id, 'qty_input' => 1, 'satuan_input' => 'DUS'],
            ],
        ]);

        $this->assertDatabaseHas('tt_stok_gudang', ['id_barang' => $barang->id, 'stok_ml' => 500]);
        $this->assertSame('100.00', $botol->refresh()->stock_botol);
        $this->assertSame(1, Piutang::query()->count());
    }

    public function test_transaction_and_report_pages_open_for_superadmin(): void
    {
        $this->seedPurchaseData();
        Botol::query()->create([
            'kode_botol' => 'BTL-0001',
            'varian_ml' => 100,
            'nama_botol' => 'Botol 100ml',
            'isi_per_dus' => 100,
            'harga_beli_per_botol' => 1000,
            'harga_jual_per_botol' => 1500,
            'harga_jual_per_dus' => 140000,
            'status' => 'AKTIF',
        ]);
        $user = User::query()->create([
            'username' => 'super-pages',
            'name' => 'Super Pages',
            'email' => 'super-pages@example.test',
            'password' => 'secret',
            'role' => 'superadmin',
        ]);

        foreach ([
            '/admin/pembelian',
            '/admin/penjualan/retail',
            '/admin/penjualan/sales',
            '/admin/laporan/pembelian',
            '/admin/laporan/penjualan',
            '/admin/laporan/stok',
            '/admin/laporan/mutasi-stok',
            '/admin/laporan/barang-summary',
            '/admin/laporan/hutang',
            '/admin/laporan/piutang',
            '/admin/laporan/piutang-supplier',
            '/admin/laporan/laba-kotor',
            '/admin/laporan/kas',
        ] as $url) {
            $this->actingAs($user)->get($url)->assertOk();
        }
    }

    public function test_bottle_sale_records_bottle_quantity_capacity_and_equivalent_price_per_ml(): void
    {
        [, $gudang] = $this->seedPurchaseData();
        $customer = Customer::query()->create([
            'kode_customer' => 'CUS-0001',
            'nama_customer' => 'Customer Retail',
            'tipe_customer' => 'RETAIL',
            'status' => 'AKTIF',
        ]);
        $botol = Botol::query()->create([
            'kode_botol' => 'BTL-0700',
            'varian_ml' => 700,
            'nama_botol' => 'Botol 700 ML',
            'isi_per_dus' => 1,
            'harga_beli_per_botol' => 50000,
            'harga_jual_per_botol' => 70000,
            'stock_botol' => 2,
            'status' => 'AKTIF',
        ]);

        $sale = app(BusinessService::class)->createPenjualan([
            'id_customer' => $customer->id,
            'tipe_penjualan' => 'RETAIL',
            'id_gudang' => $gudang->id,
            'metode_pembayaran' => 'CASH',
            'items' => [[
                'tipe_item' => 'BOTOL',
                'item_id' => $botol->id,
                'qty_input' => 1,
                'satuan_input' => 'BOTOL',
            ]],
        ]);

        $detail = $sale->details()->firstOrFail();
        $this->assertSame('1.00', $detail->konversi_qty_dasar);
        $this->assertSame('700.00', $detail->qty_ml);
        $this->assertSame('70000.00', $detail->subtotal_jual);
        $this->assertSame('100.00', $detail->harga_jual_per_ml);
        $this->assertSame('1.00', $botol->refresh()->stock_botol);
    }

    public function test_liquid_stock_uses_selected_bottle_and_tracks_active_remainder(): void
    {
        [, $gudang, $barang] = $this->seedPurchaseData();
        $customer = Customer::query()->create([
            'kode_customer' => 'CUS-BOTOL',
            'nama_customer' => 'Customer Botol',
            'tipe_customer' => 'RETAIL',
            'status' => 'AKTIF',
        ]);
        $botol = $barang->botol()->firstOrFail();

        app(BusinessService::class)->createStockMutation([
            'id_gudang' => $gudang->id,
            'id_barang' => $barang->id,
            'tipe_mutasi' => 'MASUK',
            'jumlah_botol' => 1,
        ]);

        $this->assertSame('999.00', $botol->refresh()->stock_botol);

        app(BusinessService::class)->createPenjualan([
            'id_customer' => $customer->id,
            'tipe_penjualan' => 'RETAIL',
            'id_gudang' => $gudang->id,
            'metode_pembayaran' => 'CASH',
            'items' => [[
                'tipe_item' => 'BIBIT',
                'item_id' => $barang->id,
                'qty_input' => 10,
                'satuan_input' => 'ML',
            ]],
        ]);

        $stock = StokGudang::query()->with('barang.botol')->firstOrFail();
        $this->assertSame('90.00', $stock->stok_ml);
        $this->assertSame(1, $stock->stok_botol_isi);

        $user = User::query()->create([
            'username' => 'stock-report',
            'name' => 'Stock Report',
            'email' => 'stock-report@example.test',
            'password' => 'secret',
            'role' => 'superadmin',
        ]);
        $this->actingAs($user)
            ->get('/admin/laporan/stok?search=1&jenis_barang=BIBIT&per_page=50')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('rows.per_page', 50)
                ->where('rows.data.0.stok_botol_isi', 1)
            );
    }

    public function test_closing_store_carries_ending_balance_to_next_operational_day(): void
    {
        SystemDate::query()->updateOrCreate(['id' => 1], ['tanggal_system' => '2026-06-20']);
        KasMutasi::query()->create([
            'tanggal' => '2026-06-20',
            'no_transaksi' => 'KAS-0001',
            'jenis_transaksi' => 'MASUK',
            'sumber_transaksi' => 'MODAL',
            'kas_masuk' => 100000,
            'kas_keluar' => 0,
            'saldo_akhir' => 100000,
        ]);

        $closing = app(BusinessService::class)->closeStore(null, 'TUTUP HARIAN');

        $this->assertInstanceOf(TokoClosing::class, $closing);
        $this->assertSame('100000.00', $closing->saldo_akhir);
        $this->assertSame('2026-06-21', app(BusinessService::class)->operationalDate()->toDateString());
        $this->assertTrue(SystemDate::query()->whereDate('tanggal_system', '2026-06-21')->exists());
        $this->assertTrue(TokoClosing::query()
            ->whereDate('tanggal_tutup', '2026-06-20')
            ->where('saldo_akhir', 100000)
            ->exists());

        $cash = app(BusinessService::class)->createManualCash([
            'tanggal' => '2026-06-20',
            'jenis_transaksi' => 'MASUK',
            'jumlah' => 1000,
        ]);
        $this->assertSame('2026-06-21', $cash->tanggal->toDateString());
    }

    private function seedPurchaseData(): array
    {
        $supplier = Supplier::query()->create([
            'kode_supplier' => 'SUP-0001',
            'nama_supplier' => 'Supplier Test',
            'status' => 'AKTIF',
        ]);
        $gudang = Gudang::query()->create([
            'kode_gudang' => 'GDG-0001',
            'nama_gudang' => 'Gudang Test',
            'status' => 'AKTIF',
        ]);
        $wangi = Wangi::query()->create([
            'kode_wangi' => 'WNG-0001',
            'nama_wangi' => 'Vanilla',
            'status' => 'AKTIF',
        ]);
        $brand = Brand::query()->create([
            'kode_brand' => 'BRD-0001',
            'nama_brand' => 'Brand Test',
            'status' => 'AKTIF',
        ]);
        $botol = Botol::query()->create([
            'kode_botol' => 'BTL-STOCK',
            'varian_ml' => 100,
            'nama_botol' => 'Botol Stok 100 ML',
            'isi_per_dus' => 1,
            'harga_beli_per_botol' => 1000,
            'harga_jual_per_botol' => 1500,
            'stock_botol' => 1000,
            'status' => 'AKTIF',
        ]);
        $barang = BarangBibit::query()->create([
            'kode_barang' => 'BRG-0001',
            'id_wangi' => $wangi->id,
            'id_brand' => $brand->id,
            'id_botol' => $botol->id,
            'nama_barang' => 'Vanilla - Brand Test',
            'harga_beli_per_ml' => 1000,
            'harga_jual_retail_per_ml' => 1500,
            'harga_jual_grosir_per_ml' => 1250,
            'minimum_stok_ml' => 10,
            'satuan_dasar' => 'ML',
            'status' => 'AKTIF',
        ]);

        return [$supplier, $gudang, $barang];
    }
}
