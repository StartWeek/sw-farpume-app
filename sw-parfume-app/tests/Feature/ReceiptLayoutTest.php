<?php

namespace Tests\Feature;

use App\Http\Controllers\Admin\Business\TransactionController;
use App\Models\Business\Penjualan;
use App\Models\Business\TransactionValidation;
use App\Services\Business\TransactionValidationService;
use App\Services\SettingsService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Database\Eloquent\Collection;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class ReceiptLayoutTest extends TestCase
{
    public function test_sales_history_receipt_titles_match_each_sales_type(): void
    {
        $this->mock(SettingsService::class, fn ($mock) => $mock->shouldReceive('get')->andReturn(['store_name' => 'TOKO TEST']));
        $controller = app(TransactionController::class);
        foreach (['RETAIL' => 'Penjualan Retail', 'GROSIR' => 'Penjualan Sales', 'SALES' => 'Penjualan Sales', 'BOTOL_KOSONG' => 'Penjualan Botol Kosong'] as $type => $title) {
            $sale = (new Penjualan(['tipe_penjualan' => $type]))->setRelations([
                'gudang' => null, 'customer' => null, 'sales' => null, 'details' => new Collection,
            ]);
            $receipt = (new \ReflectionMethod($controller, 'receiptPayload'))->invoke($controller, $sale, 'penjualan');
            $this->assertSame($title, $receipt['title']);
        }
    }

    public function test_trade_receipt_hides_empty_fields_and_preserves_discounts_when_present(): void
    {
        $receipt = [
            'title' => 'Pembelian Supplier', 'type' => 'pembelian', 'number' => 'PBL-001', 'date' => '31/10/2026',
            'party_label' => 'Supplier', 'party_name' => 'Supplier Contoh', 'warehouse' => 'Gudang Bibit',
            'payment_method' => 'CASH', 'payment_status' => 'LUNAS', 'total' => 125, 'amount_paid' => 125,
            'remaining' => 0, 'discount' => 0, 'total_qty' => 1.25, 'total_bottle' => 0,
            'items' => [[...$this->item(), 'discount' => 0]],
        ];
        $html = view('exports.nota', ['title' => $receipt['title'], 'receipt' => $receipt, 'settings' => []])->render();
        $this->assertStringNotContainsString('Diskon', $html);
        $this->assertStringNotContainsString('Jatuh tempo:', $html);
        $this->assertStringNotContainsString('Total botol:', $html);
        $this->assertStringContainsString('1,25 ML', $html);
        $receipt = [...$receipt, 'discount' => 10, 'jatuh_tempo' => '01/12/2026', 'items' => [[...$receipt['items'][0], 'discount' => 5]]];
        $html = view('exports.nota', ['title' => $receipt['title'], 'receipt' => $receipt, 'settings' => []])->render();
        $this->assertStringContainsString('>Diskon</th>', $html);
        $this->assertStringContainsString('- Rp 10', $html);
        $this->assertStringContainsString('Jatuh tempo: 01/12/2026', $html);
    }

    public static function validationTypes(): array
    {
        $cases = [];
        foreach (TransactionValidationService::TYPES as $type => $config) {
            foreach (['PENDING', 'APPROVED', 'REJECTED'] as $status) {
                $cases[$type.'-'.$status] = [$type, $config['label'], $status];
            }
        }

        return $cases;
    }

    #[DataProvider('validationTypes')]
    public function test_each_validation_receipt_uses_its_transaction_title_and_status(string $type, string $label, string $status): void
    {
        $entry = $this->validation($type, $label, $status);
        $html = view('exports.validation_receipt', ['validation' => $entry, 'settings' => []])->render();
        $title = $type === 'hancur-stock' ? 'Hancur Stock' : $label;
        $this->assertStringContainsString('<h1 class="document-title">'.$title.'</h1>', $html);
        $this->assertStringNotContainsString('BUKTI TRANSAKSI', $html);
        $this->assertStringNotContainsString('BUKTI PENGAJUAN', $html);
        $this->assertStringNotContainsString('Jatuh tempo:', $html);
        $this->assertStringNotContainsString('PIHAK / CUSTOMER / SUPPLIER', $html);
        if ($status === 'PENDING') {
            $this->assertStringContainsString('Menunggu Validasi', $html);
            $this->assertStringContainsString('Belum diproses.', $html);
        } elseif ($status === 'REJECTED') {
            $this->assertStringContainsString('Ditolak', $html);
            $this->assertStringContainsString('Tidak diproses.', $html);
            $this->assertStringContainsString('Jumlah salah', $html);
        } else {
            $this->assertStringContainsString('Disetujui', $html);
            $this->assertStringNotContainsString('diproses.', $html);
        }
    }

    public function test_stock_receipt_omits_money_and_duplicate_base_quantity(): void
    {
        $entry = $this->validation('hancur-stock', 'Hancur Stok Isi');
        $entry->snapshot = [...$entry->snapshot, 'amount' => null, 'items' => [$this->item()]];
        $html = view('exports.validation_receipt', ['validation' => $entry, 'settings' => []])->render();
        $this->assertStringNotContainsString('Rp ', $html);
        $this->assertStringNotContainsString('>Setara<', $html);
        $this->assertSame(1, substr_count($html, '1,25 ML'));
        $entry->snapshot = [...$entry->snapshot, 'items' => [[...$this->item(), 'unit' => 'BOTOL', 'base_qty' => 125]]];
        $html = view('exports.validation_receipt', ['validation' => $entry, 'settings' => []])->render();
        $this->assertStringContainsString('>Setara<', $html);
        $this->assertStringContainsString('125 ML', $html);
    }

    public function test_finance_summary_keeps_cumulative_totals_without_payment_instructions(): void
    {
        foreach (['Hutang Supplier', 'Piutang Supplier', 'Piutang Customer'] as $type) {
            $receipt = [
                'title' => 'Ringkasan '.$type, 'number' => 'REF-001', 'date' => '31/10/2026',
                'party_label' => 'Supplier', 'party_name' => 'Toko Contoh', 'status' => 'BELUM LUNAS',
                'total' => 1250.5, 'paid' => 250, 'remaining' => 1000.5, 'items' => [],
            ];
            $html = view('exports.finance_receipt', ['receipt' => $receipt, 'settings' => []])->render();
            $this->assertStringContainsString('<h1 class="document-title">Ringkasan '.$type.'</h1>', $html);
            $this->assertStringContainsString('Rp 1.250,50', $html);
            $this->assertStringContainsString('Rp 1.000,50', $html);
            $this->assertStringContainsString('Total Dibayar', $html);
            $this->assertStringNotContainsString('menu Validasi', $html);
            $this->assertStringNotContainsString('Referensi:', $html);
        }
    }

    public function test_thermal_slip_keeps_transaction_title_and_payment_status(): void
    {
        foreach (['PENDING', 'APPROVED', 'REJECTED'] as $status) {
            $entry = $this->validation('penjualan-retail', 'Penjualan Retail', $status);
            $entry->snapshot = [...$entry->snapshot, 'payment_method' => 'DP', 'down_payment' => 250, 'amount' => 1250.5, 'items' => [$this->item()]];
            $html = view('exports.customer_slip', ['validation' => $entry, 'settings' => []])->render();
            $this->assertStringContainsString('<h2>Penjualan Retail</h2>', $html);
            $this->assertStringNotContainsString('SLIP CUSTOMER', $html);
            $this->assertStringNotContainsString('BUKTI PENGAJUAN', $html);
            $this->assertStringContainsString('Rp 1.000,50', $html);
            $this->assertStringContainsString('size: 80mm 297mm', $html);
            $this->assertStringContainsString('.controls { display: none; }', $html);
            $this->assertStringContainsString($status === 'APPROVED' ? 'Dibayar' : 'Rencana bayar', $html);
        }
    }

    public function test_short_receipt_is_one_a4_page_and_many_items_paginate(): void
    {
        $entry = $this->validation('hancur-stock', 'Hancur Stok Isi', 'APPROVED');
        foreach ([1, 80] as $count) {
            $entry->snapshot = [...$entry->snapshot, 'amount' => null, 'items' => array_fill(0, $count, $this->item())];
            $pdf = Pdf::loadView('exports.validation_receipt', ['validation' => $entry, 'settings' => []])->setPaper('a4', 'portrait');
            $content = $pdf->output();
            $this->assertStringStartsWith('%PDF-', $content);
            $this->assertMatchesRegularExpression('/\/MediaBox\s*\[\s*0\.\d+\s+0\.\d+\s+595\.\d+\s+841\.\d+\s*\]/', $content);
            $pages = $pdf->getDomPDF()->getCanvas()->get_page_count();
            if ($count === 1) {
                $this->assertSame(1, $pages);
            } else {
                $this->assertGreaterThan(1, $pages);
            }
        }
    }

    private function validation(string $type, string $label, string $status = 'PENDING'): TransactionValidation
    {
        return (new TransactionValidation([
            'type' => $type, 'status' => $status, 'operational_date' => '2026-10-31',
            'submitted_by_name' => 'Kasir', 'reviewed_by_name' => $status === 'PENDING' ? null : 'Owner',
            'rejection_reason' => $status === 'REJECTED' ? 'Jumlah salah' : null,
            'snapshot' => ['label' => $label, 'amount' => 1250.5, 'items' => [], 'party' => 'Toko Contoh'],
        ]))->forceFill(['id' => 1]);
    }

    private function item(): array
    {
        return ['name' => 'Bibit Lavender', 'qty' => 1.25, 'unit' => 'ML', 'base_qty' => 1.25, 'base_unit' => 'ML', 'price' => 100, 'subtotal' => 125];
    }
}
