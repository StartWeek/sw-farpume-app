<?php

namespace App\Http\Controllers\Admin\Business;

use App\Http\Controllers\Controller;
use App\Models\Business\BarangBibit;
use App\Models\Business\Gudang;
use App\Models\Business\MutasiStok;
use App\Models\Business\StokGudang;
use App\Services\Business\BusinessService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class InventoryController extends Controller
{
    public function __construct(private readonly BusinessService $business) {}

    public function stock(): Response
    {
        return Inertia::render('admin/business/InventoryPage', [
            'mode' => 'stock',
            'rows' => StokGudang::query()
                ->with(['gudang', 'barang.brand', 'barang.botol'])
                ->latest('id')
                ->paginate($this->perPage())
                ->withQueryString(),
            'barang' => BarangBibit::query()->with(['brand', 'botol'])->where('status', 'AKTIF')->orderBy('nama_barang')->get(),
            'gudang' => Gudang::query()->where('status', 'AKTIF')->orderBy('nama_gudang')->get(),
        ]);
    }

    public function lowStock(): Response
    {
        $rows = StokGudang::query()
            ->with(['gudang', 'barang.brand', 'barang.botol'])
            ->whereColumn('stok_ml', '<=', 'minimum_stok_ml')
            ->latest('id')
            ->paginate($this->perPage())
            ->withQueryString();

        return Inertia::render('admin/business/InventoryPage', ['mode' => 'low', 'rows' => $rows, 'barang' => [], 'gudang' => []]);
    }

    public function mutations(): Response
    {
        return Inertia::render('admin/business/InventoryPage', [
            'mode' => 'mutations',
            'rows' => MutasiStok::query()
                ->with(['gudang', 'barang.brand', 'barang.botol'])
                ->latest('id')
                ->paginate($this->perPage())
                ->withQueryString(),
            'barang' => BarangBibit::query()->with(['brand', 'botol'])->where('status', 'AKTIF')->orderBy('nama_barang')->get(),
            'gudang' => Gudang::query()->where('status', 'AKTIF')->orderBy('nama_gudang')->get(),
        ]);
    }

    public function storeMutation(Request $request): RedirectResponse
    {
        $this->business->createStockMutation($this->uppercase($request->validate([
            'id_gudang' => ['required', 'exists:tm_gudang,id'],
            'id_barang' => ['required', 'exists:tm_barang_bibit,id'],
            'tipe_mutasi' => ['required', 'in:MASUK,KELUAR'],
            'jumlah_botol' => ['nullable', 'required_if:tipe_mutasi,MASUK', 'integer', 'min:1'],
            'qty_ml' => ['nullable', 'required_if:tipe_mutasi,KELUAR', 'numeric', 'min:0.01'],
            'no_transaksi' => ['nullable', 'string', 'max:255'],
            'keterangan' => ['nullable', 'string'],
        ], [
            'required' => 'Kolom ini wajib diisi.',
            'id_gudang.required' => 'Gudang belum dipilih.',
            'id_barang.required' => 'Barang belum dipilih.',
            'tipe_mutasi.required' => 'Tipe mutasi belum dipilih.',
            'jumlah_botol.required_if' => 'Jumlah botol wajib diisi untuk mutasi masuk.',
            'jumlah_botol.integer' => 'Jumlah botol harus angka bulat.',
            'jumlah_botol.min' => 'Jumlah botol minimal 1.',
            'qty_ml.required_if' => 'Qty ML wajib diisi untuk mutasi keluar.',
            'qty_ml.numeric' => 'Qty ML harus berupa angka.',
            'qty_ml.min' => 'Qty ML minimal :min.',
            'integer' => 'Harus berupa angka bulat.',
            'numeric' => 'Harus berupa angka.',
            'min' => 'Nilai minimal :min.',
        ])));

        return back()->with('success', 'Mutasi stok berhasil disimpan.');
    }

    private function perPage(): int
    {
        $perPage = (int) request('per_page', 10);

        return in_array($perPage, [10, 25, 50], true) ? $perPage : 10;
    }
}
