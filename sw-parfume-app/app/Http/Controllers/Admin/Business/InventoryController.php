<?php

namespace App\Http\Controllers\Admin\Business;

use App\Http\Controllers\Controller;
use App\Models\Business\BarangBibit;
use App\Models\Business\Botol;
use App\Models\Business\BotolKosong;
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
                ->with(['gudang', 'barang.brand', 'barang.botol', 'botolVariant'])
                ->latest('id')
                ->paginate($this->perPage())
                ->withQueryString(),
            'barang' => BarangBibit::query()->with(['brand', 'botol'])->where('status', 'AKTIF')->orderBy('nama_barang')->get(['id', 'kode_barang', 'nama_barang', 'jenis_barang', 'id_botol', 'id_gudang']),
            'botol' => Botol::query()->where('status', 'AKTIF')->orderBy('varian_ml')->get(),
            'gudang' => Gudang::query()->where('status', 'AKTIF')->orderBy('nama_gudang')->get(),
            'botolKosong' => BotolKosong::query()->with('gudang')->where('status', 'AKTIF')->orderBy('nama_botol')->get(),
            'stokGudangList' => StokGudang::query()->where('stok_ml', '>', 0)->get(['id_gudang', 'id_barang', 'stok_ml']),
            // Untuk filter barang berdasarkan gudang saat tambah stok (BIBIT only)
            'stokGudangMap' => StokGudang::query()
                ->where('stok_ml', '>', 0)
                ->get(['id_barang', 'id_gudang'])
                ->groupBy('id_gudang')
                ->map(fn ($items) => $items->pluck('id_barang')->unique()->values()),
        ]);
    }

    public function lowStock(): Response
    {
        $rows = StokGudang::query()
            ->with(['gudang', 'barang.brand', 'barang.botol', 'botolVariant'])
            ->whereColumn('stok_ml', '<=', 'minimum_stok_ml')
            ->latest('id')
            ->paginate($this->perPage())
            ->withQueryString();

        return Inertia::render('admin/business/InventoryPage', ['mode' => 'low', 'rows' => $rows, 'barang' => [], 'botol' => [], 'gudang' => []]);
    }

    public function mutations(): Response
    {
        return Inertia::render('admin/business/InventoryPage', [
            'mode' => 'mutations',
            'rows' => MutasiStok::query()
                ->with(['gudang', 'barang.brand', 'barang.botol', 'botolVariant'])
                ->latest('id')
                ->paginate($this->perPage())
                ->withQueryString(),
            'barang' => BarangBibit::query()->with(['brand', 'botol'])->where('status', 'AKTIF')->orderBy('nama_barang')->get(['id', 'kode_barang', 'nama_barang', 'jenis_barang', 'id_botol', 'id_gudang']),
            'botol' => Botol::query()->where('status', 'AKTIF')->orderBy('varian_ml')->get(),
            'gudang' => Gudang::query()->where('status', 'AKTIF')->orderBy('nama_gudang')->get(),
            'botolKosong' => BotolKosong::query()->with('gudang')->where('status', 'AKTIF')->orderBy('nama_botol')->get(),
            // Untuk filter barang berdasarkan gudang saat mutasi KELUAR
            'stokGudangMap' => StokGudang::query()
                ->where('stok_ml', '>', 0)
                ->get(['id_barang', 'id_gudang'])
                ->groupBy('id_gudang')
                ->map(fn ($items) => $items->pluck('id_barang')->unique()->values()),
        ]);
    }

    public function storeMutation(Request $request): RedirectResponse
    {
        $gudang = Gudang::query()->find($request->input('id_gudang'));

        if ($gudang && $gudang->tipe_gudang === 'BOTOL') {
            // Mutasi stok botol kosong
            $validated = $this->uppercase($request->validate([
                'id_gudang' => ['required', 'exists:tm_gudang,id'],
                'id_barang' => ['required', 'exists:tm_botol_kosong,id'],
                'tipe_mutasi' => ['required', 'in:MASUK,KELUAR'],
                'jumlah_botol' => ['required', 'integer', 'min:1'],
                'keterangan' => ['nullable', 'string'],
            ], [
                'required' => 'Kolom ini wajib diisi.',
                'id_gudang.required' => 'Gudang belum dipilih.',
                'id_barang.required' => 'Botol kosong belum dipilih.',
                'id_barang.exists' => 'Botol kosong tidak ditemukan.',
                'tipe_mutasi.required' => 'Tipe mutasi belum dipilih.',
                'jumlah_botol.required' => 'Jumlah botol wajib diisi.',
                'jumlah_botol.integer' => 'Jumlah botol harus angka bulat.',
                'jumlah_botol.min' => 'Jumlah botol minimal 1.',
            ]));

            $this->business->adjustBotolKosongStock($validated);

            return back()->with('success', 'Stok botol kosong berhasil disimpan.');
        }

        // Default: mutasi stok barang bibit
        $this->business->createStockMutation($this->uppercase($request->validate([
            'id_gudang' => ['required', 'exists:tm_gudang,id'],
            'id_barang' => ['required', 'exists:tm_barang_bibit,id'],
            'id_botol' => ['nullable', 'exists:tm_botol,id'],
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

    public function destroyStock(Request $request): Response
    {
        return Inertia::render('admin/business/InventoryPage', [
            'mode' => 'destroy-stock',
            'rows' => StokGudang::query()
                ->with(['gudang', 'barang.brand', 'barang.botol', 'botolVariant'])
                ->where('stok_ml', '>', 0)
                ->latest('id')
                ->paginate($this->perPage())
                ->withQueryString(),
            'barang' => BarangBibit::query()->with(['brand', 'botol'])->where('status', 'AKTIF')->orderBy('nama_barang')->get(['id', 'kode_barang', 'nama_barang', 'jenis_barang', 'id_botol', 'id_gudang']),
            'botol' => Botol::query()->where('status', 'AKTIF')->orderBy('varian_ml')->get(),
            'gudang' => Gudang::query()->where('status', 'AKTIF')->orderBy('nama_gudang')->get(),
            'botolKosong' => BotolKosong::query()->with('gudang')->where('status', 'AKTIF')->orderBy('nama_botol')->get(),
            'stokGudangList' => StokGudang::query()->where('stok_ml', '>', 0)->get(['id_gudang', 'id_barang', 'id_botol', 'stok_ml']),
            'stokGudangMap' => StokGudang::query()
                ->where('stok_ml', '>', 0)
                ->get(['id_barang', 'id_gudang'])
                ->groupBy('id_gudang')
                ->map(fn ($items) => $items->pluck('id_barang')->unique()->values()),
        ]);
    }

    public function storeDestroyStock(Request $request): RedirectResponse
    {
        $gudang = Gudang::query()->find($request->input('id_gudang'));

        if ($gudang && $gudang->tipe_gudang === 'BOTOL') {
            $validated = $this->uppercase($request->validate([
                'id_gudang' => ['required', 'exists:tm_gudang,id'],
                'id_barang' => ['required', 'exists:tm_botol_kosong,id'],
                'jumlah_botol' => ['required', 'integer', 'min:1'],
                'keterangan' => ['nullable', 'string'],
            ], [
                'id_gudang.required' => 'Gudang belum dipilih.',
                'id_barang.required' => 'Botol kosong belum dipilih.',
                'jumlah_botol.required' => 'Jumlah botol yang dihancurkan wajib diisi.',
                'jumlah_botol.integer' => 'Jumlah botol harus angka bulat.',
                'jumlah_botol.min' => 'Jumlah botol minimal :min.',
            ]));

            $this->business->adjustBotolKosongStock([
                ...$validated,
                'tipe_mutasi' => 'KELUAR',
                'keterangan' => $validated['keterangan'] ?? 'Hancur stock botol kosong',
            ]);

            return back()->with('success', 'Stok botol kosong berhasil dihancurkan.');
        }

        $validated = $this->uppercase($request->validate([
            'id_gudang' => ['required', 'exists:tm_gudang,id'],
            'id_barang' => ['required', 'exists:tm_barang_bibit,id'],
            'id_botol' => ['nullable', 'exists:tm_botol,id'],
            'qty_ml' => ['required', 'numeric', 'min:0.01'],
            'keterangan' => ['nullable', 'string'],
        ], [
            'id_gudang.required' => 'Gudang belum dipilih.',
            'id_barang.required' => 'Barang belum dipilih.',
            'qty_ml.required' => 'Jumlah stock yang dihancurkan wajib diisi.',
            'qty_ml.numeric' => 'Jumlah stock harus berupa angka.',
            'qty_ml.min' => 'Jumlah stock minimal :min.',
        ]));

        $this->business->createStockMutation([
            ...$validated,
            'tipe_mutasi' => 'KELUAR',
            'sumber_transaksi' => 'DESTROY',
            'no_transaksi' => $validated['no_transaksi'] ?? 'HANCUR-STOCK',
            'keterangan' => $validated['keterangan'] ?? 'Hancur stock',
        ]);

        return back()->with('success', 'Stock berhasil dihancurkan.');
    }

    private function perPage(): int
    {
        $perPage = (int) request('per_page', 10);

        return in_array($perPage, [10, 25, 50], true) ? $perPage : 10;
    }
}
