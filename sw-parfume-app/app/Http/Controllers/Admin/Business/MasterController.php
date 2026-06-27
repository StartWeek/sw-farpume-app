<?php

namespace App\Http\Controllers\Admin\Business;

use App\Http\Controllers\Controller;
use App\Services\Business\BusinessService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
        $selectedGudang = $resource === 'botol-kosong' ? (int) request('filter_gudang', 0) : 0;

        return Inertia::render('admin/business/MasterPage', [
            'resource' => $resource,
            'title' => $config['label'],
            'rows' => $model::query()
                ->when($resource === 'botol-kosong', fn ($query) => $query->with('gudang'))
                ->when($selectedGudang > 0, fn ($query) => $query->where('id_gudang', $selectedGudang))
                ->latest('id')
                ->paginate($this->perPage())
                ->withQueryString(),
            'fields' => $this->fields($resource),
            'refs' => $this->refs($resource),
            'selectedGudang' => $selectedGudang,
            'gudangOptions' => $resource === 'botol-kosong'
                ? \App\Models\Business\Gudang::query()
                    ->where('status', 'AKTIF')
                    ->where('tipe_gudang', 'BOTOL')
                    ->orderBy('kode_gudang')
                    ->get(['id', 'kode_gudang', 'nama_gudang'])
                : [],
        ]);
    }

    public function store(Request $request, string $resource): RedirectResponse
    {
        abort_unless(isset(BusinessService::MASTERS[$resource]), 404);

        $payload = $this->normalizePayload(
            $resource,
            $this->uppercase($request->validate($this->rules($resource), $this->messages($resource))),
        );
        $this->business->createMaster($resource, $payload);

        return back()->with('success', 'Data berhasil ditambahkan.');
    }

    public function update(Request $request, string $resource, int $id): RedirectResponse
    {
        abort_unless(isset(BusinessService::MASTERS[$resource]), 404);

        $model = BusinessService::MASTERS[$resource]['model'];
        $row = $model::query()->findOrFail($id);
        $payload = $this->normalizePayload(
            $resource,
            $this->uppercase($request->validate($this->rules($resource), $this->messages($resource))),
        );
        $row->update($payload);

        return back()->with('success', 'Data berhasil diperbarui.');
    }

    public function destroy(string $resource, int $id): RedirectResponse
    {
        abort_unless(isset(BusinessService::MASTERS[$resource]), 404);

        $config = BusinessService::MASTERS[$resource];
        $model = $config['model'];

        try {
            $model::query()->findOrFail($id)->delete();

            return back()->with('success', 'Data berhasil dihapus.');
        } catch (\Illuminate\Database\QueryException $e) {
            if ($e->getCode() === '23000') {
                return back()->with('error', "{$config['label']} tidak dapat dihapus karena masih digunakan oleh data lain.");
            }

            throw $e;
        }
    }

    private function rules(string $resource): array
    {
        return match ($resource) {
            'brand' => ['nama_brand' => ['required', 'string', 'max:255'], 'negara_asal' => ['nullable', 'string', 'max:255'], 'keterangan' => ['nullable', 'string'], 'status' => ['required', 'in:AKTIF,NONAKTIF']],
            'gudang' => ['nama_gudang' => ['required', 'string', 'max:255'], 'tipe_gudang' => ['required', 'string', 'max:255'], 'alamat' => ['nullable', 'string'], 'status' => ['required', 'in:AKTIF,NONAKTIF']],
            'supplier' => ['nama_supplier' => ['required', 'string', 'max:255'], 'pic_name' => ['nullable', 'string', 'max:255'], 'no_hp' => ['nullable', 'string', 'max:50'], 'alamat' => ['nullable', 'string'], 'keterangan' => ['nullable', 'string'], 'status' => ['required', 'in:AKTIF,NONAKTIF']],
            'customer' => ['nama_customer' => ['required', 'string', 'max:255'], 'tipe_customer' => ['required', 'in:RETAIL,SALES'], 'no_hp' => ['nullable', 'string', 'max:50'], 'alamat' => ['nullable', 'string'], 'limit_piutang' => ['nullable', 'numeric', 'min:0'], 'status' => ['required', 'in:AKTIF,NONAKTIF']],
            'sales' => ['nama_sales' => ['required', 'string', 'max:255'], 'no_hp' => ['nullable', 'string', 'max:50'], 'alamat' => ['nullable', 'string'], 'status' => ['required', 'in:AKTIF,NONAKTIF']],
            'botol' => ['varian_ml' => ['required', 'integer', 'min:1'], 'nama_botol' => ['required', 'string', 'max:255'], 'isi_per_dus' => ['required', 'integer', 'min:1'], 'status' => ['required', 'in:AKTIF,NONAKTIF']],
            'botol-kosong' => ['id_gudang' => ['required', 'exists:tm_gudang,id'], 'nama_botol' => ['required', 'string', 'max:255'], 'kapasitas' => ['required', 'integer', 'min:1'], 'harga_beli' => ['nullable', 'numeric', 'min:0'], 'harga_jual' => ['nullable', 'numeric', 'min:0'], 'stock' => ['nullable', 'numeric', 'min:0'], 'satuan' => ['required', 'string', 'max:50'], 'status' => ['required', 'in:AKTIF,NONAKTIF'], 'keterangan' => ['nullable', 'string']],
            default => [],
        };
    }

    private function messages(string $resource): array
    {
        $labels = [
            'brand' => ['nama_brand' => 'Nama Brand', 'negara_asal' => 'Negara Asal', 'keterangan' => 'Keterangan', 'status' => 'Status'],
            'gudang' => ['nama_gudang' => 'Nama Gudang', 'tipe_gudang' => 'Tipe Gudang', 'alamat' => 'Alamat', 'status' => 'Status'],
            'supplier' => ['nama_supplier' => 'Nama Supplier', 'pic_name' => 'PIC Name', 'no_hp' => 'No HP', 'alamat' => 'Alamat', 'keterangan' => 'Keterangan', 'status' => 'Status'],
            'customer' => ['nama_customer' => 'Nama Customer', 'tipe_customer' => 'Tipe Customer', 'no_hp' => 'No HP', 'alamat' => 'Alamat', 'limit_piutang' => 'Limit Piutang', 'status' => 'Status'],
            'sales' => ['nama_sales' => 'Nama Sales', 'no_hp' => 'No HP', 'alamat' => 'Alamat', 'status' => 'Status'],
            'botol' => ['varian_ml' => 'Varian ML', 'nama_botol' => 'Nama Botol', 'isi_per_dus' => 'Isi Per Dus', 'status' => 'Status'],
            'botol-kosong' => ['id_gudang' => 'Kode Gudang', 'nama_botol' => 'Nama Botol', 'kapasitas' => 'Kapasitas', 'satuan' => 'Satuan', 'status' => 'Status'],
        ];

        $msgs = [
            'required' => 'Kolom ini wajib diisi.',
            'numeric' => 'Harus berupa angka.',
            'integer' => 'Harus berupa angka bulat.',
            'min' => 'Nilai minimal :min.',
            'string' => 'Harus berupa teks.',
            'max' => 'Maksimal :max karakter.',
            'in' => 'Pilihan tidak valid.',
        ];

        foreach (($labels[$resource] ?? []) as $field => $label) {
            $msgs["{$field}.required"] = "{$label} belum diisi.";
        }

        return $msgs;
    }

    private function perPage(): int
    {
        $perPage = (int) request('per_page', 10);

        return in_array($perPage, [10, 25, 50, 100], true) ? $perPage : 10;
    }

    private function normalizePayload(string $resource, array $payload): array
    {
        if ($resource === 'customer' && ($payload['limit_piutang'] ?? null) === null) {
            $payload['limit_piutang'] = 0;
        }

        return $payload;
    }

    private function refs(string $resource): array
    {
        if ($resource !== 'botol-kosong') {
            return [];
        }

        return [
            'gudang' => \App\Models\Business\Gudang::query()
                ->where('status', 'AKTIF')
                ->where('tipe_gudang', 'BOTOL')
                ->orderBy('kode_gudang')
                ->get(['id', 'kode_gudang', 'nama_gudang']),
        ];
    }

    private function fields(string $resource): array
    {
        $commonStatus = ['name' => 'status', 'label' => 'Status', 'type' => 'select', 'options' => ['AKTIF', 'NONAKTIF']];

        return match ($resource) {
            'brand' => [['name' => 'nama_brand', 'label' => 'Nama Brand'], ['name' => 'negara_asal', 'label' => 'Negara Asal'], ['name' => 'keterangan', 'label' => 'Keterangan', 'type' => 'textarea'], $commonStatus],
            'gudang' => [['name' => 'nama_gudang', 'label' => 'Nama Gudang'], ['name' => 'tipe_gudang', 'label' => 'Tipe Gudang'], ['name' => 'alamat', 'label' => 'Alamat', 'type' => 'textarea'], $commonStatus],
            'supplier' => [['name' => 'nama_supplier', 'label' => 'Nama Supplier'], ['name' => 'pic_name', 'label' => 'PIC Name'], ['name' => 'no_hp', 'label' => 'No HP'], ['name' => 'alamat', 'label' => 'Alamat', 'type' => 'textarea'], ['name' => 'keterangan', 'label' => 'Keterangan', 'type' => 'textarea'], $commonStatus],
            'customer' => [['name' => 'nama_customer', 'label' => 'Nama Customer'], ['name' => 'tipe_customer', 'label' => 'Tipe Customer', 'type' => 'select', 'options' => ['RETAIL', 'SALES']], ['name' => 'no_hp', 'label' => 'No HP'], ['name' => 'alamat', 'label' => 'Alamat', 'type' => 'textarea'], ['name' => 'limit_piutang', 'label' => 'Limit Piutang', 'type' => 'number'], $commonStatus],
            'sales' => [['name' => 'nama_sales', 'label' => 'Nama Sales'], ['name' => 'no_hp', 'label' => 'No HP'], ['name' => 'alamat', 'label' => 'Alamat', 'type' => 'textarea'], $commonStatus],
            'botol' => [['name' => 'nama_botol', 'label' => 'Nama Botol'], ['name' => 'varian_ml', 'label' => 'Varian ML', 'type' => 'number'], ['name' => 'isi_per_dus', 'label' => 'Isi Per Dus', 'type' => 'number'], $commonStatus],
            'botol-kosong' => [['name' => 'id_gudang', 'label' => 'Kode Gudang', 'type' => 'select', 'optionsRef' => 'gudang', 'optionValue' => 'id', 'optionLabel' => 'kode_gudang', 'optionDescription' => 'nama_gudang'], ['name' => 'nama_botol', 'label' => 'Nama Botol'], ['name' => 'kapasitas', 'label' => 'Kapasitas ML', 'type' => 'number'], ['name' => 'harga_beli', 'label' => 'Harga Beli', 'type' => 'number'], ['name' => 'harga_jual', 'label' => 'Harga Jual', 'type' => 'number'], ['name' => 'stock', 'label' => 'Stock', 'type' => 'number'], ['name' => 'satuan', 'label' => 'Satuan'], ['name' => 'keterangan', 'label' => 'Keterangan', 'type' => 'textarea'], $commonStatus],
            default => [],
        };
    }
}
