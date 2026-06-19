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
                ->with(['gudang', 'barang.wangi', 'barang.brand'])
                ->latest('id')
                ->paginate($this->perPage())
                ->withQueryString(),
            'barang' => BarangBibit::query()->with(['wangi', 'brand'])->where('status', 'AKTIF')->orderBy('nama_barang')->get(),
            'gudang' => Gudang::query()->where('status', 'AKTIF')->orderBy('nama_gudang')->get(),
        ]);
    }

    public function lowStock(): Response
    {
        $rows = StokGudang::query()
            ->with(['gudang', 'barang.wangi', 'barang.brand'])
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
                ->with(['gudang', 'barang.wangi', 'barang.brand'])
                ->latest('id')
                ->paginate($this->perPage())
                ->withQueryString(),
            'barang' => BarangBibit::query()->with(['wangi', 'brand'])->where('status', 'AKTIF')->orderBy('nama_barang')->get(),
            'gudang' => Gudang::query()->where('status', 'AKTIF')->orderBy('nama_gudang')->get(),
        ]);
    }

    public function storeMutation(Request $request): RedirectResponse
    {
        $this->business->createStockMutation($request->validate([
            'id_gudang' => ['required', 'exists:tm_gudang,id'],
            'id_barang' => ['required', 'exists:tm_barang_bibit,id'],
            'tipe_mutasi' => ['required', 'in:MASUK,KELUAR'],
            'qty_ml' => ['required', 'numeric', 'min:0.01'],
            'no_transaksi' => ['nullable', 'string', 'max:255'],
            'keterangan' => ['nullable', 'string'],
        ]));

        return back()->with('success', 'Mutasi stok berhasil disimpan.');
    }

    private function perPage(): int
    {
        $perPage = (int) request('per_page', 10);

        return in_array($perPage, [10, 25, 50, 100], true) ? $perPage : 10;
    }
}
