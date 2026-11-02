<?php

namespace App\Http\Controllers\Admin\Business;

use App\Http\Controllers\Controller;
use App\Models\Business\BarangBibit;
use App\Models\Business\Botol;
use App\Models\Business\BotolKosong;
use App\Models\Business\Customer;
use App\Models\Business\Gudang;
use App\Models\Business\Pembelian;
use App\Models\Business\Penjualan;
use App\Models\Business\Sales;
use App\Models\Business\StokGudang;
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
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class TransactionController extends Controller
{
    public function __construct(private readonly BusinessService $business, private readonly TransactionValidationService $validations, private readonly PaymentHistoryService $paymentHistory) {}

    public function pembelian(): Response
    {
        return Inertia::render('admin/business/TransactionPage', [
            'type' => 'pembelian',
            'rows' => $this->paymentHistory->attach(Pembelian::query()
                ->with(['supplier', 'gudang', 'details.barang', 'details.botol', 'details.botolKosong', 'details.botolVariant', 'hutang'])
                ->latest('id')
                ->paginate($this->perPage())
                ->withQueryString(), 'bayar-hutang', 'hutang'),
            'refs' => $this->refs(),
            'operationalDate' => $this->business->operationalDate()->toDateString(),
        ]);
    }

    public function penjualan(string $type): Response
    {
        abort_unless(in_array($type, ['retail', 'grosir', 'sales'], true), 404);
        $salesType = $type === 'retail' ? 'RETAIL' : 'GROSIR';

        return Inertia::render('admin/business/TransactionPage', [
            'type' => $type === 'grosir' ? 'sales' : $type,
            'rows' => $this->paymentHistory->attach(Penjualan::query()
                ->with(['customer', 'sales', 'gudang', 'details.gudang', 'details.barang', 'details.botol', 'details.botolKosong', 'details.botolVariant', 'piutang'])
                ->where('tipe_penjualan', $salesType)
                ->latest('id')
                ->paginate($this->perPage())
                ->withQueryString(), 'bayar-piutang', 'piutang'),
            'refs' => $this->refs(),
            'operationalDate' => $this->business->operationalDate()->toDateString(),
        ]);
    }

    public function penjualanBotolKosong(Request $request): Response
    {
        return Inertia::render('admin/business/TransactionPage', [
            'type' => 'botol-kosong',
            'mode' => 'history',
            'rows' => $this->paymentHistory->attach(Penjualan::query()
                ->with(['customer', 'sales', 'gudang', 'details.gudang', 'details.barang', 'details.botol', 'details.botolKosong', 'details.botolVariant', 'piutang'])
                ->where('tipe_penjualan', 'BOTOL_KOSONG')
                ->when($request->tanggal_dari, fn ($query) => $query->whereDate('tanggal', '>=', $request->tanggal_dari))
                ->when($request->tanggal_sampai, fn ($query) => $query->whereDate('tanggal', '<=', $request->tanggal_sampai))
                ->when($request->search, fn ($query) => $query->where('no_penjualan', 'like', "%{$request->search}%"))
                ->latest('id')
                ->paginate($this->perPage())
                ->withQueryString(), 'bayar-piutang', 'piutang'),
            'refs' => $this->refs('BOTOL'),
            'operationalDate' => $this->business->operationalDate()->toDateString(),
        ]);
    }

    public function riwayatPembelian(Request $request): Response
    {
        $rows = Pembelian::query()
            ->with(['supplier', 'gudang', 'details.barang', 'details.botol', 'details.botolKosong', 'details.botolVariant', 'hutang'])
            ->when($request->tanggal_dari, fn ($q) => $q->whereDate('tanggal', '>=', $request->tanggal_dari))
            ->when($request->tanggal_sampai, fn ($q) => $q->whereDate('tanggal', '<=', $request->tanggal_sampai))
            ->when($request->id_supplier, fn ($q) => $q->where('id_supplier', $request->id_supplier))
            ->when($request->search, fn ($q) => $q->where('no_pembelian', 'like', "%{$request->search}%"))
            ->latest('id')
            ->paginate($this->perPage())
            ->withQueryString();

        return Inertia::render('admin/business/TransactionPage', [
            'type' => 'pembelian',
            'mode' => 'history',
            'rows' => $this->paymentHistory->attach($rows, 'bayar-hutang', 'hutang'),
            'refs' => $this->refs(),
            'operationalDate' => $this->business->operationalDate()->toDateString(),
        ]);
    }

    public function riwayatPenjualan(Request $request, string $type): Response
    {
        abort_unless(in_array($type, ['retail', 'grosir', 'sales'], true), 404);
        $salesType = $type === 'retail' ? 'RETAIL' : 'GROSIR';

        $rows = Penjualan::query()
            ->with(['customer', 'sales', 'gudang', 'details.gudang', 'details.barang', 'details.botol', 'details.botolKosong', 'details.botolVariant', 'piutang'])
            ->where('tipe_penjualan', $salesType)
            ->when($request->tanggal_dari, fn ($q) => $q->whereDate('tanggal', '>=', $request->tanggal_dari))
            ->when($request->tanggal_sampai, fn ($q) => $q->whereDate('tanggal', '<=', $request->tanggal_sampai))
            ->when($request->search, fn ($q) => $q->where('no_penjualan', 'like', "%{$request->search}%"))
            ->latest('id')
            ->paginate($this->perPage())
            ->withQueryString();

        return Inertia::render('admin/business/TransactionPage', [
            'type' => $type === 'grosir' ? 'sales' : $type,
            'mode' => 'history',
            'rows' => $this->paymentHistory->attach($rows, 'bayar-piutang', 'piutang'),
            'refs' => $this->refs(),
            'operationalDate' => $this->business->operationalDate()->toDateString(),
        ]);
    }

    public function notaPdf(int $id): SymfonyResponse
    {
        $access = request()->user()->akses_menu;
        abort_if(! in_array(request()->user()->role, ['superadmin', 'owner'], true) && is_array($access) && $access !== [] && ! array_intersect($access, ['pembelian', 'riwayat-pembelian', 'laporan-pembelian']), 403);
        $pembelian = Pembelian::with(['supplier', 'gudang', 'details.barang', 'details.botol', 'details.botolKosong', 'details.botolVariant'])->findOrFail($id);
        $receipt = $this->receiptPayload($pembelian, 'pembelian');
        $settings = app(SettingsService::class)->get();

        $title = 'NOTA PEMBELIAN '.$pembelian->no_pembelian;
        $filename = str($title)->slug();

        return Pdf::loadView('exports.nota', [
            'title' => $title,
            'receipt' => $receipt,
            'settings' => $settings,
        ])->setPaper('a4', 'portrait')->stream($filename.'.pdf');
    }

    public function salesPdf(Request $request, int $id): SymfonyResponse
    {
        $sale = Penjualan::query()->findOrFail($id);
        $access = $request->user()->akses_menu;
        $required = in_array($sale->tipe_penjualan, ['GROSIR', 'SALES'], true) ? 'penjualan-grosir' : 'penjualan-retail';
        abort_if(! in_array($request->user()->role, ['superadmin', 'owner'], true) && is_array($access) && $access !== [] && ! array_intersect($access, [$required, 'riwayat-penjualan', 'laporan-penjualan']), 403);
        $receipt = $this->receiptPayload($sale, 'penjualan');

        if ($request->routeIs('business.penjualan.slip')) {
            return response()->view('exports.customer_slip', [
                'receipt' => $receipt, 'settings' => app(SettingsService::class)->get(),
            ]);
        }

        return Pdf::loadView('exports.nota', [
            'title' => 'NOTA PENJUALAN '.$sale->no_penjualan, 'receipt' => $receipt,
            'settings' => app(SettingsService::class)->get(),
        ])->setPaper('a4', 'portrait')->stream(strtolower($sale->no_penjualan).'.pdf');
    }

    public function storePembelian(Request $request): RedirectResponse
    {
        $validation = $this->validations->submit('pembelian', $this->uppercase($request->validate($this->pembelianRules(), $this->validationMessages())), $request->user());

        return redirect()
            ->route('business.pembelian.index')
            ->with('success', TransactionValidationService::SUBMITTED_MESSAGE)
            ->with('pendingValidation', $validation->only(['id', 'number', 'status', 'pdf_url', 'receipt_url']));
    }

    public function storePenjualan(Request $request): RedirectResponse
    {
        $validated = $this->uppercase($request->validate($this->penjualanRules(), $this->validationMessages()));
        if ($validated['tipe_penjualan'] === 'RETAIL' && ! in_array($validated['metode_pembayaran'], ['CASH', 'TRANSFER', 'SPLIT'], true)) {
            return back()->withErrors(['metode_pembayaran' => 'Penjualan retail tidak boleh menggunakan tempo.'])->withInput();
        }
        $validation = $this->validations->submit($validated['tipe_penjualan'] === 'RETAIL' ? 'penjualan-retail' : 'penjualan-sales', $validated, $request->user());

        return redirect()
            ->route('business.penjualan.index', $validated['tipe_penjualan'] === 'RETAIL' ? 'retail' : 'sales')
            ->with('success', TransactionValidationService::SUBMITTED_MESSAGE)
            ->with('pendingValidation', $validation->only(['id', 'number', 'status', 'pdf_url', 'receipt_url']));
    }

    public function storePenjualanBotolKosong(Request $request): RedirectResponse
    {
        $validated = $this->uppercase($request->validate($this->penjualanBotolKosongRules(), $this->validationMessages()));
        $validated['tipe_penjualan'] = 'BOTOL_KOSONG';
        $validated['items'] = collect($validated['items'])
            ->map(fn (array $item) => [...$item, 'tipe_item' => 'BOTOL'])
            ->all();

        $validation = $this->validations->submit('penjualan-botol', $validated, $request->user());

        return redirect()
            ->route('business.penjualan-botol-kosong.index')
            ->with('success', TransactionValidationService::SUBMITTED_MESSAGE)
            ->with('pendingValidation', $validation->only(['id', 'number', 'status', 'pdf_url', 'receipt_url']));
    }

    private function refs(string $gudangTipe = ''): array
    {
        $gudangQuery = Gudang::query()->where('status', 'AKTIF');
        if ($gudangTipe !== '') {
            $gudangQuery->where('tipe_gudang', $gudangTipe);
        }

        return [
            'barang' => BarangBibit::query()->with(['brand', 'botol', 'suppliers:id,nama_supplier'])->where('status', 'AKTIF')->orderBy('nama_barang')->get(),
            'botol' => Botol::query()->where('status', 'AKTIF')->orderBy('varian_ml')->get(),
            'botol_kosong' => app(\App\Services\Business\SupplierStockService::class)->withBottleLocations(BotolKosong::query()->where('status', 'AKTIF')->orderBy('nama_botol')->get()),
            'gudang' => $gudangQuery->orderBy('nama_gudang')->get(),
            'supplier' => Supplier::query()->where('status', 'AKTIF')->orderBy('nama_supplier')->get(),
            'customer' => Customer::query()->where('status', 'AKTIF')->orderBy('nama_customer')->get(),
            'sales' => Sales::query()->where('status', 'AKTIF')->orderBy('nama_sales')->get(),
            'stok_gudang' => StokGudang::query()->get(['id_gudang', 'id_barang', 'id_botol', 'stok_ml']),
        ];
    }

    private function perPage(): int
    {
        $perPage = (int) request('per_page', 10);

        return in_array($perPage, [10, 25, 50], true) ? $perPage : 10;
    }

    private function receiptPayload(Pembelian|Penjualan $transaction, string $type): array
    {
        $transaction->loadMissing([
            'gudang',
            'details.barang',
            'details.botol',
            'details.botolKosong',
            'details.botolVariant',
            $type === 'pembelian' ? 'supplier' : 'customer',
            ...($type === 'penjualan' ? ['sales', 'details.gudang'] : []),
        ]);

        if ($type === 'pembelian') {
            return [
                'id' => $transaction->id,
                'type' => 'pembelian',
                'title' => 'Pembelian Supplier',
                'number' => $transaction->no_pembelian,
                'date' => optional($transaction->tanggal)->format('d/m/Y'),
                'party_label' => 'Supplier',
                'party_name' => $transaction->supplier?->nama_supplier ?? '-',
                'warehouse' => $transaction->gudang?->nama_gudang ?? '-',
                'payment_method' => $transaction->metode_pembayaran,
                'payment_details' => $transaction->payment_details,
                'payment_status' => $transaction->status_pembayaran,
                'amount_paid' => (float) $transaction->jumlah_bayar,
                'remaining' => max(0, (float) $transaction->total_pembelian - (float) $transaction->jumlah_bayar),
                'jatuh_tempo' => optional($transaction->jatuh_tempo)->format('d/m/Y'),
                'notes' => $transaction->keterangan,
                'pdf_url' => route('business.pembelian.pdf', $transaction->id),
                'items' => $transaction->details->map(function ($detail) {
                    $variant = $detail->botolVariant;
                    $isBotolUnit = $detail->satuan_input === 'BOTOL';
                    $capacityMl = $detail->satuan_dasar === 'BOTOL'
                        ? (float) $detail->qty_ml
                        : ($variant ? (float) $variant->varian_ml : null);
                    $unitLabel = $isBotolUnit && $detail->satuan_dasar === 'ML'
                        ? 'BOTOL ISI'
                        : ($detail->satuan_input ?? 'ML');
                    $variantLabel = $variant ? $variant->nama_botol : null;

                    return [
                        'code' => $detail->tipe_item === 'BOTOL'
                            ? ($detail->botolKosong?->kode_botol ?? $detail->botol?->kode_botol)
                            : $detail->barang?->kode_barang,
                        'name' => $detail->nama_item ?? $detail->barang?->nama_barang ?? $detail->botolKosong?->nama_botol ?? $detail->botol?->nama_botol ?? '-',
                        'qty' => (float) ($detail->qty_input ?: $detail->konversi_qty_dasar ?: $detail->qty_ml),
                        'unit' => $unitLabel,
                        'variant' => $variantLabel,
                        'price' => (float) ($detail->harga ?: $detail->harga_beli_per_ml),
                        'price_unit' => $detail->satuan_dasar === 'ML' ? 'ML' : ($detail->satuan_input ?? 'BOTOL'),
                        'subtotal' => (float) $detail->subtotal,
                        'discount' => (float) $detail->discount,
                        'capacity_ml' => $capacityMl,
                        'price_per_ml' => (float) $detail->harga_beli_per_ml,
                    ];
                })->values()->all(),
                'total_qty' => (float) $transaction->total_qty_ml,
                'total_bottle' => (float) $transaction->total_qty_botol,
                'discount' => (float) $transaction->discount,
                'total' => (float) $transaction->total_pembelian,
                'store_name' => app(SettingsService::class)->get()['store_name'],
            ];
        }

        return [
            'id' => $transaction->id,
            'type' => 'penjualan',
            'title' => match ($transaction->tipe_penjualan) {
                'BOTOL_KOSONG' => 'Penjualan Botol Kosong',
                'GROSIR', 'SALES' => 'Penjualan Sales',
                default => 'Penjualan Retail',
            },
            'number' => $transaction->no_penjualan,
            'date' => optional($transaction->tanggal)->format('d/m/Y'),
            'party_label' => 'Customer',
            'party_name' => $transaction->customer?->nama_customer ?? $transaction->manual_customer_name ?? '-',
            'sales' => $transaction->sales?->nama_sales ?? '-',
            'warehouse' => $transaction->warehouse_label,
            'payment_method' => $transaction->metode_pembayaran,
            'payment_details' => $transaction->payment_details,
            'payment_status' => $transaction->status_pembayaran,
            'amount_paid' => (float) $transaction->jumlah_bayar,
            'remaining' => max(0, (float) $transaction->total_penjualan - (float) $transaction->jumlah_bayar),
            'notes' => $transaction->keterangan,
            'items' => $transaction->details->map(function ($detail) use ($transaction) {
                $variant = $detail->botolVariant;

                return [
                    'warehouse' => $detail->gudang?->nama_gudang ?? $transaction->gudang?->nama_gudang,
                    'code' => $detail->tipe_item === 'BOTOL'
                        ? ($detail->botolKosong?->kode_botol ?? $detail->botol?->kode_botol)
                        : $detail->barang?->kode_barang,
                    'name' => $detail->nama_item ?? $detail->barang?->nama_barang ?? $detail->botolKosong?->nama_botol ?? $detail->botol?->nama_botol ?? '-',
                    'qty' => (float) ($detail->qty_input ?: $detail->konversi_qty_dasar ?: $detail->qty_ml),
                    'unit' => $detail->satuan_dasar === 'ML' && $detail->satuan_input === 'BOTOL' ? 'BOTOL ISI' : ($detail->satuan_input ?? 'ML'),
                    'variant' => $variant ? $variant->nama_botol : null,
                    'price' => (float) ($detail->harga ?: $detail->harga_jual_per_ml),
                    'price_unit' => $detail->satuan_dasar === 'ML' ? 'ML' : ($detail->satuan_input ?? 'BOTOL'),
                    'subtotal' => (float) $detail->subtotal_jual,
                    'discount' => (float) $detail->discount,
                    'capacity_ml' => $detail->satuan_dasar === 'BOTOL' ? (float) $detail->qty_ml : null,
                    'price_per_ml' => (float) $detail->harga_jual_per_ml,
                ];
            })->values()->all(),
            'total_qty' => (float) $transaction->total_qty_ml,
            'total_bottle' => (float) $transaction->total_qty_botol,
            'discount' => (float) $transaction->discount,
            'jatuh_tempo' => in_array($transaction->metode_pembayaran, ['TEMPO', 'DP'], true) && $transaction->jatuh_tempo ? optional($transaction->jatuh_tempo)->format('d/m/Y') : null,
            'total' => (float) $transaction->total_penjualan,
            'store_name' => app(SettingsService::class)->get()['store_name'],
        ];
    }

    private function pembelianRules(): array
    {
        return [
            'tanggal' => ['nullable', 'date'],
            'id_supplier' => ['required', 'exists:tm_supplier,id'],
            'id_gudang' => ['required', 'exists:tm_gudang,id'],
            'metode_pembayaran' => ['required', 'in:CASH,TRANSFER,SPLIT,TEMPO,DP'],
            'cash_amount' => ['nullable', 'required_if:metode_pembayaran,SPLIT', 'numeric', 'min:0.01'],
            'transfer_amount' => ['nullable', 'required_if:metode_pembayaran,SPLIT', 'numeric', 'min:0.01'],
            'jumlah_bayar' => ['nullable', 'numeric', 'min:0'],
            'discount' => ['nullable', 'numeric', 'min:0'],
            'jatuh_tempo' => ['nullable', 'date'],
            'keterangan' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.tipe_item' => ['required', 'in:BIBIT,ABSOLUTE,BOTOL'],
            'items.*.item_id' => ['required', 'integer'],
            'items.*.id_barang' => ['nullable', 'exists:tm_barang_bibit,id'],
            'items.*.id_botol' => ['nullable', 'exists:tm_botol,id'],
            'items.*.qty_input' => ['required', 'numeric', 'min:0.01'],
            'items.*.satuan_input' => ['required', 'in:ML,LITER,BOTOL,DUS'],
            'items.*.harga' => ['nullable', 'numeric', 'min:0.01'],
            'items.*.harga_beli_per_ml' => ['nullable', 'numeric', 'min:0.01'],
        ];
    }

    private function penjualanBotolKosongRules(): array
    {
        return [
            'tanggal' => ['nullable', 'date'],
            'id_customer' => ['required', 'exists:tm_customer,id'],
            'manual_customer_name' => ['nullable', 'string', 'max:255'],
            'id_sales' => ['nullable', 'exists:tm_sales,id'],
            'id_gudang' => ['required', 'exists:tm_gudang,id'],
            'metode_pembayaran' => ['required', 'in:CASH,TRANSFER,SPLIT,TEMPO,DP'],
            'cash_amount' => ['nullable', 'required_if:metode_pembayaran,SPLIT', 'numeric', 'min:0.01'],
            'transfer_amount' => ['nullable', 'required_if:metode_pembayaran,SPLIT', 'numeric', 'min:0.01'],
            'jumlah_bayar' => ['nullable', 'numeric', 'min:0'],
            'discount' => ['nullable', 'numeric', 'min:0'],
            'jatuh_tempo' => ['nullable', 'date'],
            'keterangan' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.item_id' => ['required', 'exists:tm_botol_kosong,id'],
            'items.*.qty_input' => ['required', 'numeric', 'min:0.01'],
            'items.*.satuan_input' => ['required', 'in:BOTOL,DUS'],
            'items.*.harga' => ['nullable', 'numeric', 'min:0.01'],
            'items.*.discount' => ['nullable', 'numeric', 'min:0'],
        ];
    }

    private function penjualanRules(): array
    {
        return [
            'tanggal' => ['nullable', 'date'],
            'id_customer' => ['nullable', 'required_without:manual_customer_name', 'exists:tm_customer,id'],
            'manual_customer_name' => ['nullable', 'required_without:id_customer', 'string', 'max:255'],
            'tipe_penjualan' => ['required', 'in:RETAIL,GROSIR,SALES'],
            'id_sales' => ['nullable', 'exists:tm_sales,id'],
            'id_gudang' => ['required', 'exists:tm_gudang,id'],
            'metode_pembayaran' => ['required', 'in:CASH,TRANSFER,SPLIT,TEMPO,DP'],
            'cash_amount' => ['nullable', 'required_if:metode_pembayaran,SPLIT', 'numeric', 'min:0.01'],
            'transfer_amount' => ['nullable', 'required_if:metode_pembayaran,SPLIT', 'numeric', 'min:0.01'],
            'jumlah_bayar' => ['nullable', 'numeric', 'min:0'],
            'discount' => ['nullable', 'numeric', 'min:0'],
            'jatuh_tempo' => ['nullable', 'date'],
            'keterangan' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.tipe_item' => ['required', 'in:BIBIT,ABSOLUTE,BOTOL'],
            'items.*.id_gudang' => ['nullable', 'integer', 'exists:tm_gudang,id'],
            'items.*.item_id' => ['required', 'integer'],
            'items.*.id_barang' => ['nullable', 'exists:tm_barang_bibit,id'],
            'items.*.id_botol' => ['nullable', 'exists:tm_botol,id'],
            'items.*.qty_input' => ['required', 'numeric', 'min:0.01'],
            'items.*.satuan_input' => ['required', 'in:ML,LITER,BOTOL,DUS'],
            'items.*.harga' => ['nullable', 'numeric', 'min:0.01'],
            'items.*.discount' => ['nullable', 'numeric', 'min:0'],
        ];
    }

    private function validationMessages(): array
    {
        return [
            'required' => 'Kolom ini wajib diisi.',
            'items.*.item_id.required' => 'Pilih item barang.',
            'items.*.qty_input.required' => 'Qty wajib diisi.',
            'items.*.qty_input.min' => 'Qty minimal :min.',
            'items.*.harga.required' => 'Harga wajib diisi.',
            'id_supplier.required' => 'Supplier wajib dipilih.',
            'id_customer.required_without' => 'Customer wajib dipilih atau isi nama customer manual.',
            'manual_customer_name.required_without' => 'Nama customer manual wajib diisi jika tidak memilih customer.',
            'id_gudang.required' => 'Kode Gudang wajib dipilih.',
            'metode_pembayaran.required' => 'Metode bayar wajib dipilih.',
        ];
    }
}
