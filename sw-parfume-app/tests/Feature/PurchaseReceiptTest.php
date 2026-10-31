<?php

namespace Tests\Feature;

use App\Http\Controllers\Admin\Business\TransactionController;
use App\Http\Middleware\EnsureStoreIsOpen;
use App\Models\Business\BarangBibit;
use App\Models\Business\Gudang;
use App\Models\Business\Pembelian;
use App\Models\Business\Supplier;
use App\Models\Business\SystemDate;
use App\Models\Business\TransactionValidation;
use App\Models\User;
use App\Services\Business\BusinessService;
use App\Services\SettingsService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Mockery\MockInterface;
use Tests\TestCase;

class PurchaseReceiptTest extends TestCase
{
    use RefreshDatabase;

    private Supplier $supplier;

    private Gudang $gudang;

    private BarangBibit $barang;

    private Pembelian $purchase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->createReceiptSchema();
        $this->withoutMiddleware([ValidateCsrfToken::class, EnsureStoreIsOpen::class]);
        $this->actingAs((new User([
            'username' => 'purchase-receipt-admin',
            'name' => 'Purchase Receipt Admin',
            'password' => 'secret',
            'role' => 'superadmin',
        ]))->forceFill(['id' => 1]));
        $this->withHeader('Idempotency-Key', (string) Str::uuid());
        Schema::create('tp_system', function (Blueprint $table): void {
            $table->id();
            $table->date('tanggal_system');
            $table->timestamps();
        });
        SystemDate::query()->create(['id' => 1, 'tanggal_system' => today()->toDateString()]);
        $this->supplier = Supplier::query()->create([
            'kode_supplier' => 'SUP-NOTA',
            'nama_supplier' => 'Supplier Nota',
            'status' => 'AKTIF',
        ]);
        $this->gudang = Gudang::query()->create([
            'kode_gudang' => 'GDG-NOTA',
            'nama_gudang' => 'Gudang Nota',
            'status' => 'AKTIF',
        ]);
        $this->barang = BarangBibit::query()->create([
            'kode_barang' => 'BRG-NOTA',
            'nama_barang' => 'Bibit Lavender',
            'jenis_barang' => 'BIBIT',
            'harga_beli_per_ml' => 100,
            'status' => 'AKTIF',
        ]);
        $this->purchase = Pembelian::query()->create([
            'no_pembelian' => 'PBL-NOTA-001',
            'tanggal' => '2026-10-31',
            'id_supplier' => $this->supplier->id,
            'id_gudang' => $this->gudang->id,
            'metode_pembayaran' => 'CASH',
            'status_pembayaran' => 'LUNAS',
            'total_pembelian' => 900,
            'jumlah_bayar' => 900,
            'discount' => 100,
            'total_qty_ml' => 10,
            'keterangan' => 'NOTA SUPPLIER',
        ]);
        $this->purchase->details()->create([
            'nama_item' => $this->barang->nama_barang,
            'id_barang' => $this->barang->id,
            'qty_input' => 10,
            'satuan_input' => 'ML',
            'satuan_dasar' => 'ML',
            'harga' => 100,
            'harga_beli_per_ml' => 100,
            'subtotal' => 1000,
        ]);
        $this->mock(BusinessService::class, function (MockInterface $mock): void {
            $mock->shouldReceive('createPembelian')->andReturnUsing(fn () => $this->purchase->fresh());
            $mock->shouldReceive('operationalDate')->andReturn(today());
            $mock->shouldReceive('previewTransaction')->andReturnUsing(fn (array $payload) => ['payload' => $payload, 'snapshot' => ['amount' => 900, 'items' => [], 'posting_signature' => 'receipt-test']]);
        });
        $this->mock(SettingsService::class, function (MockInterface $mock): void {
            $mock->shouldReceive('get')->andReturn(['store_name' => 'PARIS PARFUM']);
        });
    }

    public function test_cash_purchase_waits_for_validation_without_issuing_a_receipt(): void
    {
        $response = $this->post('/admin/pembelian', $this->payload());
        $purchase = Pembelian::query()->firstOrFail();

        $response->assertRedirect(route('business.pembelian.index'))
            ->assertSessionHasNoErrors()
            ->assertSessionHas('pendingValidation.status', 'PENDING')
            ->assertSessionMissing('receipt');

        $this->assertDatabaseCount('tt_pembelian', 1);
        $this->assertSame('PENDING', TransactionValidation::query()->firstOrFail()->status);
    }

    public function test_down_payment_receipt_includes_the_unpaid_balance_and_due_date(): void
    {
        $this->purchase->update(['metode_pembayaran' => 'DP', 'status_pembayaran' => 'BELUM LUNAS', 'jumlah_bayar' => 250, 'jatuh_tempo' => '2026-12-01']);
        $this->post('/admin/pembelian', $this->payload([
            'metode_pembayaran' => 'DP',
            'jumlah_bayar' => 250,
            'jatuh_tempo' => '2026-12-01',
        ]))->assertSessionHasNoErrors()->assertSessionMissing('receipt');
        $request = TransactionValidation::query()->firstOrFail();
        $this->assertSame('DP', $request->payload['metode_pembayaran']);
        $this->assertSame(250, $request->payload['jumlah_bayar']);
        $receipt = $this->existingReceipt();
        $this->assertSame(650.0, $receipt['remaining']);
        $this->assertSame('01/12/2026', $receipt['jatuh_tempo']);
    }

    public function test_tempo_receipt_has_no_payment_and_keeps_the_full_balance(): void
    {
        $this->purchase->update(['metode_pembayaran' => 'TEMPO', 'status_pembayaran' => 'BELUM LUNAS', 'jumlah_bayar' => 0, 'jatuh_tempo' => '2026-12-01']);
        $this->post('/admin/pembelian', $this->payload([
            'metode_pembayaran' => 'TEMPO',
            'jatuh_tempo' => '2026-12-01',
        ]))->assertSessionHasNoErrors()->assertSessionMissing('receipt');
        $receipt = $this->existingReceipt();
        $this->assertSame(0.0, $receipt['amount_paid']);
        $this->assertSame(900.0, $receipt['remaining']);
    }

    public function test_purchase_pdf_downloads_as_a4_and_renders_fractional_quantities(): void
    {
        $this->purchase->details()->firstOrFail()->update(['qty_input' => 1.25, 'satuan_input' => 'LITER']);
        $receipt = $this->existingReceipt();

        $this->assertSame('BRG-NOTA', $receipt['items'][0]['code']);
        $this->view('exports.nota', ['title' => $receipt['title'], 'receipt' => $receipt, 'settings' => []])
            ->assertSee('Pembelian Supplier')
            ->assertSee('BRG-NOTA')
            ->assertSee('1,25')
            ->assertSee('Dibayar')
            ->assertSee('Sisa Tagihan');

        $pdf = $this->get(route('business.pembelian.pdf', $receipt['id']))
            ->assertOk()
            ->assertHeader('Content-Type', 'application/pdf');

        $this->assertStringStartsWith('%PDF-', $pdf->getContent());
        $this->assertMatchesRegularExpression('/\/MediaBox\s*\[\s*0\.\d+\s+0\.\d+\s+595\.\d+\s+841\.\d+\s*\]/', $pdf->getContent());
    }

    public function test_invalid_purchase_does_not_create_a_receipt(): void
    {
        $this->post('/admin/pembelian', $this->payload(['id_supplier' => null]))
            ->assertSessionHasErrors('id_supplier')
            ->assertSessionMissing('receipt');

        $this->assertDatabaseCount('tt_pembelian', 1);
    }

    private function payload(array $overrides = []): array
    {
        return array_replace([
            'id_supplier' => $this->supplier->id,
            'id_gudang' => $this->gudang->id,
            'metode_pembayaran' => 'CASH',
            'discount' => 100,
            'keterangan' => 'nota supplier',
            'items' => [[
                'tipe_item' => 'BIBIT',
                'item_id' => $this->barang->id,
                'qty_input' => 10,
                'satuan_input' => 'ML',
                'harga' => 100,
            ]],
        ], $overrides);
    }

    private function existingReceipt(): array
    {
        $controller = app(TransactionController::class);

        return (new \ReflectionMethod($controller, 'receiptPayload'))->invoke($controller, $this->purchase->fresh(), 'pembelian');
    }

    private function createReceiptSchema(): void
    {
        foreach (['tm_supplier' => ['kode_supplier', 'nama_supplier'], 'tm_gudang' => ['kode_gudang', 'nama_gudang']] as $table => $columns) {
            Schema::create($table, function (Blueprint $table) use ($columns): void {
                $table->id();
                foreach ($columns as $column) {
                    $table->string($column);
                }
                $table->string('status');
                $table->timestamps();
            });
        }
        Schema::create('tm_barang_bibit', function (Blueprint $table): void {
            $table->id();
            $table->string('kode_barang');
            $table->string('nama_barang');
            $table->string('jenis_barang');
            $table->string('status');
            $table->decimal('harga_beli_per_ml', 15, 2);
            $table->timestamps();
        });
        Schema::create('tt_pembelian', function (Blueprint $table): void {
            $table->id();
            $table->string('no_pembelian');
            $table->date('tanggal');
            $table->unsignedBigInteger('id_supplier');
            $table->unsignedBigInteger('id_gudang');
            $table->string('metode_pembayaran');
            $table->string('status_pembayaran');
            foreach (['total_qty_ml', 'total_qty_botol', 'total_pembelian', 'jumlah_bayar', 'discount'] as $column) {
                $table->decimal($column, 15, 2)->default(0);
            }
            $table->date('jatuh_tempo')->nullable();
            $table->text('keterangan')->nullable();
            $table->timestamps();
        });
        Schema::create('tt_pembelian_detail', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('id_pembelian');
            $table->unsignedBigInteger('id_barang')->nullable();
            $table->unsignedBigInteger('id_botol')->nullable();
            $table->string('nama_item');
            $table->string('satuan_input');
            $table->string('satuan_dasar');
            foreach (['qty_input', 'qty_ml', 'konversi_qty_dasar', 'harga', 'harga_beli_per_ml', 'subtotal', 'discount'] as $column) {
                $table->decimal($column, 15, 2)->default(0);
            }
            $table->timestamps();
        });
    }
}
