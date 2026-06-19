<?php

namespace App\Http\Controllers\Admin\Business;

use App\Http\Controllers\Controller;
use App\Models\Business\BarangBibit;
use App\Models\Business\Brand;
use App\Models\Business\Wangi;
use App\Services\Business\BusinessService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BarangBibitController extends Controller
{
    public function __construct(private readonly BusinessService $business) {}

    public function index(): Response
    {
        return Inertia::render('admin/business/BarangBibitPage', [
            'rows' => BarangBibit::query()
                ->with(['wangi', 'brand'])
                ->latest('id')
                ->paginate($this->perPage())
                ->withQueryString(),
            'wangi' => Wangi::query()->where('status', 'AKTIF')->orderBy('nama_wangi')->get(),
            'brand' => Brand::query()->where('status', 'AKTIF')->orderBy('nama_brand')->get(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->business->createBarang($request->validate($this->rules()));

        return back()->with('success', 'Barang bibit berhasil ditambahkan.');
    }

    public function update(Request $request, BarangBibit $barang): RedirectResponse
    {
        $this->business->updateBarang($barang, $request->validate($this->rules()));

        return back()->with('success', 'Barang bibit berhasil diperbarui.');
    }

    public function destroy(BarangBibit $barang): RedirectResponse
    {
        $barang->delete();

        return back()->with('success', 'Barang bibit berhasil dihapus.');
    }

    private function rules(): array
    {
        return [
            'id_wangi' => ['required', 'exists:tm_wangi,id'],
            'id_brand' => ['required', 'exists:tm_brand,id'],
            'jenis_barang' => ['required', 'in:BIBIT,ABSOLUTE'],
            'harga_beli_per_ml' => ['required', 'numeric', 'min:0.01'],
            'harga_jual_retail_per_ml' => ['required', 'numeric', 'min:0.01'],
            'harga_jual_grosir_per_ml' => ['required', 'numeric', 'min:0.01'],
            'minimum_stok_ml' => ['nullable', 'numeric', 'min:0'],
            'status' => ['required', 'in:AKTIF,NONAKTIF'],
        ];
    }

    private function perPage(): int
    {
        $perPage = (int) request('per_page', 10);

        return in_array($perPage, [10, 25, 50, 100], true) ? $perPage : 10;
    }
}
