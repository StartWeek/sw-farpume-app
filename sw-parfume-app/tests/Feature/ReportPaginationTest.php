<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\SettingsService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Inertia\Testing\AssertableInertia as Assert;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class ReportPaginationTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $this->mock(SettingsService::class, fn ($mock) => $mock->shouldReceive('get')->andReturn([]));
        $this->createSchema();
        $this->actingAs(User::query()->create([
            'username' => 'report-test', 'name' => 'Report Test', 'password' => 'test', 'role' => 'superadmin',
        ]));
        $this->seedReports();
    }

    public static function reportTypes(): array
    {
        return array_map(fn ($type) => [$type], [
            'validasi-transaksi', 'pembelian', 'penjualan', 'laba-kotor', 'stok',
            'mutasi-stok', 'barang-summary', 'hutang', 'piutang', 'piutang-supplier', 'kas',
        ]);
    }

    #[DataProvider('reportTypes')]
    public function test_each_report_only_loads_the_requested_page_and_keeps_full_totals(string $type): void
    {
        $retrieved = 0;
        $models = [
            'validasi-transaksi' => 'TransactionValidation', 'pembelian' => 'Pembelian',
            'penjualan' => 'Penjualan', 'laba-kotor' => 'Penjualan', 'stok' => 'StokGudang',
            'mutasi-stok' => 'MutasiStok', 'barang-summary' => 'SaldoBarang',
            'hutang' => 'Hutang', 'piutang' => 'Piutang', 'piutang-supplier' => 'PiutangSupplier', 'kas' => 'KasMutasi',
        ];
        $model = 'App\\Models\\Business\\'.$models[$type];
        $model::retrieved(function () use (&$retrieved): void {
            $retrieved++;
        });
        $response = $this->get("/admin/laporan/{$type}?search=1&page=2");
        $response->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('admin/business/ReportPage', false)
            ->has('rows.data', 10)->where('rows.total', 61)
            ->where('rows.current_page', 2)->where('rows.last_page', 7)
            ->where('rows.from', 11)->where('rows.to', 20)
        );
        $this->assertSame($type === 'kas' ? 12 : 10, $retrieved, 'Only page rows and cash boundary rows may be hydrated.');

        $expected = match ($type) {
            'validasi-transaksi' => ['Pengajuan Menunggu' => 21, 'Pengajuan Disetujui' => 20, 'Pengajuan Ditolak' => 20],
            'pembelian' => ['Total Pembelian' => 6100],
            'penjualan', 'laba-kotor' => ['Total Penjualan' => 12200, 'Modal' => 6100, 'Laba Kotor' => 6100],
            'stok' => ['Total Stok Cairan (ML)' => 8845, 'Total Perkiraan Botol Isi' => 122],
            'mutasi-stok' => ['Total ML' => 183],
            'barang-summary' => ['Total Stok Awal ML' => 6100, 'Total Masuk ML' => 3660, 'Total Keluar ML' => 915, 'Total Stok Akhir ML' => 8845],
            'hutang' => ['Total Hutang' => 18300, 'Sisa Hutang' => 12200],
            'piutang', 'piutang-supplier' => ['Total Piutang' => 24400, 'Sisa Piutang' => 18300],
            'kas' => ['Saldo Awal' => 500, 'Kas Masuk' => 610, 'Kas Keluar' => 305, 'Saldo Akhir' => 805],
        };
        $response->assertInertia(function (Assert $page) use ($expected): void {
            foreach ($expected as $label => $total) {
                $page->where("summary.{$label}", $total);
            }
        });
        foreach ([25 => 25, 50 => 11] as $size => $count) {
            $this->get("/admin/laporan/{$type}?search=1&page=2&per_page={$size}")->assertOk()
                ->assertInertia(fn (Assert $page) => $page->has('rows.data', $count)->where('rows.per_page', $size));
        }
        $this->get("/admin/laporan/{$type}?search=1&page=100")->assertOk()
            ->assertInertia(fn (Assert $page) => $page->has('rows.data', 0)->where('rows.total', 61));
        $this->get("/admin/laporan/{$type}?search=0")->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('rows', [])->where('summary', []));
    }

    public function test_barang_summary_opens_on_the_operational_date_instead_of_the_device_date(): void
    {
        $this->travelTo(Carbon::parse('2026-11-01 00:30:00', 'Asia/Jakarta'));
        $this->get('/admin/laporan/barang-summary')->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('searched', false)
                ->where('filters.tanggal_dari', '2026-10-31')->where('filters.tanggal_sampai', '2026-10-31')
                ->where('rows', [])->where('summary', []));
        $this->get('/admin/laporan/barang-summary?search=1&tanggal_dari=2026-10-31&tanggal_sampai=2026-10-31')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('rows.total', 61)->where('botolSummary.total', 61)
                ->where('summary.Total Stok Awal ML', 7442)->where('summary.Total Stok Akhir ML', 8845));
        $this->get('/admin/laporan/barang-summary?search=1&tanggal_dari=2026-11-01&tanggal_sampai=2026-11-01')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('rows.total', 0)->where('botolSummary.total', 0)
                ->where('filters.tanggal_dari', '2026-11-01'));
        $this->get('/admin/laporan/barang-summary?tanggal_dari=2026-11-02&tanggal_sampai=2026-11-01')
            ->assertSessionHasErrors('tanggal_sampai');
        $this->travelBack();
    }

    #[DataProvider('reportTypes')]
    public function test_every_report_opens_on_the_operational_day_and_preserves_explicit_search_dates(string $type): void
    {
        $this->travelTo(Carbon::parse('2026-11-01 00:30:00', 'Asia/Jakarta'));
        DB::enableQueryLog();
        DB::flushQueryLog();
        $this->get("/admin/laporan/{$type}")->assertOk()
            ->assertInertia(function (Assert $page) use ($type): void {
                $page->where('searched', false)->where('reportAvailable', true)->where('rows', [])->where('summary', [])
                    ->where('botolStock', [])->where('botolSummary', [])->where('groups', []);
                if ($type !== 'stok') {
                    $page->where('filters.tanggal_dari', '2026-10-31')->where('filters.tanggal_sampai', '2026-10-31');
                }
            });
        $availabilityQueries = [];
        foreach (DB::getQueryLog() as $query) {
            if (preg_match('/(?:from|join) ["`](?:tt_|th_|tm_barang|tm_botol|tm_customer|tm_supplier|tm_gudang)/i', $query['query'])) {
                $availabilityQueries[] = $query['query'];
                $this->assertMatchesRegularExpression('/^select exists\s*\(/i', $query['query']);
                $this->assertDoesNotMatchRegularExpression('/\b(sum|count|max|min)\s*\(|group by|union/i', $query['query']);
            }
        }
        $this->assertNotEmpty($availabilityQueries);
        $this->assertLessThanOrEqual(3, count($availabilityQueries));
        DB::disableQueryLog();
        $this->get("/admin/laporan/{$type}?search=1")->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('rows.total', 61)->missing('filters.tanggal_dari'));
        if ($type !== 'stok') {
            $this->get("/admin/laporan/{$type}?search=1&tanggal_sampai=2026-10-31")->assertOk()
                ->assertInertia(fn (Assert $page) => $page->where('rows.total', 61)->missing('filters.tanggal_dari'));
            $this->get("/admin/laporan/{$type}?search=1&tanggal_dari=2026-11-01&tanggal_sampai=2026-11-01")->assertOk()
                ->assertInertia(fn (Assert $page) => $page->where('rows.total', 0)->where('filters.tanggal_dari', '2026-11-01'));
            foreach (['tanggal_dari=invalid', 'tanggal_dari=2026-11-02&tanggal_sampai=2026-11-01'] as $query) {
                $field = $query === 'tanggal_dari=invalid' ? 'tanggal_dari' : 'tanggal_sampai';
                $this->get("/admin/laporan/{$type}?search=1&{$query}")->assertSessionHasErrors($field);
            }
        }
        $this->travelBack();
    }

    #[DataProvider('reportTypes')]
    public function test_initial_availability_is_false_when_no_report_source_data_exists(string $type): void
    {
        foreach ([
            'tt_validasi_transaksi', 'tt_pembelian', 'tt_penjualan', 'tt_stok_gudang',
            'tm_botol_kosong', 'tt_mutasi_stok', 'tt_saldo_barang', 'th_saldo_barang',
            'tt_botol_kosong', 'tt_hutang', 'tt_piutang', 'tt_piutang_supplier', 'tt_kas_mutasi',
        ] as $table) {
            DB::table($table)->delete();
        }
        $this->get("/admin/laporan/{$type}")->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('reportAvailable', false)
                ->where('searched', false)->where('rows', [])->where('summary', [])
                ->where('botolStock', [])->where('botolSummary', [])->where('groups', []));
    }

    public function test_availability_checks_the_initial_period_and_validation_filters(): void
    {
        $this->get('/admin/laporan/validasi-transaksi?status=PENDING')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('reportAvailable', true));
        DB::table('tt_validasi_transaksi')->where('status', 'PENDING')->delete();
        $this->get('/admin/laporan/validasi-transaksi?status=PENDING')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('reportAvailable', false));
        $this->get('/admin/laporan/validasi-transaksi?status=APPROVED')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('reportAvailable', true));
        foreach (self::reportTypes() as [$type]) {
            if ($type === 'stok') {
                $url = '/admin/laporan/stok?barcode=NOT-FOUND';
            } else {
                $url = "/admin/laporan/{$type}?tanggal_dari=2026-11-01&tanggal_sampai=2026-11-01";
            }

            $this->get($url)->assertOk()
                ->assertInertia(fn (Assert $page) => $page->where('reportAvailable', false)->where('rows', []));
        }
    }

    public function test_gross_profit_uses_only_supported_filters_and_preserves_daily_totals(): void
    {
        DB::table('tt_penjualan')->where('id', 1)->update(['total_penjualan' => 500, 'total_modal' => 300, 'laba_kotor' => 200, 'discount' => 50, 'status_pembayaran' => 'BELUM_LUNAS', 'tipe_penjualan' => 'GROSIR']);
        $query = 'tanggal_dari=2026-10-31&tanggal_sampai=2026-10-31&id_gudang=1&tipe_penjualan=GROSIR&id_customer=999&id_barang=999&id_botol=999&jenis_barang=BOTOL&status=LUNAS&tipe_gudang=BOTOL';
        $this->get('/admin/laporan/laba-kotor?'.$query)->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('reportAvailable', true)
                ->missing('filters.id_customer')->missing('filters.status')->missing('refs.customer')->missing('refs.barang'));
        $this->get('/admin/laporan/laba-kotor?search=1&'.$query)->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('rows.total', 1)
                ->where('summary.Total Penjualan', 500)->where('summary.Modal', 300)->where('summary.Laba Kotor', 200));
        $response = $this->get('/admin/laporan/laba-kotor?search=1&export=excel&'.$query)->assertOk();
        $values = array_merge(...IOFactory::load($response->baseResponse->getFile()->getPathname())->getActiveSheet()->toArray());
        foreach (['Tanggal', 'Penjualan Setelah Diskon', 'Modal Barang (HPP)', 'Laba Kotor', 'PJL-001'] as $expected) {
            $this->assertContains($expected, $values);
        }
        $this->assertNotContains('PJL-002', $values);
        $this->get('/admin/laporan/laba-kotor?search=1&id_gudang=abc')->assertSessionHasErrors('id_gudang');
        $this->get('/admin/laporan/laba-kotor?search=1&tipe_penjualan=INVALID')->assertSessionHasErrors('tipe_penjualan');
        $this->getJson('/admin/laporan/laba-kotor?options=customer&search=test')->assertUnprocessable();
    }

    public function test_warehouse_options_open_bounded_and_search_by_code_then_filter_gross_profit(): void
    {
        for ($id = 2; $id <= 31; $id++) {
            DB::table('tm_gudang')->insert(['id' => $id, 'kode_gudang' => 'GDG-'.str_pad((string) $id, 3, '0', STR_PAD_LEFT), 'nama_gudang' => 'Gudang '.$id]);
        }
        $this->getJson('/admin/laporan/laba-kotor?options=gudang')->assertOk()
            ->assertJsonCount(25, 'data')->assertJsonPath('has_more', true);
        $this->getJson('/admin/laporan/laba-kotor?options=gudang&search=GDG-031')->assertOk()
            ->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', 31)->assertJsonPath('has_more', false);
        DB::table('tt_penjualan')->where('id', 1)->update(['id_gudang' => 31]);
        $this->get('/admin/laporan/laba-kotor?search=1&id_gudang=31')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('rows.total', 1)
                ->where('summary.Laba Kotor', 100)->where('refs.gudang.0.id', 31));
        $this->get('/admin/laporan/laba-kotor?search=1&id_gudang=1')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('rows.total', 60)->where('summary.Laba Kotor', 6000));
    }

    public function test_availability_includes_bottle_only_reports_and_history_without_active_balances(): void
    {
        DB::table('tt_stok_gudang')->delete();
        $this->get('/admin/laporan/stok')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('reportAvailable', true)->where('rows', []));
        $this->get('/admin/laporan/stok?jenis_barang=BIBIT')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('reportAvailable', false));

        DB::table('tt_saldo_barang')->delete();
        $this->get('/admin/laporan/barang-summary?jenis_barang=BOTOL')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('reportAvailable', true)->where('botolSummary', []));
        $this->get('/admin/laporan/barang-summary?jenis_barang=BIBIT')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('reportAvailable', false));
        $this->get('/admin/laporan/barang-summary?jenis_barang=BIBIT&tanggal_dari=2026-10-29&tanggal_sampai=2026-10-30')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('reportAvailable', true)->where('rows', []));
    }

    public function test_report_master_search_is_bounded_and_does_not_load_report_rows(): void
    {
        foreach (['barang', 'botol_kosong', 'customer', 'supplier'] as $resource) {
            $type = in_array($resource, ['customer', 'supplier'], true) ? ($resource === 'customer' ? 'piutang' : 'hutang') : 'stok';
            $this->getJson("/admin/laporan/{$type}?options={$resource}&search=0")->assertOk()
                ->assertJsonCount(25, 'data')->assertJsonPath('has_more', true)->assertJsonMissingPath('rows');
            $term = match ($resource) {
                'barang' => 'BRG-061', 'botol_kosong' => 'BTK-061', default => '061'
            };
            $this->getJson("/admin/laporan/{$type}?options={$resource}&search={$term}")->assertOk()
                ->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', 61)->assertJsonPath('has_more', false);
            $this->getJson("/admin/laporan/{$type}?options={$resource}&search=NO-MATCH")->assertOk()->assertJsonCount(0, 'data');
        }
        $this->getJson('/admin/laporan/stok?options=botol&search=100')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson('/admin/laporan/stok?options=gudang&search=Gudang&tipe_gudang=BOTOL')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/admin/laporan/stok?options=gudang&search=Gudang&tipe_gudang=BIBIT')->assertOk()->assertJsonCount(1, 'data');
        DB::table('tm_barang_bibit')->where('id', 61)->update(['status' => 'NONAKTIF']);
        $this->getJson('/admin/laporan/stok?options=barang&search=BRG-061')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/admin/laporan/kas?options=customer&search=test')->assertUnprocessable();
        $this->getJson('/admin/laporan/stok?options=barang&search[]=test')->assertUnprocessable();
        $this->get('/admin/laporan/stok?id_barang=61')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->has('refs.barang', 1)->where('refs.barang.0.id', 61)
                ->where('refs.gudang', [])->where('refs.botol', [])->where('rows', []));
        $user = User::query()->firstOrFail();
        $user->update(['role' => 'admin', 'akses_menu' => ['laporan-kas']]);
        $this->actingAs($user)->getJson('/admin/laporan/stok?options=barang&search=test')->assertForbidden();
    }

    #[DataProvider('reportTypes')]
    public function test_pdf_exports_render_for_every_report_and_empty_period(string $type): void
    {
        $this->get("/admin/laporan/{$type}?search=1&page=2&export=pdf")->assertOk()
            ->assertHeader('content-type', 'application/pdf');
        $this->get("/admin/laporan/{$type}?search=1&tanggal_dari=2026-11-01&tanggal_sampai=2026-11-01&export=pdf")
            ->assertOk()->assertHeader('content-type', 'application/pdf');
    }

    public function test_secondary_tables_have_independent_server_pages_and_global_bottle_totals(): void
    {
        $this->get('/admin/laporan/stok?search=1&page=2&botol_page=3')->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('rows.current_page', 2)
                ->has('botolStock.data', 10)->where('botolStock.total', 61)
                ->where('botolStock.current_page', 3)->where('botolStock.data.0.kode_botol', 'BTK-021')
                ->where('botolStockTotal', 915)
                ->where('botolStock.next_page_url', fn ($url) => str_contains($url, 'botol_page=4') && str_contains($url, 'page=2'))
            );
        $this->get('/admin/laporan/barang-summary?search=1&page=2&botol_page=3')->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('rows.data', 10)->has('botolSummary.data', 10)
                ->where('botolSummary.total', 61)->where('botolSummary.current_page', 3)
                ->where('botolSummary.data.0.stok_awal', 10)
                ->where('botolSummary.data.0.total_masuk', 6)
                ->where('botolSummary.data.0.total_keluar', 1)
                ->where('botolSummary.data.0.stok_akhir', 15)
                ->where('botolSummary.data.0.total_mutasi', 3)
            );
        foreach (['piutang', 'piutang-supplier'] as $type) {
            $this->get("/admin/laporan/{$type}?search=1&page=2&groups_page=3")->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->where('rows.current_page', 2)->has('groups.data', 10)
                    ->where('groups.current_page', 3)->where('groups.total', 61)
                    ->where('groups.data.0.total', 400)->where('groups.data.0.sisa', 300)
                );
        }
    }

    public function test_filters_apply_before_counts_summaries_and_secondary_pagination(): void
    {
        foreach (['stok', 'mutasi-stok', 'barang-summary'] as $type) {
            $this->get("/admin/laporan/{$type}?search=1&barcode=brg-021&id_barang=21&id_gudang=1")->assertOk()
                ->assertInertia(fn (Assert $page) => $page->has('rows.data', 1)->where('rows.total', 1));
            $this->get("/admin/laporan/{$type}?search=1&barcode=NO-MATCH")->assertOk()
                ->assertInertia(fn (Assert $page) => $page->has('rows.data', 0)->where('rows.total', 0)
                    ->where('summary', fn ($summary) => collect($summary)->every(fn ($value) => $value == 0)));
        }
        $this->get('/admin/laporan/barang-summary?search=1&barcode=brg-021&tanggal_dari=2026-10-30&tanggal_sampai=2026-10-31')->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('rows.data.0.stok_awal_ml', '107.00')->where('rows.data.0.stok_akhir_ml', '145.00')
                ->where('rows.data.0.total_masuk_ml', 50)->where('rows.data.0.total_keluar_ml', 12)
                ->where('summary.Total Stok Awal ML', 107)->where('summary.Total Stok Akhir ML', 145)
            );
        $this->get('/admin/laporan/stok?search=1&barcode=btk-021')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->has('rows.data', 0)
                ->has('botolStock.data', 1)->where('botolStock.total', 1)->where('botolStockTotal', 15));
        $this->get('/admin/laporan/piutang?search=1&id_customer=21')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('rows.total', 1)->where('groups.total', 1)->where('summary.Total Piutang', 400));
        $this->get('/admin/laporan/validasi-transaksi?search=1&status=PENDING')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('rows.total', 21)
                ->where('summary.Pengajuan Menunggu', 21)->where('summary.Pengajuan Disetujui', 0)->where('summary.Pengajuan Ditolak', 0));
    }

    public function test_null_bottle_variants_and_last_non_null_mutation_dates_are_preserved(): void
    {
        foreach (['tt_saldo_barang', 'th_saldo_barang', 'tt_stok_gudang'] as $table) {
            DB::table($table)->where('id_barang', 1)->update(['id_botol' => null]);
        }
        DB::table('tt_saldo_barang')->where('id_barang', 1)->update(['terakhir_mutasi' => null]);
        $this->get('/admin/laporan/barang-summary?search=1&barcode=brg-001')->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('rows.data.0.stok_awal_ml', '100.00')->where('rows.data.0.stok_akhir_ml', '145.00')
                ->where('rows.data.0.total_masuk_ml', 60)->where('rows.data.0.terakhir_mutasi', '2026-10-30T00:00:00.000000Z')
            );
        $this->get('/admin/laporan/stok?search=1&barcode=brg-001')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('rows.data.0.stok_botol_isi', 2)->where('summary.Total Perkiraan Botol Isi', 2));
    }

    public function test_page_sizes_and_page_numbers_are_validated(): void
    {
        foreach (['per_page=1000' => 'per_page', 'per_page[]=10' => 'per_page', 'page=0' => 'page', 'botol_page=-1' => 'botol_page', 'groups_page=abc' => 'groups_page'] as $query => $field) {
            $this->get('/admin/laporan/kas?search=1&'.$query)->assertSessionHasErrors($field);
        }
    }

    public function test_stock_totals_round_up_per_item_instead_of_rounding_the_combined_volume(): void
    {
        foreach ([0 => 0, 1 => 1, 99 => 1, 100 => 1, 101 => 2, 149 => 2, 150 => 2, 199 => 2, 200 => 2, 201 => 3] as $volume => $bottles) {
            DB::table('tt_stok_gudang')->where('id', 1)->update(['stok_ml' => $volume]);
            $this->get('/admin/laporan/stok?search=1&barcode=BRG-001')->assertOk()
                ->assertInertia(fn (Assert $page) => $page->where('rows.data.0.stok_botol_isi', $bottles)
                    ->where('summary.Total Perkiraan Botol Isi', $bottles));
        }
        DB::table('tt_stok_gudang')->where('id', 1)->update(['stok_ml' => 0.01]);
        $this->get('/admin/laporan/stok?search=1&barcode=BRG-001')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('summary.Total Perkiraan Botol Isi', 1));
        DB::table('tm_botol')->insert(['id' => 2, 'kode_botol' => 'BTL-030', 'nama_botol' => '30 ML', 'varian_ml' => 30]);
        DB::table('tt_stok_gudang')->where('id', 1)->update(['stok_ml' => 145, 'id_botol' => 2]);
        $this->get('/admin/laporan/stok?search=1&barcode=BRG-001')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('rows.data.0.stok_botol_isi', 5)->where('summary.Total Perkiraan Botol Isi', 5));
        DB::table('tm_botol')->where('id', 2)->update(['varian_ml' => 0]);
        $this->get('/admin/laporan/stok?search=1&barcode=BRG-001')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('summary.Total Perkiraan Botol Isi', 0));
    }

    public function test_customer_recap_aggregates_all_matching_invoices(): void
    {
        DB::table('tt_piutang')->insert(['tanggal' => '2026-10-31', 'no_piutang' => 'PTG-062',
            'id_customer' => 21, 'total_piutang' => 700, 'sisa_piutang' => 500]);
        $this->get('/admin/laporan/piutang?search=1&id_customer=21')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('rows.total', 2)->where('groups.total', 1)
                ->where('groups.data.0.pihak', 'CUSTOMER 021')->where('groups.data.0.total', 1100)
                ->where('groups.data.0.sisa', 800)->where('summary.Total Piutang', 1100));
        $this->get('/admin/laporan/kas?search=1&tanggal_dari=2026-10-30&tanggal_sampai=2026-10-30&page=2')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('rows.total', 30)
                ->where('summary.Saldo Awal', 505)->where('summary.Saldo Akhir', 800)
                ->where('summary.Kas Masuk', 300)->where('summary.Kas Keluar', 150));
    }

    public function test_bottle_summary_preserves_chronological_boundaries_and_same_day_id_order(): void
    {
        DB::table('tt_botol_kosong')->insert(['tanggal' => '2026-10-31', 'id_gudang' => 1, 'id_botol_kosong' => 21,
            'tipe_mutasi' => 'KELUAR', 'qty_botol' => 12, 'stok_awal' => 15, 'stok_akhir' => 3]);
        $this->get('/admin/laporan/barang-summary?search=1&barcode=BTK-021&tanggal_dari=2026-10-31&tanggal_sampai=2026-10-31')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('botolSummary.total', 1)
                ->where('botolSummary.data.0.stok_awal', 11)->where('botolSummary.data.0.stok_akhir', 3)
                ->where('botolSummary.data.0.total_masuk', 4)->where('botolSummary.data.0.total_keluar', 12)
                ->where('botolSummary.data.0.total_mutasi', 2));
    }

    #[DataProvider('reportTypes')]
    public function test_excel_export_includes_all_filtered_rows_not_only_the_current_page(string $type): void
    {
        $response = $this->get("/admin/laporan/{$type}?search=1&page=2&botol_page=3&groups_page=3&per_page=10&export=excel")->assertOk();
        $values = array_merge(...IOFactory::load($response->baseResponse->getFile()->getPathname())->getActiveSheet()->toArray());
        [$first, $last] = match ($type) {
            'validasi-transaksi' => ['VLD-000001', 'VLD-000061'],
            'pembelian' => ['PBL-001', 'PBL-061'],
            'penjualan', 'laba-kotor' => ['PJL-001', 'PJL-061'],
            'stok', 'barang-summary', 'mutasi-stok' => ['BRG-001', 'BRG-061'],
            'hutang' => ['HTG-001', 'HTG-061'],
            'piutang', 'piutang-supplier' => ['PTG-001', 'PTG-061'],
            'kas' => ['KAS-001', 'KAS-061'],
        };
        $this->assertContains($first, $values);
        $this->assertContains($last, $values);
        if (in_array($type, ['stok', 'barang-summary'], true)) {
            $this->assertContains('BTK-001', $values);
            $this->assertContains('BTK-061', $values);
        }
    }

    private function createSchema(): void
    {
        Schema::create('tm_users', function (Blueprint $table): void {
            $table->id();
            foreach (['username', 'name', 'password', 'role'] as $column) {
                $table->string($column);
            }
            $table->json('akses_menu')->nullable();
            $table->timestamps();
        });
        Schema::create('tp_system', function (Blueprint $table): void {
            $table->id();
            $table->date('tanggal_system');
            $table->timestamps();
        });
        DB::table('tp_system')->insert(['id' => 1, 'tanggal_system' => '2026-10-31']);
        foreach (['supplier', 'customer', 'gudang', 'botol', 'botol_kosong', 'barang_bibit', 'brand'] as $master) {
            Schema::create('tm_'.$master, function (Blueprint $table) use ($master): void {
                $table->id();
                $name = match ($master) {
                    'barang_bibit' => 'barang', 'botol_kosong' => 'botol', default => $master
                };
                $table->string('nama_'.$name);
                $table->string('kode_'.$name);
                $table->string('status')->default('AKTIF');
                if ($master === 'customer') {
                    $table->string('tipe_customer')->default('RETAIL');
                }
                if ($master === 'gudang') {
                    $table->string('tipe_gudang')->default('BIBIT');
                }
                if ($master === 'botol') {
                    $table->decimal('varian_ml', 15, 2)->default(100);
                }
                if ($master === 'barang_bibit') {
                    $table->unsignedBigInteger('id_botol')->nullable();
                    $table->unsignedBigInteger('id_brand')->nullable();
                    $table->string('jenis_barang')->default('BIBIT');
                }
                if ($master === 'botol_kosong') {
                    $table->unsignedBigInteger('id_gudang');
                    $table->decimal('stock', 15, 2)->default(0);
                }
                $table->timestamps();
            });
        }
        foreach (['pembelian', 'penjualan'] as $trade) {
            Schema::create('tt_'.$trade, function (Blueprint $table) use ($trade): void {
                $table->id();
                $table->date('tanggal');
                $table->string('no_'.$trade);
                $table->unsignedBigInteger('id_gudang');
                $table->unsignedBigInteger($trade === 'pembelian' ? 'id_supplier' : 'id_customer');
                $table->string('status_pembayaran')->default('LUNAS');
                foreach (['total_'.$trade, 'discount', 'total_qty_ml', 'total_qty_botol'] as $column) {
                    $table->decimal($column, 15, 2)->default(0);
                }
                if ($trade === 'penjualan') {
                    $table->unsignedBigInteger('id_sales')->nullable();
                    $table->string('tipe_penjualan')->default('RETAIL');
                    $table->decimal('total_modal', 15, 2)->default(0);
                    $table->decimal('laba_kotor', 15, 2)->default(0);
                }
                $table->timestamps();
            });
            Schema::create('tt_'.$trade.'_detail', function (Blueprint $table) use ($trade): void {
                $table->id();
                $table->unsignedBigInteger('id_'.$trade);
                foreach (['id_barang', 'id_botol', 'item_id'] as $column) {
                    $table->unsignedBigInteger($column)->nullable();
                }
                $table->string('tipe_item')->default('BIBIT');
                $table->string('nama_item');
                $table->string('satuan_input')->default('ML');
                $table->decimal('qty_input', 15, 2)->default(1);
            });
        }
        foreach (['hutang', 'piutang', 'piutang_supplier'] as $finance) {
            Schema::create('tt_'.$finance, function (Blueprint $table) use ($finance): void {
                $table->id();
                $table->date('tanggal');
                $name = $finance === 'hutang' ? 'hutang' : 'piutang';
                $table->string('no_'.$finance);
                $table->unsignedBigInteger($finance === 'piutang' ? 'id_customer' : 'id_supplier');
                $table->string('status_'.$name)->default('OPEN');
                $table->decimal('total_'.$name, 15, 2);
                $table->decimal('sisa_'.$name, 15, 2);
                $table->timestamps();
            });
        }
        Schema::create('tt_stok_gudang', function (Blueprint $table): void {
            $table->id();
            foreach (['id_gudang', 'id_barang', 'id_botol'] as $column) {
                $table->unsignedBigInteger($column)->nullable();
            }
            $table->decimal('stok_ml', 15, 2);
            $table->decimal('minimum_stok_ml', 15, 2)->default(0);
        });
        foreach (['tt_saldo_barang', 'th_saldo_barang'] as $name) {
            Schema::create($name, function (Blueprint $table): void {
                $table->id();
                $table->date('tanggal');
                foreach (['id_gudang', 'id_barang', 'id_botol'] as $column) {
                    $table->unsignedBigInteger($column)->nullable();
                }
                foreach (['stok_awal_ml', 'masuk_ml', 'keluar_ml', 'stok_akhir_ml', 'minimum_stok_ml'] as $column) {
                    $table->decimal($column, 15, 2);
                }
                $table->unsignedInteger('total_mutasi')->default(2);
                $table->date('terakhir_mutasi')->nullable();
            });
        }
        Schema::create('tt_mutasi_stok', function (Blueprint $table): void {
            $table->id();
            $table->date('tanggal');
            foreach (['id_gudang', 'id_barang', 'id_botol'] as $column) {
                $table->unsignedBigInteger($column);
            }
            $table->string('tipe_mutasi')->default('MASUK');
            $table->string('no_transaksi');
            $table->decimal('qty_ml', 15, 2);
        });
        Schema::create('tt_botol_kosong', function (Blueprint $table): void {
            $table->id();
            $table->date('tanggal');
            $table->unsignedBigInteger('id_gudang');
            $table->unsignedBigInteger('id_botol_kosong');
            $table->string('tipe_mutasi');
            foreach (['qty_botol', 'stok_awal', 'stok_akhir'] as $column) {
                $table->decimal($column, 15, 2);
            }
        });
        Schema::create('tt_kas_mutasi', function (Blueprint $table): void {
            $table->id();
            $table->date('tanggal');
            $table->string('no_transaksi');
            $table->string('jenis_transaksi')->default('MASUK');
            foreach (['kas_masuk', 'kas_keluar', 'saldo_akhir'] as $column) {
                $table->decimal($column, 15, 2);
            }
        });
        Schema::create('tt_validasi_transaksi', function (Blueprint $table): void {
            $table->id();
            $table->date('operational_date');
            $table->string('type')->default('kas');
            $table->string('status');
            $table->json('snapshot');
            $table->string('submitted_by_name')->default('Report Test');
            $table->timestamps();
        });
    }

    private function seedReports(): void
    {
        DB::table('tm_gudang')->insert(['id' => 1, 'kode_gudang' => 'GDG-001', 'nama_gudang' => 'Gudang']);
        DB::table('tm_botol')->insert(['id' => 1, 'kode_botol' => 'BTL-001', 'nama_botol' => '100 ML', 'varian_ml' => 100]);
        for ($id = 1; $id <= 61; $id++) {
            $code = str_pad((string) $id, 3, '0', STR_PAD_LEFT);
            foreach (['supplier', 'customer'] as $master) {
                DB::table('tm_'.$master)->insert(['id' => $id, 'kode_'.$master => $code, 'nama_'.$master => ucfirst($master).' '.$code]);
            }
            DB::table('tm_barang_bibit')->insert(['id' => $id, 'kode_barang' => 'BRG-'.$code, 'nama_barang' => 'Barang '.$code, 'id_botol' => 1]);
            DB::table('tm_botol_kosong')->insert(['id' => $id, 'kode_botol' => 'BTK-'.$code, 'nama_botol' => 'Botol '.$code, 'id_gudang' => 1, 'stock' => 15]);
            foreach (['pembelian' => 100, 'penjualan' => 200] as $trade => $amount) {
                $row = ['id' => $id, 'tanggal' => '2026-10-31', 'no_'.$trade => ($trade === 'pembelian' ? 'PBL-' : 'PJL-').$code,
                    'id_gudang' => 1, ($trade === 'pembelian' ? 'id_supplier' : 'id_customer') => $id, 'total_'.$trade => $amount];
                if ($trade === 'penjualan') {
                    $row += ['total_modal' => 100, 'laba_kotor' => 100];
                }
                DB::table('tt_'.$trade)->insert($row);
                DB::table('tt_'.$trade.'_detail')->insert(['id_'.$trade => $id, 'id_barang' => $id, 'nama_item' => 'Barang '.$code]);
            }
            foreach (['hutang', 'piutang', 'piutang_supplier'] as $finance) {
                $name = $finance === 'hutang' ? 'hutang' : 'piutang';
                DB::table('tt_'.$finance)->insert(['id' => $id, 'tanggal' => '2026-10-31', 'no_'.$finance => ($name === 'hutang' ? 'HTG-' : 'PTG-').$code,
                    ($finance === 'piutang' ? 'id_customer' : 'id_supplier') => $id, 'total_'.$name => $name === 'hutang' ? 300 : 400, 'sisa_'.$name => $name === 'hutang' ? 200 : 300]);
            }
            DB::table('tt_stok_gudang')->insert(['id' => $id, 'id_gudang' => 1, 'id_barang' => $id, 'id_botol' => 1, 'stok_ml' => 145]);
            foreach (['2026-10-29' => [100, 10, 3, 107], '2026-10-30' => [107, 20, 5, 122], '2026-10-31' => [122, 30, 7, 145]] as $date => [$start, $in, $out, $end]) {
                DB::table($date === '2026-10-31' ? 'tt_saldo_barang' : 'th_saldo_barang')->insert([
                    'tanggal' => $date, 'id_gudang' => 1, 'id_barang' => $id, 'id_botol' => 1,
                    'stok_awal_ml' => $start, 'masuk_ml' => $in, 'keluar_ml' => $out, 'stok_akhir_ml' => $end, 'minimum_stok_ml' => 7, 'terakhir_mutasi' => $date,
                ]);
            }
            DB::table('tt_mutasi_stok')->insert(['id' => $id, 'tanggal' => '2026-10-31', 'id_gudang' => 1, 'id_barang' => $id, 'id_botol' => 1, 'no_transaksi' => 'MTS-'.$code, 'qty_ml' => 3]);
            foreach (['2026-10-29' => ['MASUK', 2, 10, 12], '2026-10-30' => ['KELUAR', 1, 12, 11], '2026-10-31' => ['MASUK', 4, 11, 15]] as $date => [$direction, $qty, $start, $end]) {
                DB::table('tt_botol_kosong')->insert(['tanggal' => $date, 'id_gudang' => 1, 'id_botol_kosong' => $id,
                    'tipe_mutasi' => $direction, 'qty_botol' => $qty, 'stok_awal' => $start, 'stok_akhir' => $end]);
            }
            DB::table('tt_kas_mutasi')->insert(['id' => $id, 'tanggal' => $id % 2 ? '2026-10-31' : '2026-10-30',
                'no_transaksi' => 'KAS-'.$code, 'kas_masuk' => 10, 'kas_keluar' => 5, 'saldo_akhir' => 500 + $id * 5]);
            DB::table('tt_validasi_transaksi')->insert(['id' => $id, 'operational_date' => '2026-10-31',
                'status' => ['PENDING', 'APPROVED', 'REJECTED'][($id - 1) % 3],
                'snapshot' => json_encode(['label' => 'Kas', 'party' => 'Pihak '.$code, 'items' => [], 'amount' => 10])]);
        }
    }
}
