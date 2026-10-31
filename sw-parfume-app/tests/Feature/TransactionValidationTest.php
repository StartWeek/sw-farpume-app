<?php

namespace Tests\Feature;

use App\Models\Business\KasMutasi;
use App\Models\Business\PiutangSupplier;
use App\Models\Business\SystemDate;
use App\Models\Business\TransactionValidation;
use App\Models\User;
use App\Services\Business\BusinessService;
use App\Services\Business\TransactionValidationService;
use App\Services\SettingsService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Testing\AssertableInertia;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Tests\TestCase;

class TransactionValidationTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        Schema::create('tm_users', function (Blueprint $table): void {
            $table->id();
            $table->string('username');
            $table->string('name');
            $table->string('password');
            $table->string('role');
            $table->json('akses_menu')->nullable();
            $table->timestamps();
        });
        Schema::create('tp_system', function (Blueprint $table): void {
            $table->id();
            $table->date('tanggal_system');
            $table->timestamps();
        });
        Schema::create('tt_kas_mutasi', function (Blueprint $table): void {
            $table->id();
            $table->date('tanggal');
            foreach (['no_transaksi', 'jenis_transaksi', 'sumber_transaksi', 'pihak', 'keterangan', 'created_by'] as $column) {
                $table->string($column)->nullable();
            }
            foreach (['kas_masuk', 'kas_keluar', 'saldo_akhir'] as $column) {
                $table->decimal($column, 15, 2)->default(0);
            }
            $table->timestamps();
        });
        if (! Schema::hasTable('tt_validasi_transaksi')) {
            Schema::create('tt_validasi_transaksi', function (Blueprint $table): void {
                $table->id();
                $table->uuid('submission_key')->unique();
                $table->string('payload_hash', 64);
                $table->string('type', 50);
                $table->string('status')->default('PENDING');
                $table->date('operational_date');
                $table->json('payload');
                $table->json('snapshot');
                $table->unsignedBigInteger('submitted_by_id');
                $table->string('submitted_by_name');
                $table->unsignedBigInteger('reviewed_by_id')->nullable();
                $table->string('reviewed_by_name')->nullable();
                $table->text('rejection_reason')->nullable();
                $table->json('result')->nullable();
                $table->timestamp('reviewed_at')->nullable();
                $table->timestamps();
            });
        }
        SystemDate::query()->create(['id' => 1, 'tanggal_system' => today()->toDateString()]);
        $this->user = User::query()->create(['username' => 'cashier', 'name' => 'Kasir', 'password' => 'test-password', 'role' => 'staff', 'akses_menu' => ['kas']]);
        $this->actingAs($this->user);
        $this->withoutMiddleware(ValidateCsrfToken::class);
        $this->mock(SettingsService::class, function ($mock): void {
            $mock->shouldReceive('get')->andReturn(['store_name' => 'TOKO TEST']);
        });
    }

    public function test_pdf_proof_has_status_and_is_available_only_to_authorized_users(): void
    {
        $service = app(TransactionValidationService::class);
        $entry = $service->submit('kas', $this->payload(), $this->user, (string) Str::uuid());
        $this->get("/admin/validasi-transaksi/{$entry->id}/pdf")->assertOk()->assertHeader('content-type', 'application/pdf');
        $this->assertStringContainsString('Menunggu Validasi', view('exports.validation_receipt', ['validation' => $entry, 'settings' => []])->render());
        $this->user->update(['akses_menu' => ['laporan-stok']]);
        $this->get("/admin/validasi-transaksi/{$entry->id}/pdf")->assertForbidden();
        $this->user->update(['akses_menu' => ['laporan-validasi-transaksi']]);
        $this->get("/admin/validasi-transaksi/{$entry->id}/pdf")->assertOk();
        $this->post("/admin/validasi-transaksi/{$entry->id}/setujui")->assertForbidden();
    }

    public function test_pending_trade_proof_matches_tempo_and_clamps_planned_down_payment(): void
    {
        $entry = new TransactionValidation([
            'type' => 'pembelian', 'status' => 'PENDING', 'operational_date' => today(),
            'submitted_by_name' => 'Kasir',
            'snapshot' => ['label' => 'Pembelian Supplier', 'amount' => 100, 'down_payment' => 200, 'payment_method' => 'TEMPO', 'items' => []],
        ]);
        $entry->forceFill(['id' => 1]);
        $html = view('exports.validation_receipt', ['validation' => $entry, 'settings' => []])->render();
        $this->assertMatchesRegularExpression('/Rencana pembayaran<\/td><td class="right">Rp 0<\/td>/', $html);
        $entry->snapshot = [...$entry->snapshot, 'payment_method' => 'DP'];
        $html = view('exports.validation_receipt', ['validation' => $entry, 'settings' => []])->render();
        $this->assertMatchesRegularExpression('/Rencana pembayaran<\/td><td class="right">Rp 100<\/td>/', $html);
    }

    public function test_purchase_pdf_does_not_allow_unrelated_restricted_users(): void
    {
        $this->user->update(['akses_menu' => ['dashboard']]);
        $this->get('/admin/pembelian/1/pdf')->assertForbidden();
        $this->get('/admin/keuangan-nota/hutang/1/pdf')->assertForbidden();
    }

    public function test_validation_report_includes_pending_and_rejected_without_posting_them(): void
    {
        $service = app(TransactionValidationService::class);
        $pending = $service->submit('kas', $this->payload(), $this->user, (string) Str::uuid());
        $rejected = $service->submit('kas', [...$this->payload(), 'jumlah' => 5000], $this->user, (string) Str::uuid());
        $service->reject($rejected->id, $this->user, 'Nominal salah');
        $this->user->update(['akses_menu' => ['laporan-validasi-transaksi']]);
        $this->get('/admin/laporan/validasi-transaksi?search=1&status=PENDING&validation_type=kas')
            ->assertOk()->assertInertia(fn (AssertableInertia $page) => $page
            ->component('admin/business/ReportPage', false)->where('type', 'validasi-transaksi')
            ->has('rows.data', 1)->where('rows.data.0.id', $pending->id)
            ->where('summary.Pengajuan Menunggu', 1));
        foreach (['portrait', 'landscape'] as $orientation) {
            $this->get('/admin/laporan/validasi-transaksi?search=1&status=REJECTED&export=pdf&orientation='.$orientation)->assertOk()->assertHeader('content-type', 'application/pdf');
        }
        $this->get('/admin/laporan/validasi-transaksi?search=1&status=REJECTED&export=excel')->assertOk();
        $this->assertDatabaseCount('tt_kas_mutasi', 0);
    }

    public function test_validation_excel_keeps_user_notes_as_text_instead_of_formulas(): void
    {
        $service = app(TransactionValidationService::class);
        $entry = $service->submit('kas', $this->payload(), $this->user, (string) Str::uuid());
        $service->reject($entry->id, $this->user, '=1+1');
        $this->user->update(['akses_menu' => ['laporan-validasi-transaksi']]);
        $response = $this->get('/admin/laporan/validasi-transaksi?search=1&export=excel')->assertOk();
        $sheet = IOFactory::load($response->baseResponse->getFile()->getPathname())->getActiveSheet();
        $found = false;
        foreach ($sheet->getRowIterator() as $row) {
            foreach ($row->getCellIterator() as $cell) {
                if ($cell->getValue() === '=1+1') {
                    $found = true;
                    $this->assertSame(DataType::TYPE_STRING, $cell->getDataType());
                }
            }
        }
        $this->assertTrue($found, 'The rejection note should be present as plain text.');
    }

    private function payload(): array
    {
        return ['jenis_transaksi' => 'MASUK', 'jumlah' => 25000, 'pihak' => 'TOKO', 'keterangan' => 'KAS AWAL'];
    }

    public function test_bulk_approval_reports_success_and_failure_without_double_posting(): void
    {
        $service = app(TransactionValidationService::class);
        $first = $service->submit('kas', $this->payload(), $this->user, (string) Str::uuid());
        $second = $service->submit('kas', $this->payload(), $this->user, (string) Str::uuid());
        $third = $service->submit('kas', $this->payload(), $this->user, (string) Str::uuid());
        $service->reject($second->id, $this->user, 'Tidak sesuai');

        $this->post('/admin/validasi-transaksi/setujui-terpilih', [
            'ids' => [$third->id, $second->id, $first->id],
        ])->assertSessionHasNoErrors()->assertSessionHas('bulkValidationResult', function (array $result) use ($first, $second, $third): bool {
            return array_column($result['approved'], 'id') === [$first->id, $third->id]
                && array_column($result['failed'], 'id') === [$second->id]
                && str_contains($result['failed'][0]['reason'], 'sudah diproses');
        });
        $this->assertDatabaseCount('tt_kas_mutasi', 2);
        $this->assertSame('APPROVED', $first->fresh()->status);
        $this->assertSame('REJECTED', $second->fresh()->status);
        $this->assertSame('APPROVED', $third->fresh()->status);

        $this->post('/admin/validasi-transaksi/setujui-terpilih', [
            'ids' => [$first->id, $third->id],
        ])->assertSessionHas('bulkValidationResult', fn (array $result): bool => count($result['approved']) === 0 && count($result['failed']) === 2);
        $this->assertDatabaseCount('tt_kas_mutasi', 2);
    }

    public function test_bulk_approval_rejects_invalid_selection_and_unauthorized_transactions(): void
    {
        $service = app(TransactionValidationService::class);
        $entry = $service->submit('kas', $this->payload(), $this->user, (string) Str::uuid());
        foreach ([[], [$entry->id, $entry->id], range(1, 51)] as $ids) {
            $this->post('/admin/validasi-transaksi/setujui-terpilih', ['ids' => $ids])->assertSessionHasErrors();
        }
        $this->user->update(['akses_menu' => ['laporan-validasi-transaksi']]);
        $this->post('/admin/validasi-transaksi/setujui-terpilih', ['ids' => [$entry->id]])->assertForbidden();
        $this->assertSame('PENDING', $entry->fresh()->status);
        $this->assertDatabaseCount('tt_kas_mutasi', 0);
    }

    public function test_bulk_sale_approval_keeps_insufficient_stock_request_pending(): void
    {
        $this->createTradingSchema();
        DB::table('tt_stok_gudang')->insert(['id_gudang' => 2, 'id_barang' => 1, 'id_botol' => 1, 'stok_ml' => 150]);
        $service = app(TransactionValidationService::class);
        $payload = [
            'id_customer' => 1, 'id_gudang' => 2, 'tipe_penjualan' => 'RETAIL', 'metode_pembayaran' => 'CASH',
            'items' => [['tipe_item' => 'BIBIT', 'item_id' => 1, 'qty_input' => 100, 'satuan_input' => 'ML']],
        ];
        $first = $service->submit('penjualan-retail', $payload, $this->user, (string) Str::uuid());
        $second = $service->submit('penjualan-retail', $payload, $this->user, (string) Str::uuid());
        $this->post('/admin/validasi-transaksi/setujui-terpilih', ['ids' => [$second->id, $first->id]])
            ->assertSessionHasNoErrors()->assertSessionHas('bulkValidationResult', fn (array $result): bool => count($result['approved']) === 1 && count($result['failed']) === 1);
        $this->assertSame('APPROVED', $first->fresh()->status);
        $this->assertSame('PENDING', $second->fresh()->status);
        $this->assertSame(50.0, (float) DB::table('tt_stok_gudang')->value('stok_ml'));
        $this->assertDatabaseCount('tt_penjualan', 1);
    }

    public function test_cash_stays_out_of_reports_until_approved_and_cannot_be_posted_twice(): void
    {
        $service = app(TransactionValidationService::class);
        $request = $service->submit('kas', $this->payload(), $this->user, (string) Str::uuid());
        $this->assertSame('PENDING', $request->status);
        $this->assertSame(0, KasMutasi::query()->count());

        $approved = $service->approve($request->id, $this->user);
        $this->assertSame('APPROVED', $approved->status);
        $this->assertSame($this->user->id, $approved->reviewed_by_id);
        $this->assertDatabaseHas('tt_kas_mutasi', ['kas_masuk' => 25000, 'created_by' => 'Kasir']);
        $this->assertSame(1, KasMutasi::query()->count());

        try {
            $service->approve($request->id, $this->user);
            $this->fail('A reviewed request must not execute again.');
        } catch (ValidationException) {
            $this->assertSame(1, KasMutasi::query()->count());
        }
    }

    public function test_retrying_the_same_submission_does_not_create_a_second_request(): void
    {
        $service = app(TransactionValidationService::class);
        $key = (string) Str::uuid();
        $first = $service->submit('kas', $this->payload(), $this->user, $key);
        $second = $service->submit('kas', $this->payload(), $this->user, $key);
        $this->assertSame($first->id, $second->id);
        $this->assertSame(1, TransactionValidation::query()->count());
        $this->assertSame(0, KasMutasi::query()->count());
    }

    public function test_a_submission_key_cannot_be_reused_with_different_data(): void
    {
        $service = app(TransactionValidationService::class);
        $key = (string) Str::uuid();
        $service->submit('kas', $this->payload(), $this->user, $key);
        $this->expectException(ValidationException::class);
        $service->submit('kas', [...$this->payload(), 'jumlah' => 1], $this->user, $key);
    }

    public function test_rejected_requests_never_change_cash_or_become_approvable(): void
    {
        $service = app(TransactionValidationService::class);
        $request = $service->submit('kas', $this->payload(), $this->user, (string) Str::uuid());
        $rejected = $service->reject($request->id, $this->user, 'Nominal perlu diperbaiki');
        $this->assertSame('REJECTED', $rejected->status);
        $this->assertSame('Nominal perlu diperbaiki', $rejected->rejection_reason);
        $this->assertSame(0, KasMutasi::query()->count());
        $this->expectException(ValidationException::class);
        $service->approve($request->id, $this->user);
    }

    public function test_a_report_only_user_cannot_validate_another_transaction_scope(): void
    {
        $service = app(TransactionValidationService::class);
        $request = $service->submit('kas', $this->payload(), $this->user, (string) Str::uuid());
        $this->user->update(['akses_menu' => ['laporan-kas']]);
        $this->expectException(AuthorizationException::class);
        $service->approve($request->id, $this->user);
    }

    public function test_a_failed_posting_rolls_back_effects_and_keeps_the_request_pending(): void
    {
        $service = app(TransactionValidationService::class);
        $request = $service->submit('kas', $this->payload(), $this->user, (string) Str::uuid());
        KasMutasi::created(function (): void {
            throw new \RuntimeException('Posting failed');
        });
        try {
            $service->approve($request->id, $this->user);
            $this->fail('Expected a failed posting.');
        } catch (\RuntimeException $exception) {
            $this->assertSame('Posting failed', $exception->getMessage());
            $this->assertSame(0, DB::table('tt_kas_mutasi')->count());
            $this->assertSame('PENDING', $request->fresh()->status);
        } finally {
            KasMutasi::flushEventListeners();
        }
    }

    public function test_cash_http_submission_queues_instead_of_posting(): void
    {
        $this->post('/admin/kas', $this->payload(), ['Idempotency-Key' => (string) Str::uuid()])
            ->assertRedirect(route('business.kas.index'))
            ->assertSessionHasNoErrors()
            ->assertSessionHas('pendingValidation');
        $this->assertSame(1, TransactionValidation::query()->where('status', 'PENDING')->count());
        $this->assertSame(0, KasMutasi::query()->count());
    }

    public function test_validation_remains_accessible_when_the_store_requires_closing(): void
    {
        SystemDate::query()->update(['tanggal_system' => today()->subDay()->toDateString()]);
        $this->get('/admin/validasi-transaksi')->assertOk();
    }

    public function test_closing_is_blocked_while_a_request_is_pending(): void
    {
        app(TransactionValidationService::class)->submit('kas', $this->payload(), $this->user, (string) Str::uuid());
        $this->expectException(ValidationException::class);
        app(BusinessService::class)->closeStore(today()->toDateString());
    }

    public function test_approval_does_not_silently_post_into_a_different_business_day(): void
    {
        $service = app(TransactionValidationService::class);
        $request = $service->submit('kas', $this->payload(), $this->user, (string) Str::uuid());
        SystemDate::query()->update(['tanggal_system' => today()->addDay()->toDateString()]);
        try {
            $service->approve($request->id, $this->user);
            $this->fail('A stale business date must not be posted.');
        } catch (ValidationException) {
            $this->assertSame('PENDING', $request->fresh()->status);
            $this->assertDatabaseCount('tt_kas_mutasi', 0);
        }
    }

    public function test_http_approval_ignores_forged_payload_and_uses_the_original_amount(): void
    {
        $request = app(TransactionValidationService::class)->submit('kas', $this->payload(), $this->user, (string) Str::uuid());
        $this->post("/admin/validasi-transaksi/{$request->id}/setujui", ['payload' => ['jumlah' => 1]])->assertRedirect()->assertSessionHasNoErrors();
        $this->assertDatabaseHas('tt_kas_mutasi', ['kas_masuk' => 25000]);
        $this->post("/admin/validasi-transaksi/{$request->id}/setujui")->assertSessionHasErrors('validation');
        $this->assertDatabaseCount('tt_kas_mutasi', 1);
    }

    public function test_validation_list_is_scoped_and_does_not_expose_executable_payloads(): void
    {
        $request = app(TransactionValidationService::class)->submit('kas', $this->payload(), $this->user, (string) Str::uuid());
        $this->get('/admin/validasi-transaksi')->assertInertia(fn (AssertableInertia $page) => $page
            ->component('admin/business/ValidationPage', false)
            ->has('rows.data', 1)
            ->where('rows.data.0.id', $request->id)
            ->missing('rows.data.0.payload')
            ->missing('rows.data.0.submission_key')
        );
        $this->user->update(['akses_menu' => ['penjualan-retail']]);
        $this->get('/admin/validasi-transaksi')->assertInertia(fn ($page) => $page->has('rows.data', 0));
        $this->post("/admin/validasi-transaksi/{$request->id}/setujui")->assertForbidden();
    }

    public function test_missing_submission_key_and_blank_rejection_do_not_change_balances(): void
    {
        $this->post('/admin/kas', $this->payload())->assertSessionHasErrors('submission_key');
        $this->assertDatabaseCount('tt_validasi_transaksi', 0);
        $request = app(TransactionValidationService::class)->submit('kas', $this->payload(), $this->user, (string) Str::uuid());
        $this->post("/admin/validasi-transaksi/{$request->id}/tolak", ['reason' => ' '])->assertSessionHasErrors('reason');
        $this->assertSame('PENDING', $request->fresh()->status);
        $this->assertDatabaseCount('tt_kas_mutasi', 0);
    }

    public function test_manual_bottle_stock_is_unchanged_until_approval_and_creates_a_movement_after_approval(): void
    {
        $this->user->update(['akses_menu' => ['mutasi-stok', 'hancur-stock']]);
        $this->createBottleSchema();
        $service = app(TransactionValidationService::class);
        $request = $service->submit('mutasi-botol', ['id_gudang' => 1, 'id_barang' => 1, 'jumlah_botol' => 3, 'tipe_mutasi' => 'MASUK'], $this->user, (string) Str::uuid());
        $this->assertSame(10.0, (float) DB::table('tm_botol_kosong')->value('stock'));
        $this->assertDatabaseCount('tt_botol_kosong', 0);
        $service->approve($request->id, $this->user);
        $this->assertSame(13.0, (float) DB::table('tm_botol_kosong')->value('stock'));
        $this->assertDatabaseHas('tt_botol_kosong', ['qty_botol' => 3, 'stok_awal' => 10, 'stok_akhir' => 13]);
        $destroy = $service->submit('hancur-botol', ['id_gudang' => 1, 'id_barang' => 1, 'jumlah_botol' => 20, 'tipe_mutasi' => 'KELUAR'], $this->user, (string) Str::uuid());
        try {
            $service->approve($destroy->id, $this->user);
            $this->fail('Insufficient stock must fail at approval.');
        } catch (ValidationException) {
            $this->assertSame('PENDING', $destroy->fresh()->status);
            $this->assertSame(13.0, (float) DB::table('tm_botol_kosong')->value('stock'));
            $this->assertDatabaseCount('tt_botol_kosong', 1);
        }
    }

    public function test_receivable_creation_and_payments_wait_for_approval_and_recheck_remaining_balance(): void
    {
        $this->user->update(['akses_menu' => ['piutang-supplier']]);
        Schema::create('tm_supplier', function (Blueprint $table): void {
            $table->id();
            $table->string('nama_supplier');
            $table->timestamps();
        });
        DB::table('tm_supplier')->insert(['id' => 1, 'nama_supplier' => 'Supplier Test']);
        Schema::create('tt_piutang_supplier', function (Blueprint $table): void {
            $table->id();
            $table->string('no_piutang_supplier');
            $table->date('tanggal');
            $table->unsignedBigInteger('id_supplier');
            foreach (['total_piutang', 'total_bayar', 'sisa_piutang'] as $column) {
                $table->decimal($column, 15, 2)->default(0);
            }
            $table->string('status_piutang');
            $table->date('jatuh_tempo')->nullable();
            $table->text('keterangan')->nullable();
            $table->string('created_by')->nullable();
            $table->timestamps();
        });
        $service = app(TransactionValidationService::class);
        $creation = $service->submit('piutang-supplier', ['id_supplier' => 1, 'total_piutang' => 100], $this->user, (string) Str::uuid());
        $this->assertDatabaseCount('tt_piutang_supplier', 0);
        $service->approve($creation->id, $this->user);
        $record = PiutangSupplier::query()->firstOrFail();
        $first = $service->submit('bayar-piutang-supplier', ['record_id' => $record->id, 'jumlah_bayar' => 80], $this->user, (string) Str::uuid());
        $second = $service->submit('bayar-piutang-supplier', ['record_id' => $record->id, 'jumlah_bayar' => 80], $this->user, (string) Str::uuid());
        $this->assertSame(100.0, (float) $record->fresh()->sisa_piutang);
        $service->approve($first->id, $this->user);
        try {
            $service->approve($second->id, $this->user);
            $this->fail('A queued payment must use the latest remaining balance.');
        } catch (ValidationException) {
            $this->assertSame(20.0, (float) $record->fresh()->sisa_piutang);
            $this->assertSame('PENDING', $second->fresh()->status);
        }
    }

    private function createBottleSchema(): void
    {
        Schema::create('tm_gudang', function (Blueprint $table): void {
            $table->id();
            $table->string('nama_gudang');
            $table->string('tipe_gudang');
            $table->timestamps();
        });
        Schema::create('tm_botol_kosong', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('id_gudang');
            $table->string('nama_botol');
            $table->decimal('stock', 15, 2);
            $table->timestamps();
        });
        Schema::create('tt_botol_kosong', function (Blueprint $table): void {
            $table->id();
            $table->date('tanggal');
            $table->unsignedBigInteger('id_gudang');
            $table->unsignedBigInteger('id_botol_kosong');
            foreach (['tipe_mutasi', 'sumber_transaksi', 'no_transaksi', 'created_by'] as $column) {
                $table->string($column)->nullable();
            }
            foreach (['qty_botol', 'stok_awal', 'stok_akhir'] as $column) {
                $table->decimal($column, 15, 2);
            }
            $table->text('keterangan')->nullable();
            $table->timestamps();
        });
        DB::table('tm_gudang')->insert(['id' => 1, 'nama_gudang' => 'Gudang Botol', 'tipe_gudang' => 'BOTOL']);
        DB::table('tm_botol_kosong')->insert(['id' => 1, 'id_gudang' => 1, 'nama_botol' => 'Botol 100 ML', 'stock' => 10]);
    }

    public function test_supplier_purchase_posts_stock_cash_and_debt_only_after_approval(): void
    {
        $this->createTradingSchema();
        $this->post('/admin/pembelian', [
            'id_supplier' => 1, 'id_gudang' => 2, 'metode_pembayaran' => 'DP', 'jumlah_bayar' => 5000,
            'jatuh_tempo' => today()->addDays(10)->toDateString(), 'discount' => 1000,
            'items' => [['tipe_item' => 'BIBIT', 'item_id' => 1, 'id_botol' => 1, 'qty_input' => 2, 'satuan_input' => 'BOTOL', 'harga' => 100]],
        ], ['Idempotency-Key' => (string) Str::uuid()])->assertSessionHasNoErrors()->assertSessionMissing('receipt');
        foreach (['tt_pembelian', 'tt_stok_gudang', 'tt_hutang', 'tt_kas_mutasi'] as $table) {
            $this->assertDatabaseCount($table, 0);
        }
        $request = TransactionValidation::query()->firstOrFail();
        $this->assertSame(19000, $request->snapshot['amount']);
        $reviewer = User::query()->create(['username' => 'reviewer', 'name' => 'Pemeriksa', 'role' => 'staff', 'akses_menu' => ['pembelian'], 'password' => 'test-password']);
        $this->actingAs($reviewer)->post("/admin/validasi-transaksi/{$request->id}/setujui")->assertSessionHasNoErrors()->assertSessionHas('transactionPdf', $request->pdf_url);
        $this->assertDatabaseHas('tt_stok_gudang', ['id_barang' => 1, 'stok_ml' => 200]);
        $this->assertDatabaseHas('tt_pembelian', ['total_pembelian' => 19000, 'created_by' => 'Kasir']);
        $this->assertDatabaseHas('tt_kas_mutasi', ['kas_keluar' => 5000, 'created_by' => 'Kasir']);
        $this->assertDatabaseHas('tt_hutang', ['sisa_hutang' => 14000]);
        $this->assertSame($reviewer->id, $request->fresh()->reviewed_by_id);
        $this->assertSame($this->user->id, $request->fresh()->submitted_by_id);
    }

    public function test_all_sale_types_remain_pending_without_changing_inventory_or_cash(): void
    {
        $this->createTradingSchema();
        DB::table('tt_stok_gudang')->insert(['id_gudang' => 2, 'id_barang' => 1, 'id_botol' => 1, 'stok_ml' => 500]);
        foreach (['RETAIL', 'SALES', 'BOTOL_KOSONG'] as $type) {
            $bottle = $type === 'BOTOL_KOSONG';
            $beforeCash = KasMutasi::query()->count();
            $beforeMl = (float) DB::table('tt_stok_gudang')->value('stok_ml');
            $beforeBottles = (float) DB::table('tm_botol_kosong')->value('stock');
            $this->post($bottle ? '/admin/penjualan-botol-kosong' : '/admin/penjualan', [
                'id_customer' => $type === 'SALES' ? 2 : 1, 'id_gudang' => $bottle ? 1 : 2,
                'tipe_penjualan' => $type, 'metode_pembayaran' => 'CASH',
                'items' => [['tipe_item' => $bottle ? 'BOTOL' : 'BIBIT', 'item_id' => 1, 'qty_input' => $bottle ? 2 : 100, 'satuan_input' => $bottle ? 'BOTOL' : 'ML']],
            ], ['Idempotency-Key' => (string) Str::uuid()])->assertSessionHasNoErrors();
            $request = TransactionValidation::query()->latest('id')->firstOrFail();
            $this->assertSame('PENDING', $request->status);
            $this->assertSame($beforeCash, KasMutasi::query()->count());
            $this->assertSame($beforeMl, (float) DB::table('tt_stok_gudang')->value('stok_ml'));
            $this->assertSame($beforeBottles, (float) DB::table('tm_botol_kosong')->value('stock'));
            $this->post("/admin/validasi-transaksi/{$request->id}/setujui")->assertSessionHasNoErrors();
            $request->refresh();
            $this->get("/admin/validasi-transaksi/{$request->id}/pdf")->assertOk()->assertHeader('content-type', 'application/pdf');
            $this->get("/admin/penjualan-nota/{$request->result['id']}/pdf")->assertOk()->assertHeader('content-type', 'application/pdf');
            $this->assertSame('APPROVED', $request->fresh()->status);
            $this->assertSame($beforeCash + 1, KasMutasi::query()->count());
            if ($bottle) {
                $this->assertSame($beforeBottles - 2, (float) DB::table('tm_botol_kosong')->value('stock'));
            } else {
                $this->assertSame($beforeMl - 100, (float) DB::table('tt_stok_gudang')->value('stok_ml'));
            }
        }
        $this->assertDatabaseCount('tt_penjualan', 3);
    }

    public function test_liquid_bottle_sales_convert_volume_and_post_only_after_approval(): void
    {
        $this->createTradingSchema();
        DB::table('tm_botol')->insert(['id' => 2, 'nama_botol' => '50 ML', 'varian_ml' => 50]);
        DB::table('tt_stok_gudang')->insert([
            ['id_gudang' => 2, 'id_barang' => 1, 'id_botol' => 1, 'stok_ml' => 500],
            ['id_gudang' => 2, 'id_barang' => 1, 'id_botol' => 2, 'stok_ml' => 300],
        ]);

        foreach (['RETAIL', 'SALES'] as $type) {
            $variant = $type === 'RETAIL' ? 1 : 2;
            $volume = $variant === 1 ? 200 : 100;
            $price = $type === 'RETAIL' ? 200 : 150;
            $before = (float) DB::table('tt_stok_gudang')->where('id_botol', $variant)->value('stok_ml');
            $cashCount = KasMutasi::query()->count();
            $item = ['tipe_item' => 'BIBIT', 'item_id' => 1, 'qty_input' => 2, 'satuan_input' => 'BOTOL'];
            if ($variant === 2) {
                $item['id_botol'] = 2;
            }
            $this->post('/admin/penjualan', [
                'id_customer' => $type === 'RETAIL' ? 1 : 2, 'id_gudang' => 2,
                'tipe_penjualan' => $type, 'metode_pembayaran' => 'CASH', 'items' => [$item],
            ], ['Idempotency-Key' => (string) Str::uuid()])->assertSessionHasNoErrors();

            $entry = TransactionValidation::query()->latest('id')->firstOrFail();
            $this->assertSame($volume, $entry->snapshot['items'][0]['base_qty']);
            $this->assertSame($variant, $entry->snapshot['items'][0]['variant_id']);
            $this->assertSame($volume * $price, $entry->snapshot['amount']);
            $this->assertSame($before, (float) DB::table('tt_stok_gudang')->where('id_botol', $variant)->value('stok_ml'));
            $this->assertSame($cashCount, KasMutasi::query()->count());

            $this->post("/admin/validasi-transaksi/{$entry->id}/setujui")->assertSessionHasNoErrors();
            $this->assertSame('APPROVED', $entry->fresh()->status);
            $this->assertSame($before - $volume, (float) DB::table('tt_stok_gudang')->where('id_botol', $variant)->value('stok_ml'));
            $this->assertDatabaseHas('tt_penjualan_detail', [
                'id_botol' => $variant, 'satuan_input' => 'BOTOL', 'qty_input' => 2,
                'qty_ml' => $volume, 'subtotal_jual' => $volume * $price,
            ]);
            $this->assertSame($cashCount + 1, KasMutasi::query()->count());
        }
    }

    public function test_liquid_bottle_sales_reject_missing_invalid_capacity_and_insufficient_stock(): void
    {
        $this->createTradingSchema();
        $payload = [
            'id_customer' => 1, 'id_gudang' => 2, 'tipe_penjualan' => 'RETAIL', 'metode_pembayaran' => 'CASH',
            'items' => [['tipe_item' => 'BIBIT', 'item_id' => 1, 'qty_input' => 1, 'satuan_input' => 'BOTOL']],
        ];
        DB::table('tm_barang_bibit')->where('id', 1)->update(['id_botol' => null]);
        $this->post('/admin/penjualan', $payload, ['Idempotency-Key' => (string) Str::uuid()])->assertSessionHasErrors('items');
        DB::table('tm_barang_bibit')->where('id', 1)->update(['id_botol' => 1]);
        DB::table('tm_botol')->where('id', 1)->update(['varian_ml' => 0]);
        $this->post('/admin/penjualan', $payload, ['Idempotency-Key' => (string) Str::uuid()])->assertSessionHasErrors('items');
        DB::table('tm_botol')->where('id', 1)->update(['varian_ml' => 100]);
        DB::table('tt_stok_gudang')->insert(['id_gudang' => 2, 'id_barang' => 1, 'id_botol' => 1, 'stok_ml' => 99]);
        $this->post('/admin/penjualan', $payload, ['Idempotency-Key' => (string) Str::uuid()])->assertSessionHasErrors('items');
        $this->assertDatabaseCount('tt_validasi_transaksi', 0);
        $this->assertDatabaseCount('tt_penjualan', 0);
        $this->assertSame(99.0, (float) DB::table('tt_stok_gudang')->value('stok_ml'));
    }

    public function test_incoming_stock_snapshot_uses_bottle_quantity_and_rejects_changed_conversion(): void
    {
        $this->createTradingSchema();
        $service = app(TransactionValidationService::class);
        $payload = ['id_gudang' => 2, 'id_barang' => 1, 'id_botol' => 1, 'tipe_mutasi' => 'MASUK', 'jumlah_botol' => 2, 'qty_ml' => 50];
        $request = $service->submit('mutasi-stok', $payload, $this->user, (string) Str::uuid());
        $this->assertArrayNotHasKey('qty_ml', $request->payload);
        $this->assertSame(200, $request->snapshot['items'][0]['base_qty']);
        DB::table('tm_botol')->update(['varian_ml' => 150]);
        try {
            $service->approve($request->id, $this->user);
            $this->fail('Changed bottle capacity requires a new review.');
        } catch (ValidationException) {
            $this->assertDatabaseCount('tt_stok_gudang', 0);
            $this->assertSame('PENDING', $request->fresh()->status);
        }
    }

    public function test_master_changes_cannot_bypass_validation_and_remove_stock(): void
    {
        $this->createTradingSchema();
        $data = ['id_gudang' => 1, 'nama_botol' => 'Botol', 'satuan' => 'PCS', 'status' => 'AKTIF'];
        $this->post('/admin/master/botol-kosong', [...$data, 'stock' => 50])->assertSessionHasErrors('stock');
        $this->put('/admin/master/botol-kosong/1', [...$data, 'id_gudang' => 2])->assertSessionHasErrors('id_gudang');
        $this->delete('/admin/master/botol-kosong/1')->assertSessionHas('error');
        $this->delete('/admin/master/gudang/1')->assertSessionHas('error');
        $this->assertDatabaseHas('tm_botol_kosong', ['id' => 1, 'id_gudang' => 1, 'stock' => 10]);
        DB::table('tt_stok_gudang')->insert(['id_gudang' => 2, 'id_barang' => 1, 'stok_ml' => 50]);
        $this->delete('/admin/barang-bibit/1')->assertSessionHas('error');
        $this->assertDatabaseHas('tm_barang_bibit', ['id' => 1]);
        $this->assertDatabaseHas('tt_stok_gudang', ['stok_ml' => 50]);
    }

    public function test_debt_and_customer_receivable_payments_wait_for_approval(): void
    {
        $this->createTradingSchema();
        foreach (['hutang', 'piutang'] as $kind) {
            $partyColumn = $kind === 'hutang' ? 'id_supplier' : 'id_customer';
            $id = DB::table('tt_'.$kind)->insertGetId([
                'no_'.$kind => strtoupper($kind).'-001', 'tanggal' => today()->toDateString(), $partyColumn => 1,
                'total_'.$kind => 100, 'sisa_'.$kind => 100, 'status_'.$kind => 'OPEN',
            ]);
            $beforeCash = KasMutasi::query()->count();
            $this->post("/admin/{$kind}/{$id}/bayar", ['jumlah_bayar' => 40], ['Idempotency-Key' => (string) Str::uuid()])->assertSessionHasNoErrors();
            $this->assertSame(0.0, (float) DB::table('tt_'.$kind)->where('id', $id)->value('total_bayar'));
            $this->assertSame($beforeCash, KasMutasi::query()->count());
            $request = TransactionValidation::query()->latest('id')->firstOrFail();
            $this->post("/admin/validasi-transaksi/{$request->id}/setujui")->assertSessionHasNoErrors();
            $request->refresh();
            $this->get("/admin/validasi-transaksi/{$request->id}/pdf")->assertOk()->assertHeader('content-type', 'application/pdf');
            $this->get("/admin/keuangan-nota/{$kind}/{$request->result['id']}/pdf")->assertOk()->assertHeader('content-type', 'application/pdf');
            $this->assertSame(40.0, (float) DB::table('tt_'.$kind)->where('id', $id)->value('total_bayar'));
            $this->assertSame($beforeCash + 1, KasMutasi::query()->count());
        }
    }

    public function test_manual_debt_creation_is_queued_without_creating_a_balance_early(): void
    {
        $this->createTradingSchema();
        $this->post('/admin/hutang', ['id_supplier' => 1, 'total_hutang' => 100], ['Idempotency-Key' => (string) Str::uuid()])->assertSessionHasNoErrors();
        $this->assertDatabaseCount('tt_hutang', 0);
        $request = TransactionValidation::query()->firstOrFail();
        $this->post("/admin/validasi-transaksi/{$request->id}/setujui")->assertSessionHasNoErrors();
        $this->assertDatabaseHas('tt_hutang', ['total_hutang' => 100, 'sisa_hutang' => 100]);
    }

    public function test_destroyed_liquid_stock_is_deducted_only_after_approval(): void
    {
        $this->createTradingSchema();
        DB::table('tt_stok_gudang')->insert(['id_gudang' => 2, 'id_barang' => 1, 'id_botol' => 1, 'stok_ml' => 100]);
        $this->post('/admin/hancur-stock', ['id_gudang' => 2, 'id_barang' => 1, 'id_botol' => 1, 'qty_ml' => 60], ['Idempotency-Key' => (string) Str::uuid()])->assertSessionHasNoErrors();
        $this->assertSame(100.0, (float) DB::table('tt_stok_gudang')->value('stok_ml'));
        $request = TransactionValidation::query()->firstOrFail();
        $this->post("/admin/validasi-transaksi/{$request->id}/setujui")->assertSessionHasNoErrors();
        $this->assertSame(40.0, (float) DB::table('tt_stok_gudang')->value('stok_ml'));
        $this->assertDatabaseHas('tt_mutasi_stok', ['sumber_transaksi' => 'DESTROY', 'qty_ml' => 60]);
    }

    public function test_barcode_is_saved_in_trade_and_inventory_validation_snapshots(): void
    {
        $this->createTradingSchema();
        Schema::table('tm_barang_bibit', function (Blueprint $table): void {
            $table->string('kode_barang')->nullable();
            $table->unsignedBigInteger('id_gudang')->nullable();
        });
        DB::table('tm_barang_bibit')->where('id', 1)->update(['kode_barang' => 'BRG-0001', 'id_gudang' => 2]);
        DB::table('tm_botol_kosong')->where('id', 1)->update(['kode_botol' => 'BTK-0001']);
        $service = app(TransactionValidationService::class);

        foreach (['BIBIT', 'ABSOLUTE', 'BOTOL'] as $type) {
            DB::table('tm_barang_bibit')->where('id', 1)->update(['jenis_barang' => $type === 'ABSOLUTE' ? 'ABSOLUTE' : 'BIBIT']);
            $entry = $service->submit('pembelian', [
                'id_supplier' => 1, 'id_gudang' => $type === 'BOTOL' ? 1 : 2, 'metode_pembayaran' => 'CASH',
                'items' => [['tipe_item' => $type, 'item_id' => 1, 'qty_input' => 1, 'satuan_input' => $type === 'BOTOL' ? 'BOTOL' : 'ML']],
            ], $this->user, (string) Str::uuid());
            $code = $type === 'BOTOL' ? 'BTK-0001' : 'BRG-0001';
            $this->assertSame($code, $entry->fresh()->snapshot['items'][0]['code']);
            $this->assertStringContainsString($code, view('exports.validation_receipt', ['validation' => $entry, 'settings' => []])->render());
        }

        $entry = $service->submit('mutasi-stok', [
            'id_gudang' => 2, 'id_barang' => 1, 'jumlah_botol' => 1, 'id_botol' => 1, 'tipe_mutasi' => 'MASUK',
        ], $this->user, (string) Str::uuid());
        $this->assertSame('BRG-0001', $entry->snapshot['items'][0]['code']);
        DB::table('tm_barang_bibit')->where('id', 1)->update(['kode_barang' => 'BRG-CHANGED']);
        $this->assertSame('BRG-0001', $entry->fresh()->snapshot['items'][0]['code']);
        $bottle = $service->submit('mutasi-botol', [
            'id_gudang' => 1, 'id_barang' => 1, 'jumlah_botol' => 1, 'tipe_mutasi' => 'MASUK',
        ], $this->user, (string) Str::uuid());
        $this->assertSame('BTK-0001', $bottle->snapshot['items'][0]['code']);
    }

    public function test_inventory_reports_filter_barcode_before_pagination_and_export(): void
    {
        $this->createTradingSchema();
        Schema::table('tm_barang_bibit', function (Blueprint $table): void {
            $table->string('kode_barang')->nullable();
            $table->string('status')->default('AKTIF');
            $table->unsignedBigInteger('id_gudang')->nullable();
        });
        Schema::table('tm_botol', function (Blueprint $table): void {
            $table->string('kode_botol')->nullable();
            $table->string('status')->default('AKTIF');
        });
        foreach (['tm_supplier', 'tm_customer'] as $name) {
            Schema::table($name, fn (Blueprint $table) => $table->string('status')->default('AKTIF'));
        }
        DB::table('tm_barang_bibit')->where('id', 1)->update(['kode_barang' => 'BRG-0001']);
        DB::table('tm_barang_bibit')->insert(['id' => 2, 'nama_barang' => 'Absolute', 'jenis_barang' => 'ABSOLUTE', 'kode_barang' => 'BRG-0002']);
        DB::table('tm_botol_kosong')->where('id', 1)->update(['kode_botol' => 'BTK-0001']);
        DB::table('tt_stok_gudang')->insert([
            ['id_gudang' => 2, 'id_barang' => 1, 'id_botol' => 1, 'stok_ml' => 100],
            ['id_gudang' => 2, 'id_barang' => 2, 'id_botol' => 1, 'stok_ml' => 50],
        ]);
        DB::table('tt_mutasi_stok')->insert([
            ['tanggal' => today(), 'id_gudang' => 2, 'id_barang' => 1, 'id_botol' => 1, 'tipe_mutasi' => 'MASUK', 'qty_ml' => 100],
            ['tanggal' => today(), 'id_gudang' => 2, 'id_barang' => 2, 'id_botol' => 1, 'tipe_mutasi' => 'MASUK', 'qty_ml' => 50],
        ]);
        DB::table('tt_saldo_barang')->insert([
            ['tanggal' => today(), 'id_gudang' => 2, 'id_barang' => 1, 'id_botol' => 1, 'stok_awal_ml' => 0, 'stok_akhir_ml' => 100],
            ['tanggal' => today(), 'id_gudang' => 2, 'id_barang' => 2, 'id_botol' => 1, 'stok_awal_ml' => 0, 'stok_akhir_ml' => 50],
        ]);
        DB::table('tt_botol_kosong')->insert([
            'tanggal' => today(), 'id_gudang' => 1, 'id_botol_kosong' => 1,
            'tipe_mutasi' => 'MASUK', 'qty_botol' => 10, 'stok_awal' => 0, 'stok_akhir' => 10,
        ]);
        foreach (['stok', 'mutasi-stok', 'barang-summary'] as $type) {
            $url = "/admin/laporan/{$type}?search=1&barcode=brg-0001";
            $this->get($url)->assertOk()->assertInertia(fn (AssertableInertia $page) => $page
                ->has('rows.data', 1)->where('rows.total', 1)
                ->where($type === 'stok' ? 'rows.data.0.kode_barang' : 'rows.data.0.barang.kode_barang', 'BRG-0001'));
            $this->get("/admin/laporan/{$type}?search=1&barcode=NOT-FOUND")->assertOk()
                ->assertInertia(fn (AssertableInertia $page) => $page->has('rows.data', 0));
            $response = $this->get($url.'&export=excel')->assertOk();
            $sheet = IOFactory::load($response->baseResponse->getFile()->getPathname())->getActiveSheet();
            $values = array_merge(...$sheet->toArray());
            $this->assertContains('Kode / Barcode', $values);
            $this->assertContains('BRG-0001', $values);
            $this->assertNotContains('BRG-0002', $values);
            $this->get($url.'&id_gudang=2&id_barang=1')->assertOk()
                ->assertInertia(fn (AssertableInertia $page) => $page->has('rows.data', 1));
            $this->get($url.'&id_gudang=1')->assertOk()
                ->assertInertia(fn (AssertableInertia $page) => $page->has('rows.data', 0));
            $this->get($url.'&export=pdf')->assertOk()->assertHeader('content-type', 'application/pdf');
        }
        $this->get('/admin/laporan/stok?search=1&barcode=btk-0001')->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page->has('rows.data', 0)
                ->has('botolStock.data', 1)->where('botolStock.data.0.kode_botol', 'BTK-0001'));
        $this->get('/admin/laporan/barang-summary?search=1&barcode=btk-0001')->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page->has('rows.data', 0)
                ->has('botolSummary.data', 1)->where('botolSummary.data.0.kode_botol', 'BTK-0001'));
        foreach (['stok', 'barang-summary'] as $type) {
            $response = $this->get("/admin/laporan/{$type}?search=1&barcode=btk-0001&export=excel")->assertOk();
            $sheet = IOFactory::load($response->baseResponse->getFile()->getPathname())->getActiveSheet();
            $values = array_merge(...$sheet->toArray());
            $this->assertContains('BTK-0001', $values);
            $this->assertNotContains('BRG-0001', $values);
            $this->get("/admin/laporan/{$type}?search=1&barcode=btk-0001&export=pdf")->assertOk();
        }
        $this->get('/admin/laporan/stok?search=1&barcode[]=BRG-0001')->assertSessionHasErrors('barcode');
    }

    private function createTradingSchema(): void
    {
        $this->user->update(['role' => 'superadmin']);
        $this->createBottleSchema();
        Schema::table('tm_gudang', function (Blueprint $table): void {
            $table->string('status')->default('AKTIF');
        });
        Schema::table('tm_botol_kosong', function (Blueprint $table): void {
            $table->decimal('harga_beli', 15, 2)->default(2000);
            $table->decimal('harga_jual', 15, 2)->default(5000);
            $table->string('kode_botol')->nullable();
            $table->string('status')->default('AKTIF');
            $table->string('satuan')->default('PCS');
        });
        DB::table('tm_gudang')->insert(['id' => 2, 'nama_gudang' => 'Gudang Isi', 'tipe_gudang' => 'BIBIT']);
        Schema::create('tm_supplier', function (Blueprint $table): void {
            $table->id();
            $table->string('nama_supplier');
            $table->timestamps();
        });
        Schema::create('tm_customer', function (Blueprint $table): void {
            $table->id();
            $table->string('nama_customer');
            $table->string('tipe_customer');
            $table->timestamps();
        });
        Schema::create('tm_sales', function (Blueprint $table): void {
            $table->id();
            $table->string('nama_sales');
            $table->timestamps();
        });
        Schema::create('tm_botol', function (Blueprint $table): void {
            $table->id();
            $table->string('nama_botol');
            $table->decimal('varian_ml', 15, 2);
            $table->integer('isi_per_dus')->default(1);
            $table->timestamps();
        });
        Schema::create('tm_barang_bibit', function (Blueprint $table): void {
            $table->id();
            $table->string('nama_barang');
            $table->string('jenis_barang');
            $table->unsignedBigInteger('id_botol')->nullable();
            foreach (['harga_beli_per_ml', 'harga_jual_retail_per_ml', 'harga_jual_grosir_per_ml', 'minimum_stok_ml'] as $column) {
                $table->decimal($column, 15, 2)->default(0);
            }
            $table->timestamps();
        });
        DB::table('tm_supplier')->insert(['id' => 1, 'nama_supplier' => 'Supplier']);
        DB::table('tm_customer')->insert([['id' => 1, 'nama_customer' => 'Rina', 'tipe_customer' => 'RETAIL'], ['id' => 2, 'nama_customer' => 'Toko Harum', 'tipe_customer' => 'SALES']]);
        DB::table('tm_botol')->insert(['id' => 1, 'nama_botol' => '100 ML', 'varian_ml' => 100]);
        DB::table('tm_barang_bibit')->insert(['id' => 1, 'nama_barang' => 'Lavender', 'jenis_barang' => 'BIBIT', 'id_botol' => 1, 'harga_beli_per_ml' => 100, 'harga_jual_retail_per_ml' => 200, 'harga_jual_grosir_per_ml' => 150]);
        foreach (['pembelian', 'penjualan'] as $kind) {
            Schema::create('tt_'.$kind, function (Blueprint $table) use ($kind): void {
                $table->id();
                $table->string('no_'.$kind);
                $table->date('tanggal');
                $table->unsignedBigInteger('id_gudang');
                $table->unsignedBigInteger($kind === 'pembelian' ? 'id_supplier' : 'id_customer')->nullable();
                if ($kind === 'penjualan') {
                    $table->unsignedBigInteger('id_sales')->nullable();
                    $table->string('manual_customer_name')->nullable();
                    $table->string('tipe_penjualan');
                }
                foreach (['total_qty_ml', 'total_qty_botol', 'total_'.$kind, 'jumlah_bayar', 'discount', 'total_modal', 'laba_kotor'] as $column) {
                    $table->decimal($column, 15, 2)->default(0);
                }
                $table->string('metode_pembayaran');
                $table->string('status_pembayaran');
                $table->date('jatuh_tempo')->nullable();
                $table->text('keterangan')->nullable();
                $table->string('created_by')->nullable();
                $table->timestamps();
            });
            Schema::create('tt_'.$kind.'_detail', function (Blueprint $table) use ($kind): void {
                $table->id();
                $table->unsignedBigInteger('id_'.$kind);
                foreach (['item_id', 'id_barang', 'id_botol'] as $column) {
                    $table->unsignedBigInteger($column)->nullable();
                }
                foreach (['tipe_item', 'nama_item', 'satuan_input', 'satuan_dasar'] as $column) {
                    $table->string($column)->nullable();
                }
                foreach (['qty_input', 'qty_ml', 'konversi_qty_dasar', 'harga', 'harga_beli_per_ml', 'harga_jual_per_ml', 'subtotal', 'subtotal_jual', 'subtotal_modal', 'laba_kotor', 'discount'] as $column) {
                    $table->decimal($column, 15, 2)->default(0);
                }
                $table->timestamps();
            });
        }
        foreach (['hutang', 'piutang'] as $kind) {
            Schema::create('tt_'.$kind, function (Blueprint $table) use ($kind): void {
                $table->id();
                $table->string('no_'.$kind);
                $table->date('tanggal');
                $table->unsignedBigInteger($kind === 'hutang' ? 'id_supplier' : 'id_customer')->nullable();
                $table->unsignedBigInteger($kind === 'hutang' ? 'id_pembelian' : 'id_penjualan')->nullable();
                foreach (['total_'.$kind, 'total_bayar', 'sisa_'.$kind] as $column) {
                    $table->decimal($column, 15, 2)->default(0);
                }
                $table->string('status_'.$kind);
                $table->date('jatuh_tempo')->nullable();
                $table->text('keterangan')->nullable();
                $table->string('created_by')->nullable();
                $table->timestamps();
            });
        }
        Schema::create('tt_stok_gudang', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('id_gudang');
            $table->unsignedBigInteger('id_barang');
            $table->unsignedBigInteger('id_botol')->nullable();
            foreach (['stok_ml', 'stok_reserved_ml', 'minimum_stok_ml'] as $column) {
                $table->decimal($column, 15, 2)->default(0);
            }
            $table->timestamp('last_update')->nullable();
            $table->timestamps();
        });
        foreach (['tt_mutasi_stok', 'tt_barang_bibit'] as $name) {
            Schema::create($name, function (Blueprint $table): void {
                $table->id();
                $table->date('tanggal');
                $table->unsignedBigInteger('id_gudang');
                $table->unsignedBigInteger('id_barang');
                $table->unsignedBigInteger('id_botol')->nullable();
                foreach (['tipe_mutasi', 'sumber_transaksi', 'no_transaksi', 'created_by'] as $column) {
                    $table->string($column)->nullable();
                }
                foreach (['qty_ml', 'stok_sebelum_ml', 'stok_sesudah_ml', 'stok_awal_ml', 'stok_akhir_ml'] as $column) {
                    $table->decimal($column, 15, 2)->default(0);
                }
                $table->text('keterangan')->nullable();
                $table->timestamps();
            });
        }
        foreach (['tt_saldo_barang', 'th_saldo_barang'] as $name) {
            Schema::create($name, function (Blueprint $table): void {
                $table->id();
                $table->date('tanggal');
                $table->unsignedBigInteger('id_gudang');
                $table->unsignedBigInteger('id_barang');
                $table->unsignedBigInteger('id_botol')->nullable();
                foreach (['stok_awal_ml', 'masuk_ml', 'keluar_ml', 'stok_akhir_ml', 'minimum_stok_ml'] as $column) {
                    $table->decimal($column, 15, 2)->default(0);
                }
                $table->integer('total_mutasi')->default(0);
                $table->date('terakhir_mutasi')->nullable();
                $table->timestamps();
            });
        }
    }
}
