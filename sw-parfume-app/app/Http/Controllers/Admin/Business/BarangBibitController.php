<?php

namespace App\Http\Controllers\Admin\Business;

use App\Http\Controllers\Controller;
use App\Models\Business\BarangBibit;
use App\Models\Business\Brand;
use App\Models\Business\Botol;
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
                ->with(['brand', 'botol'])
                ->latest('id')
                ->paginate($this->perPage())
                ->withQueryString(),
            'brand' => Brand::query()->where('status', 'AKTIF')->orderBy('nama_brand')->get(),
            'botol' => Botol::query()->where('status', 'AKTIF')->orderBy('varian_ml')->get(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->business->createBarang($this->uppercase($request->validate($this->rules())));

        return back()->with('success', 'Barang bibit berhasil ditambahkan.');
    }

    public function update(Request $request, BarangBibit $barang): RedirectResponse
    {
        $this->business->updateBarang($barang, $this->uppercase($request->validate($this->rules())));

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
            'nama_barang' => ['required', 'string', 'max:255'],
            'id_brand' => ['required', 'exists:tm_brand,id'],
            'id_botol' => ['required', 'exists:tm_botol,id'],
            'jenis_barang' => ['required', 'in:BIBIT,ABSOLUTE'],
            'harga_beli_per_ml' => ['required', 'numeric', 'min:0.01'],
            'harga_jual_retail_per_ml' => ['required', 'numeric', 'min:0.01'],
            'harga_jual_grosir_per_ml' => ['required', 'numeric', 'min:0.01'],
            'harga_beli_per_botol' => ['nullable', 'numeric', 'min:0'],
            'harga_jual_per_botol' => ['nullable', 'numeric', 'min:0'],
            'minimum_stok_ml' => ['nullable', 'numeric', 'min:0'],
            'status' => ['required', 'in:AKTIF,NONAKTIF'],
        ];
    }

    private function perPage(): int
    {
        $perPage = (int) request('per_page', 10);

        return in_array($perPage, [10, 25, 50], true) ? $perPage : 10;
    }
}
