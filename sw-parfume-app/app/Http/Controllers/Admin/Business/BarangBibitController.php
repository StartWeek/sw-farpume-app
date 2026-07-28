<?php

namespace App\Http\Controllers\Admin\Business;

use App\Http\Controllers\Controller;
use App\Models\Business\BarangBibit;
use App\Models\Business\Brand;
use App\Models\Business\Gudang;
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
                ->with(['brand', 'gudang'])
                ->latest('id')
                ->paginate($this->perPage())
                ->withQueryString(),
            'brand' => Brand::query()->where('status', 'AKTIF')->orderBy('nama_brand')->get(),
            'gudang' => Gudang::query()->where('status', 'AKTIF')->orderBy('nama_gudang')->get(['id', 'kode_gudang', 'nama_gudang', 'tipe_gudang']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->business->createBarang($this->uppercase($request->validate($this->rules(), $this->messages())));

        return back()->with('success', 'Barang bibit berhasil ditambahkan.');
    }

    public function update(Request $request, BarangBibit $barang): RedirectResponse
    {
        $this->business->updateBarang($barang, $this->uppercase($request->validate($this->rules(), $this->messages())));

        return back()->with('success', 'Barang bibit berhasil diperbarui.');
    }

    public function destroy(BarangBibit $barang): RedirectResponse
    {
        try {
            $barang->delete();

            return back()->with('success', 'Barang bibit berhasil dihapus.');
        } catch (\Illuminate\Database\QueryException $e) {
            if ($e->getCode() === '23000') {
                return back()->with('error', 'Barang bibit tidak dapat dihapus karena masih digunakan oleh stok atau transaksi.');
            }

            throw $e;
        }
    }

    private function rules(): array
    {
        return [
            'nama_barang' => ['required', 'string', 'max:255'],
            'id_brand' => ['required', 'exists:tm_brand,id'],
            'id_gudang' => ['nullable', 'exists:tm_gudang,id'],
            'id_botol' => ['nullable', 'exists:tm_botol,id'],
            'jenis_barang' => ['required', 'in:BIBIT,ABSOLUTE'],
            'harga_beli_per_ml' => ['required', 'numeric', 'min:0.01'],
            'harga_jual_retail_per_ml' => ['required', 'numeric', 'min:0.01'],
            'harga_jual_grosir_per_ml' => ['required', 'numeric', 'min:0.01'],
            'minimum_stok_ml' => ['required', 'numeric', 'min:0'],
            'status' => ['required', 'in:AKTIF,NONAKTIF'],
        ];
    }

    private function messages(): array
    {
        return [
            'required' => 'Kolom ini wajib diisi.',
            'nama_barang.required' => 'Nama barang belum diisi.',
            'id_brand.required' => 'Brand belum dipilih.',
            'id_gudang.required' => 'Gudang belum dipilih.',
            'id_botol.required' => 'Botol stok belum dipilih.',
            'harga_beli_per_ml.required' => 'Harga beli per ML belum diisi.',
            'harga_beli_per_ml.numeric' => 'Harga beli per ML harus berupa angka.',
            'harga_beli_per_ml.min' => 'Harga beli per ML minimal :min.',
            'harga_jual_retail_per_ml.required' => 'Harga jual retail per ML belum diisi.',
            'harga_jual_retail_per_ml.numeric' => 'Harga jual retail per ML harus berupa angka.',
            'harga_jual_retail_per_ml.min' => 'Harga jual retail per ML minimal :min.',
            'harga_jual_grosir_per_ml.required' => 'Harga jual sales per ML belum diisi.',
            'harga_jual_grosir_per_ml.numeric' => 'Harga jual sales per ML harus berupa angka.',
            'harga_jual_grosir_per_ml.min' => 'Harga jual sales per ML minimal :min.',
            'minimum_stok_ml.required' => 'Minimum stok belum diisi.',
            'minimum_stok_ml.numeric' => 'Minimum stok harus berupa angka.',
            'status.required' => 'Status belum dipilih.',
            'jenis_barang.required' => 'Jenis barang belum dipilih.',
            'numeric' => 'Harus berupa angka.',
            'min' => 'Nilai minimal :min.',
        ];
    }

    private function perPage(): int
    {
        $perPage = (int) request('per_page', 10);

        return in_array($perPage, [10, 25, 50], true) ? $perPage : 10;
    }
}
