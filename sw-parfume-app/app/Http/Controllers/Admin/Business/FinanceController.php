<?php

namespace App\Http\Controllers\Admin\Business;

use App\Http\Controllers\Controller;
use App\Models\Business\Hutang;
use App\Models\Business\Piutang;
use App\Models\Business\PiutangSupplier;
use App\Models\Business\Supplier;
use App\Services\Business\BusinessService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FinanceController extends Controller
{
    public function __construct(private readonly BusinessService $business) {}

    public function hutang(): Response
    {
        return Inertia::render('admin/business/FinancePage', [
            'type' => 'hutang',
            'rows' => Hutang::query()
                ->with(['supplier', 'pembelian.details.barang', 'pembelian.details.botol'])
                ->latest('id')
                ->paginate($this->perPage())
                ->withQueryString(),
            'refs' => $this->refs(),
        ]);
    }

    public function piutang(): Response
    {
        return Inertia::render('admin/business/FinancePage', [
            'type' => 'piutang',
            'rows' => Piutang::query()
                ->with(['customer', 'penjualan.details.barang', 'penjualan.details.botol'])
                ->latest('id')
                ->paginate($this->perPage())
                ->withQueryString(),
            'refs' => $this->refs(),
        ]);
    }

    public function piutangSupplier(): Response
    {
        return Inertia::render('admin/business/FinancePage', [
            'type' => 'piutang-supplier',
            'rows' => PiutangSupplier::query()
                ->with('supplier')
                ->latest('id')
                ->paginate($this->perPage())
                ->withQueryString(),
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

        $hutang = $this->business->createHutangSupplier($validated);

        return redirect()
            ->route('business.hutang.index')
            ->with('success', 'Hutang supplier berhasil disimpan.')
            ->with('receipt', $this->paymentReceiptPayload($hutang, 'hutang', 0));
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

        $piutang = $this->business->createPiutangSupplier($validated);

        return redirect()
            ->route('business.piutang-supplier.index')
            ->with('success', 'Piutang supplier berhasil disimpan.')
            ->with('receipt', $this->paymentReceiptPayload($piutang, 'piutang-supplier', 0));
    }

    public function payHutang(Request $request, Hutang $hutang): RedirectResponse
    {
        $validated = $request->validate(['jumlah_bayar' => ['required', 'numeric', 'min:0.01']]);
        $paid = $this->business->payHutang($hutang, (float) $validated['jumlah_bayar']);

        return back()
            ->with('success', 'Pembayaran hutang berhasil disimpan.')
            ->with('receipt', $this->paymentReceiptPayload($paid, 'hutang', (float) $validated['jumlah_bayar']));
    }

    public function payPiutang(Request $request, Piutang $piutang): RedirectResponse
    {
        $validated = $request->validate(['jumlah_bayar' => ['required', 'numeric', 'min:0.01']]);
        $paid = $this->business->payPiutang($piutang, (float) $validated['jumlah_bayar']);

        return back()
            ->with('success', 'Pembayaran piutang berhasil disimpan.')
            ->with('receipt', $this->paymentReceiptPayload($paid, 'piutang', (float) $validated['jumlah_bayar']));
    }

    public function payPiutangSupplier(Request $request, PiutangSupplier $piutangSupplier): RedirectResponse
    {
        $validated = $request->validate(['jumlah_bayar' => ['required', 'numeric', 'min:0.01']]);
        $paid = $this->business->payPiutangSupplier($piutangSupplier, (float) $validated['jumlah_bayar']);

        return back()
            ->with('success', 'Pembayaran piutang supplier berhasil disimpan.')
            ->with('receipt', $this->paymentReceiptPayload($paid, 'piutang-supplier', (float) $validated['jumlah_bayar']));
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
            'title' => $isDebt ? 'NOTA BAYAR HUTANG' : ($isSupplierReceivable ? 'NOTA PIUTANG SUPPLIER' : 'NOTA BAYAR PIUTANG'),
            'number' => $isDebt ? $transaction->no_hutang : ($isSupplierReceivable ? $transaction->no_piutang_supplier : $transaction->no_piutang),
            'source_number' => $isDebt ? $transaction->pembelian?->no_pembelian : ($isSupplierReceivable ? '-' : $transaction->penjualan?->no_penjualan),
            'date' => now()->format('d/m/Y'),
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
        ];
    }
}
