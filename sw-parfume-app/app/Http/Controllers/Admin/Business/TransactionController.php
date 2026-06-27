<?php

namespace App\Http\Controllers\Admin\Business;

use App\Http\Controllers\Controller;
use App\Models\Business\BarangBibit;
use App\Models\Business\Botol;
use App\Models\Business\Customer;
use App\Models\Business\Gudang;
use App\Models\Business\Pembelian;
use App\Models\Business\Penjualan;
use App\Models\Business\Sales;
use App\Models\Business\Supplier;
use App\Models\Business\StokGudang;
use App\Services\Business\BusinessService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TransactionController extends Controller
{
    public function __construct(private readonly BusinessService $business) {}

    public function pembelian(): Response
    {
        return Inertia::render('admin/business/TransactionPage', [
            'type' => 'pembelian',
            'rows' => Pembelian::query()
                ->with(['supplier', 'gudang', 'details.barang', 'details.botol', 'hutang'])
                ->latest('id')
                ->paginate($this->perPage())
                ->withQueryString(),
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
            'rows' => Penjualan::query()
                ->with(['customer', 'sales', 'gudang', 'details.barang', 'details.botol', 'piutang'])
                ->where('tipe_penjualan', $salesType)
                ->latest('id')
                ->paginate($this->perPage())
                ->withQueryString(),
            'refs' => $this->refs(),
            'operationalDate' => $this->business->operationalDate()->toDateString(),
        ]);
    }

    public function riwayatPembelian(Request $request): Response
    {
        $rows = Pembelian::query()
            ->with(['supplier', 'gudang', 'details.barang', 'details.botol', 'hutang'])
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
            'rows' => $rows,
            'refs' => $this->refs(),
            'operationalDate' => $this->business->operationalDate()->toDateString(),
        ]);
    }

    public function riwayatPenjualan(Request $request, string $type): Response
    {
        abort_unless(in_array($type, ['retail', 'grosir', 'sales'], true), 404);
        $salesType = $type === 'retail' ? 'RETAIL' : 'GROSIR';

        $rows = Penjualan::query()
            ->with(['customer', 'sales', 'gudang', 'details.barang', 'details.botol', 'piutang'])
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
            'rows' => $rows,
            'refs' => $this->refs(),
            'operationalDate' => $this->business->operationalDate()->toDateString(),
        ]);
    }

    public function storePembelian(Request $request): RedirectResponse
    {
        $pembelian = $this->business->createPembelian($this->uppercase($request->validate($this->pembelianRules(), $this->validationMessages())));

        return redirect()
            ->route('business.pembelian.index')
            ->with('success', 'Pembelian berhasil disimpan.')
            ->with('receipt', $this->receiptPayload($pembelian, 'pembelian'));
    }

    public function storePenjualan(Request $request): RedirectResponse
    {
        $validated = $this->uppercase($request->validate($this->penjualanRules(), $this->validationMessages()));
        if ($validated['tipe_penjualan'] === 'RETAIL' && ! in_array($validated['metode_pembayaran'], ['CASH', 'TRANSFER'], true)) {
            return back()->withErrors(['metode_pembayaran' => 'Penjualan retail tidak boleh menggunakan tempo.'])->withInput();
        }
        $penjualan = $this->business->createPenjualan($validated);

        return redirect()
            ->route('business.penjualan.index', $penjualan->tipe_penjualan === 'GROSIR' ? 'sales' : 'retail')
            ->with('success', 'Penjualan berhasil disimpan.')
            ->with('receipt', $this->receiptPayload($penjualan, 'penjualan'));
    }

    private function refs(): array
    {
        return [
            'barang' => BarangBibit::query()->with(['brand', 'botol'])->where('status', 'AKTIF')->orderBy('nama_barang')->get(),
            'botol' => Botol::query()->where('status', 'AKTIF')->orderBy('varian_ml')->get(),
            'gudang' => Gudang::query()->where('status', 'AKTIF')->orderBy('nama_gudang')->get(),
            'supplier' => Supplier::query()->where('status', 'AKTIF')->orderBy('nama_supplier')->get(),
            'customer' => Customer::query()->where('status', 'AKTIF')->orderBy('nama_customer')->get(),
            'sales' => Sales::query()->where('status', 'AKTIF')->orderBy('nama_sales')->get(),
            'stok_gudang' => StokGudang::query()->get(['id_gudang', 'id_barang', 'stok_ml']),
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
            $type === 'pembelian' ? 'supplier' : 'customer',
            ...($type === 'penjualan' ? ['sales'] : []),
        ]);

        if ($type === 'pembelian') {
            return [
                'type' => 'pembelian',
                'title' => 'NOTA PEMBELIAN',
                'number' => $transaction->no_pembelian,
                'date' => optional($transaction->tanggal)->format('d/m/Y'),
                'party_label' => 'Supplier',
                'party_name' => $transaction->supplier?->nama_supplier ?? '-',
                'warehouse' => $transaction->gudang?->nama_gudang ?? '-',
                'payment_method' => $transaction->metode_pembayaran,
                'payment_status' => $transaction->status_pembayaran,
                'items' => $transaction->details->map(fn ($detail) => [
                    'name' => $detail->nama_item ?? $detail->barang?->nama_barang ?? $detail->botol?->nama_botol ?? '-',
                    'qty' => (float) ($detail->qty_input ?: $detail->konversi_qty_dasar ?: $detail->qty_ml),
                    'unit' => $detail->satuan_input ?? 'ML',
                    'price' => (float) ($detail->harga ?: $detail->harga_beli_per_ml),
                    'subtotal' => (float) $detail->subtotal,
                    'discount' => (float) $detail->discount,
                    'capacity_ml' => $detail->satuan_dasar === 'BOTOL' ? (float) $detail->qty_ml : null,
                    'price_per_ml' => (float) $detail->harga_beli_per_ml,
                ])->values()->all(),
                'total_qty' => (float) $transaction->total_qty_ml,
                'total_bottle' => (float) $transaction->total_qty_botol,
                'discount' => (float) $transaction->discount,
                'total' => (float) $transaction->total_pembelian,
                'store_name' => app(\App\Services\SettingsService::class)->get()['store_name'],
            ];
        }

        return [
            'type' => 'penjualan',
            'title' => 'NOTA PENJUALAN',
            'number' => $transaction->no_penjualan,
            'date' => optional($transaction->tanggal)->format('d/m/Y'),
            'party_label' => 'Customer',
            'party_name' => $transaction->customer?->nama_customer ?? $transaction->manual_customer_name ?? '-',
            'sales' => $transaction->sales?->nama_sales ?? '-',
            'warehouse' => $transaction->gudang?->nama_gudang ?? '-',
            'payment_method' => $transaction->metode_pembayaran,
            'payment_status' => $transaction->status_pembayaran,
            'items' => $transaction->details->map(fn ($detail) => [
                'name' => $detail->nama_item ?? $detail->barang?->nama_barang ?? $detail->botol?->nama_botol ?? '-',
                'qty' => (float) ($detail->qty_input ?: $detail->konversi_qty_dasar ?: $detail->qty_ml),
                'unit' => $detail->satuan_input ?? 'ML',
                'price' => (float) ($detail->harga ?: $detail->harga_jual_per_ml),
                    'subtotal' => (float) $detail->subtotal_jual,
                    'discount' => (float) $detail->discount,
                    'capacity_ml' => $detail->satuan_dasar === 'BOTOL' ? (float) $detail->qty_ml : null,
                    'price_per_ml' => (float) $detail->harga_jual_per_ml,
                ])->values()->all(),
                'total_qty' => (float) $transaction->total_qty_ml,
                'total_bottle' => (float) $transaction->total_qty_botol,
                'discount' => (float) $transaction->discount,
                'jatuh_tempo' => $transaction->metode_pembayaran === 'TEMPO' && $transaction->jatuh_tempo ? optional($transaction->jatuh_tempo)->format('d/m/Y') : null,
            'total' => (float) $transaction->total_penjualan,
            'store_name' => app(\App\Services\SettingsService::class)->get()['store_name'],
        ];
    }

    private function pembelianRules(): array
    {
        return [
            'tanggal' => ['nullable', 'date'],
            'id_supplier' => ['required', 'exists:tm_supplier,id'],
            'id_gudang' => ['required', 'exists:tm_gudang,id'],
            'metode_pembayaran' => ['required', 'in:CASH,TRANSFER,TEMPO,DP'],
            'jumlah_bayar' => ['nullable', 'numeric', 'min:0'],
            'discount' => ['nullable', 'numeric', 'min:0'],
            'jatuh_tempo' => ['nullable', 'date'],
            'keterangan' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.tipe_item' => ['required', 'in:BIBIT,ABSOLUTE,BOTOL'],
            'items.*.item_id' => ['required', 'integer'],
            'items.*.id_barang' => ['nullable', 'exists:tm_barang_bibit,id'],
            'items.*.qty_input' => ['required', 'numeric', 'min:0.01'],
            'items.*.satuan_input' => ['required', 'in:ML,LITER,BOTOL,DUS'],
            'items.*.harga' => ['nullable', 'numeric', 'min:0.01'],
            'items.*.harga_beli_per_ml' => ['nullable', 'numeric', 'min:0.01'],
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
            'metode_pembayaran' => ['required', 'in:CASH,TRANSFER,TEMPO,DP'],
            'jumlah_bayar' => ['nullable', 'numeric', 'min:0'],
            'discount' => ['nullable', 'numeric', 'min:0'],
            'jatuh_tempo' => ['nullable', 'date'],
            'keterangan' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.tipe_item' => ['required', 'in:BIBIT,ABSOLUTE,BOTOL'],
            'items.*.item_id' => ['required', 'integer'],
            'items.*.id_barang' => ['nullable', 'exists:tm_barang_bibit,id'],
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
            'id_gudang.required' => 'Gudang wajib dipilih.',
            'metode_pembayaran.required' => 'Metode bayar wajib dipilih.',
        ];
    }
}
