<?php

namespace App\Http\Controllers\Admin\Business;

use App\Http\Controllers\Controller;
use App\Models\Business\BarangBibit;
use App\Models\Business\Botol;
use App\Models\Business\Brand;
use App\Models\Business\Gudang;
use App\Models\Business\Supplier;
use App\Services\Business\BusinessService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class BarangBibitController extends Controller
{
    public function __construct(private readonly BusinessService $business) {}

    public function index(): Response
    {
        return Inertia::render('admin/business/BarangBibitPage', [
            'rows' => BarangBibit::query()
                ->with(['brand', 'gudang', 'botol', 'suppliers'])
                ->withSum('stok as stok_saat_ini_ml', 'stok_ml')
                ->latest('id')
                ->paginate($this->perPage())
                ->withQueryString(),
            'brand' => Brand::query()->where('status', 'AKTIF')->orderBy('nama_brand')->get(),
            'botol' => Botol::query()->where('status', 'AKTIF')->where('varian_ml', '>', 0)->orderBy('varian_ml')->get(['id', 'nama_botol', 'varian_ml']),
            'supplier' => Supplier::query()->where('status', 'AKTIF')->orderBy('nama_supplier')->get(['id', 'kode_supplier', 'nama_supplier']),
            'gudang' => Gudang::query()->where('status', 'AKTIF')->where('tipe_gudang', 'BIBIT')->orderBy('nama_gudang')->get(['id', 'kode_gudang', 'nama_gudang', 'tipe_gudang']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->business->createBarang([
            ...$this->uppercase($request->validate($this->rules(), $this->messages())),
            'status' => 'AKTIF',
        ]);

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
            \Illuminate\Support\Facades\DB::transaction(function () use ($barang): void {
                \App\Models\Business\SystemDate::query()->lockForUpdate()->firstOrCreate(['id' => 1], ['tanggal_system' => today()->toDateString()]);
                $current = BarangBibit::query()->lockForUpdate()->findOrFail($barang->id);
                if ($current->stok()->where('stok_ml', '>', 0)->exists()) {
                    throw \Illuminate\Validation\ValidationException::withMessages(['stock' => 'Barang masih memiliki stok. Catat perubahan melalui mutasi dan validasi sebelum menghapus master.']);
                }
                $current->delete();
            });

            return back()->with('success', 'Barang bibit berhasil dihapus.');
        } catch (\Illuminate\Validation\ValidationException $e) {
            return back()->with('error', collect($e->errors())->flatten()->first());
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
            'id_gudang' => ['nullable', Rule::exists('tm_gudang', 'id')->where('tipe_gudang', 'BIBIT')->where('status', 'AKTIF')],
            'id_botol' => ['required', 'integer', Rule::exists('tm_botol', 'id')->where(fn ($query) => $query->where('varian_ml', '>', 0))],
            'jenis_barang' => ['required', 'in:BIBIT,ABSOLUTE'],
            'supplier_ids' => ['sometimes', 'array'],
            'supplier_ids.*' => ['required', 'integer', 'distinct', Rule::exists('tm_supplier', 'id')->where('status', 'AKTIF')],
            'harga_beli_per_ml' => ['required', 'numeric', 'min:0.01'],
            'harga_jual_retail_per_ml' => ['required', 'numeric', 'min:0.01'],
            'harga_jual_grosir_per_ml' => ['required', 'numeric', 'min:0.01'],
            'minimum_stok_ml' => ['required', 'numeric', 'min:0'],
        ];
    }

    private function messages(): array
    {
        return [
            'required' => 'Kolom ini wajib diisi.',
            'nama_barang.required' => 'Nama barang belum diisi.',
            'id_brand.required' => 'Brand belum dipilih.',
            'id_gudang.required' => 'Gudang belum dipilih.',
            'id_gudang.exists' => 'Pilih gudang cairan yang aktif. Gudang botol kosong tidak dapat digunakan untuk Bibit atau Absolute.',
            'id_botol.required' => 'Pilih satu varian botol untuk barang ini.',
            'id_botol.exists' => 'Pilih varian botol dengan kapasitas lebih dari 0 ML.',
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
            'supplier_ids.*.exists' => 'Pilih supplier yang aktif.',
            'supplier_ids.*.distinct' => 'Supplier tidak boleh dipilih lebih dari sekali.',
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
