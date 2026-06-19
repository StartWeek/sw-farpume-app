<?php

namespace App\Http\Controllers\Admin\Business;

use App\Http\Controllers\Controller;
use App\Services\Business\BusinessService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MasterController extends Controller
{
    public function __construct(private readonly BusinessService $business) {}

    public function index(string $resource): Response
    {
        abort_unless(isset(BusinessService::MASTERS[$resource]), 404);

        $config = BusinessService::MASTERS[$resource];
        $model = $config['model'];

        return Inertia::render('admin/business/MasterPage', [
            'resource' => $resource,
            'title' => $config['label'],
            'rows' => $model::query()
                ->latest('id')
                ->paginate($this->perPage())
                ->withQueryString(),
            'fields' => $this->fields($resource),
        ]);
    }

    public function store(Request $request, string $resource): RedirectResponse
    {
        abort_unless(isset(BusinessService::MASTERS[$resource]), 404);

        $this->business->createMaster($resource, $request->validate($this->rules($resource)));

        return back()->with('success', 'Data berhasil ditambahkan.');
    }

    public function update(Request $request, string $resource, int $id): RedirectResponse
    {
        abort_unless(isset(BusinessService::MASTERS[$resource]), 404);

        $model = BusinessService::MASTERS[$resource]['model'];
        $row = $model::query()->findOrFail($id);
        $row->update($request->validate($this->rules($resource)));

        return back()->with('success', 'Data berhasil diperbarui.');
    }

    public function destroy(string $resource, int $id): RedirectResponse
    {
        abort_unless(isset(BusinessService::MASTERS[$resource]), 404);

        $model = BusinessService::MASTERS[$resource]['model'];
        $model::query()->findOrFail($id)->delete();

        return back()->with('success', 'Data berhasil dihapus.');
    }

    private function rules(string $resource): array
    {
        return match ($resource) {
            'wangi' => ['nama_wangi' => ['required', 'string', 'max:255'], 'kategori_aroma' => ['nullable', 'string', 'max:255'], 'status' => ['required', 'in:AKTIF,NONAKTIF']],
            'brand' => ['nama_brand' => ['required', 'string', 'max:255'], 'negara_asal' => ['nullable', 'string', 'max:255'], 'keterangan' => ['nullable', 'string'], 'status' => ['required', 'in:AKTIF,NONAKTIF']],
            'gudang' => ['nama_gudang' => ['required', 'string', 'max:255'], 'alamat' => ['nullable', 'string'], 'status' => ['required', 'in:AKTIF,NONAKTIF']],
            'supplier' => ['nama_supplier' => ['required', 'string', 'max:255'], 'no_hp' => ['nullable', 'string', 'max:50'], 'alamat' => ['nullable', 'string'], 'keterangan' => ['nullable', 'string'], 'status' => ['required', 'in:AKTIF,NONAKTIF']],
            'customer' => ['nama_customer' => ['required', 'string', 'max:255'], 'tipe_customer' => ['required', 'in:RETAIL,GROSIR,SALES,TOKO'], 'no_hp' => ['nullable', 'string', 'max:50'], 'alamat' => ['nullable', 'string'], 'limit_piutang' => ['nullable', 'numeric', 'min:0'], 'status' => ['required', 'in:AKTIF,NONAKTIF']],
            'sales' => ['nama_sales' => ['required', 'string', 'max:255'], 'no_hp' => ['nullable', 'string', 'max:50'], 'alamat' => ['nullable', 'string'], 'status' => ['required', 'in:AKTIF,NONAKTIF']],
            'botol' => ['varian_ml' => ['required', 'integer', 'min:1'], 'nama_botol' => ['required', 'string', 'max:255'], 'isi_per_dus' => ['required', 'integer', 'min:1'], 'harga_beli_per_botol' => ['nullable', 'numeric', 'min:0'], 'harga_jual_per_botol' => ['nullable', 'numeric', 'min:0'], 'harga_jual_per_dus' => ['nullable', 'numeric', 'min:0'], 'stock_botol' => ['nullable', 'numeric', 'min:0'], 'status' => ['required', 'in:AKTIF,NONAKTIF']],
            default => [],
        };
    }

    private function perPage(): int
    {
        $perPage = (int) request('per_page', 10);

        return in_array($perPage, [10, 25, 50, 100], true) ? $perPage : 10;
    }

    private function fields(string $resource): array
    {
        $commonStatus = ['name' => 'status', 'label' => 'Status', 'type' => 'select', 'options' => ['AKTIF', 'NONAKTIF']];

        return match ($resource) {
            'wangi' => [['name' => 'nama_wangi', 'label' => 'Nama Wangi'], ['name' => 'kategori_aroma', 'label' => 'Kategori Aroma'], $commonStatus],
            'brand' => [['name' => 'nama_brand', 'label' => 'Nama Brand'], ['name' => 'negara_asal', 'label' => 'Negara Asal'], ['name' => 'keterangan', 'label' => 'Keterangan', 'type' => 'textarea'], $commonStatus],
            'gudang' => [['name' => 'nama_gudang', 'label' => 'Nama Gudang'], ['name' => 'alamat', 'label' => 'Alamat', 'type' => 'textarea'], $commonStatus],
            'supplier' => [['name' => 'nama_supplier', 'label' => 'Nama Supplier'], ['name' => 'no_hp', 'label' => 'No HP'], ['name' => 'alamat', 'label' => 'Alamat', 'type' => 'textarea'], ['name' => 'keterangan', 'label' => 'Keterangan', 'type' => 'textarea'], $commonStatus],
            'customer' => [['name' => 'nama_customer', 'label' => 'Nama Customer'], ['name' => 'tipe_customer', 'label' => 'Tipe Customer', 'type' => 'select', 'options' => ['RETAIL', 'SALES', 'TOKO']], ['name' => 'no_hp', 'label' => 'No HP'], ['name' => 'alamat', 'label' => 'Alamat', 'type' => 'textarea'], ['name' => 'limit_piutang', 'label' => 'Limit Piutang', 'type' => 'number'], $commonStatus],
            'sales' => [['name' => 'nama_sales', 'label' => 'Nama Sales'], ['name' => 'no_hp', 'label' => 'No HP'], ['name' => 'alamat', 'label' => 'Alamat', 'type' => 'textarea'], $commonStatus],
            'botol' => [['name' => 'nama_botol', 'label' => 'Nama Botol'], ['name' => 'varian_ml', 'label' => 'Varian ML', 'type' => 'number'], ['name' => 'isi_per_dus', 'label' => 'Isi Per Dus', 'type' => 'number'], ['name' => 'harga_beli_per_botol', 'label' => 'Harga Beli/Botol', 'type' => 'number'], ['name' => 'harga_jual_per_botol', 'label' => 'Harga Jual/Botol', 'type' => 'number'], ['name' => 'harga_jual_per_dus', 'label' => 'Harga Jual/Dus', 'type' => 'number'], ['name' => 'stock_botol', 'label' => 'Stok Botol', 'type' => 'number'], $commonStatus],
            default => [],
        };
    }
}
