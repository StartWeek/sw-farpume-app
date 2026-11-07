<?php

namespace App\Http\Controllers\Admin\Business;

use App\Http\Controllers\Controller;
use App\Models\Business\Hutang;
use App\Models\Business\Piutang;
use App\Models\Business\PiutangSupplier;
use App\Models\Business\Supplier;
use App\Services\Business\BusinessService;
use App\Services\Business\PaymentHistoryService;
use App\Services\Business\TransactionValidationService;
use App\Services\SettingsService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FinanceController extends Controller
{
    public function __construct(private readonly BusinessService $business, private readonly TransactionValidationService $validations, private readonly PaymentHistoryService $paymentHistory) {}

    public function hutang(): Response
    {
        return Inertia::render('admin/business/FinancePage', [
            'type' => 'hutang',
            'rows' => $this->paymentHistory->attach(Hutang::query()
                ->with(['supplier', 'pembelian.details.barang', 'pembelian.details.botol'])
                ->latest('id')
                ->paginate($this->perPage())
                ->withQueryString(), 'bayar-hutang'),
            'refs' => $this->refs(),
        ]);
    }

    public function piutang(): Response
    {
        return Inertia::render('admin/business/FinancePage', [
            'type' => 'piutang',
            'rows' => $this->paymentHistory->attach(Piutang::query()
                ->with(['customer', 'penjualan.details.barang', 'penjualan.details.botol'])
                ->latest('id')
                ->paginate($this->perPage())
                ->withQueryString(), 'bayar-piutang'),
            'refs' => $this->refs(),
        ]);
    }

    public function piutangSupplier(): Response
    {
        return Inertia::render('admin/business/FinancePage', [
            'type' => 'piutang-supplier',
            'rows' => $this->paymentHistory->attach(PiutangSupplier::query()
                ->with('supplier')
                ->latest('id')
                ->paginate($this->perPage())
                ->withQueryString(), 'bayar-piutang-supplier'),
            'refs' => $this->refs(),
        ]);
    }

    public function storeHutang(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'tanggal' => ['nullable', 'date'],
            'id_supplier' => ['required', 'exists:tm_supplier,id'],
            'total_hutang' => ['required', 'numeric', 'min:0.01'],
            'jatuh_tempo' => ['nullable', 'date'],
            'keterangan' => ['nullable', 'string'],
        ]);

        $validation = $this->validations->submit('hutang-supplier', $this->uppercase($validated), $request->user());

        return redirect()
            ->route('business.hutang.index')
            ->with('success', TransactionValidationService::SUBMITTED_MESSAGE)
            ->with('pendingValidation', $validation->only(['id', 'number', 'status', 'pdf_url', 'receipt_url']));
    }

    public function storePiutangSupplier(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'tanggal' => ['nullable', 'date'],
            'id_supplier' => ['required', 'exists:tm_supplier,id'],
            'total_piutang' => ['required', 'numeric', 'min:0.01'],
            'jatuh_tempo' => ['nullable', 'date'],
            'keterangan' => ['nullable', 'string'],
        ]);

        $validation = $this->validations->submit('piutang-supplier', $this->uppercase($validated), $request->user());

        return redirect()
            ->route('business.piutang-supplier.index')
            ->with('success', TransactionValidationService::SUBMITTED_MESSAGE)
            ->with('pendingValidation', $validation->only(['id', 'number', 'status', 'pdf_url', 'receipt_url']));
    }

    public function payHutang(Request $request, Hutang $hutang): RedirectResponse
    {
        $validated = $request->validate(['jumlah_bayar' => ['required', 'numeric', 'min:0.01']]);
        $validation = $this->validations->submit('bayar-hutang', [...$validated, 'record_id' => $hutang->id], $request->user());

        return back()
            ->with('success', TransactionValidationService::SUBMITTED_MESSAGE)
            ->with('pendingValidation', $validation->only(['id', 'number', 'status', 'pdf_url', 'receipt_url']));
    }

    public function payPiutang(Request $request, Piutang $piutang): RedirectResponse
    {
        $validated = $request->validate(['jumlah_bayar' => ['required', 'numeric', 'min:0.01']]);
        $validation = $this->validations->submit('bayar-piutang', [...$validated, 'record_id' => $piutang->id], $request->user());

        return back()
            ->with('success', TransactionValidationService::SUBMITTED_MESSAGE)
            ->with('pendingValidation', $validation->only(['id', 'number', 'status', 'pdf_url', 'receipt_url']));
    }

    public function payPiutangSupplier(Request $request, PiutangSupplier $piutangSupplier): RedirectResponse
    {
        $validated = $request->validate(['jumlah_bayar' => ['required', 'numeric', 'min:0.01']]);
        $validation = $this->validations->submit('bayar-piutang-supplier', [...$validated, 'record_id' => $piutangSupplier->id], $request->user());

        return back()
            ->with('success', TransactionValidationService::SUBMITTED_MESSAGE)
            ->with('pendingValidation', $validation->only(['id', 'number', 'status', 'pdf_url', 'receipt_url']));
    }

    public function pdf(Request $request, string $type, int $id): \Symfony\Component\HttpFoundation\Response
    {
        abort_unless(in_array($type, ['hutang', 'piutang', 'piutang-supplier'], true), 404);
        $access = $request->user()->akses_menu;
        abort_if(! in_array($request->user()->role, ['superadmin', 'owner'], true) && is_array($access) && $access !== [] && ! array_intersect($access, [$type, 'laporan-'.$type]), 403);
        $record = match ($type) {
            'hutang' => Hutang::query()->findOrFail($id),
            'piutang' => Piutang::query()->findOrFail($id),
            'piutang-supplier' => PiutangSupplier::query()->findOrFail($id),
        };
        $receipt = $this->paymentReceiptPayload($record, $type, (float) $record->total_bayar);

        if ($request->routeIs('business.finance.slip')) {
            abort_unless($type === 'piutang', 404);

            return response()->view('exports.customer_slip', [
                'receipt' => $receipt, 'settings' => app(SettingsService::class)->get(),
            ]);
        }

        return Pdf::loadView('exports.finance_receipt', [
            'receipt' => $receipt, 'settings' => app(SettingsService::class)->get(),
        ])->setPaper('a4', 'portrait')->stream(strtolower($receipt['number']).'.pdf');
    }

    private function perPage(): int
    {
        $perPage = (int) request('per_page', 10);

        return in_array($perPage, [10, 25, 50, 100], true) ? $perPage : 10;
    }

    private function refs(): array
    {
        return [
            'supplier' => Supplier::query()->where('status', 'AKTIF')->orderBy('nama_supplier')->get(['id', 'nama_supplier']),
        ];
    }

    private function paymentReceiptPayload(Hutang|Piutang|PiutangSupplier $transaction, string $type, float $amount): array
    {
        $transaction->loadMissing(match ($type) {
            'hutang' => ['supplier', 'pembelian.details.barang', 'pembelian.details.botol'],
            'piutang-supplier' => ['supplier'],
            default => ['customer', 'penjualan.details.barang', 'penjualan.details.botol'],
        });
        $isDebt = $type === 'hutang';
        $isSupplierReceivable = $type === 'piutang-supplier';
        $source = $isDebt ? $transaction->pembelian : ($isSupplierReceivable ? null : $transaction->penjualan);

        return [
            'type' => $type,
            'title' => $isDebt ? 'Ringkasan Hutang Supplier' : ($isSupplierReceivable ? 'Ringkasan Piutang Supplier' : 'Ringkasan Piutang Customer'),
            'number' => $isDebt ? $transaction->no_hutang : ($isSupplierReceivable ? $transaction->no_piutang_supplier : $transaction->no_piutang),
            'source_number' => $isDebt ? $transaction->pembelian?->no_pembelian : ($isSupplierReceivable ? '-' : $transaction->penjualan?->no_penjualan),
            'date' => now()->timezone('Asia/Jakarta')->format('d/m/Y H:i').' WIB',
            'party_label' => $isDebt || $isSupplierReceivable ? 'Supplier' : 'Customer',
            'party_name' => $isDebt || $isSupplierReceivable ? $transaction->supplier?->nama_supplier ?? '-' : $transaction->customer?->nama_customer ?? '-',
            'amount' => $amount,
            'total' => (float) ($isDebt ? $transaction->total_hutang : $transaction->total_piutang),
            'paid' => (float) $transaction->total_bayar,
            'remaining' => (float) ($isDebt ? $transaction->sisa_hutang : $transaction->sisa_piutang),
            'status' => $isDebt ? $transaction->status_hutang : $transaction->status_piutang,
            'items' => $source?->details?->map(fn ($detail) => [
                'name' => $detail->nama_item ?? $detail->barang?->nama_barang ?? $detail->botol?->nama_botol ?? '-',
                'qty' => (float) ($detail->qty_input ?: $detail->konversi_qty_dasar ?: $detail->qty_ml),
                'unit' => $detail->satuan_input ?? $detail->satuan_dasar ?? 'ML',
            ])->values()->all() ?? [],
            'store_name' => app(SettingsService::class)->get()['store_name'],
        ];
    }
}
