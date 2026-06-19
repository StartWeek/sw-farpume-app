<?php

namespace App\Http\Controllers\Admin\Business;

use App\Http\Controllers\Controller;
use App\Models\Business\BarangBibit;
use App\Models\Business\Botol;
use App\Models\Business\Customer;
use App\Models\Business\Gudang;
use App\Models\Business\Hutang;
use App\Models\Business\KasMutasi;
use App\Models\Business\MutasiStok;
use App\Models\Business\Pembelian;
use App\Models\Business\Penjualan;
use App\Models\Business\Piutang;
use App\Models\Business\PiutangSupplier;
use App\Models\Business\StokGudang;
use App\Models\Business\Supplier;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class ReportController extends Controller
{
    public function show(Request $request, string $type): InertiaResponse|SymfonyResponse
    {
        $searched = $request->boolean('search');
        $export = $request->query('export');
        $filters = $request->only([
            'tanggal_dari',
            'tanggal_sampai',
            'id_supplier',
            'id_customer',
            'id_gudang',
            'id_barang',
            'status',
            'tipe_mutasi',
            'tipe_penjualan',
            'stok_status',
            'jenis_barang',
            'id_botol',
        ]);

        $rows = match ($type) {
            'pembelian' => $this->applyPurchaseFilters(Pembelian::query()->with(['supplier', 'gudang', 'details.barang']), $filters)->latest('id'),
            'penjualan', 'laba-kotor' => $this->applySalesFilters(Penjualan::query()->with(['customer', 'gudang', 'details.barang']), $filters)->latest('id'),
            'stok' => null,
            'mutasi-stok' => $this->applyMutationFilters(MutasiStok::query()->with(['gudang', 'barang.wangi', 'barang.brand']), $filters)->latest('id'),
            'barang-summary' => $this->stockSummaryQuery($filters),
            'hutang' => $this->applyDebtFilters(Hutang::query()->with('supplier'), $filters)->latest('id'),
            'piutang' => $this->applyReceivableFilters(Piutang::query()->with('customer'), $filters)->latest('id'),
            'piutang-supplier' => $this->applySupplierReceivableFilters(PiutangSupplier::query()->with('supplier'), $filters)->latest('id'),
            'kas' => $this->applyCashFilters(KasMutasi::query(), $filters)->latest('id'),
            default => abort(404),
        };

        if ($searched && in_array($export, ['pdf', 'excel'], true)) {
            $exportRows = $type === 'stok' ? $this->stockReportRows($filters) : $rows->get();
            $columns = $this->getExportColumns($type);
            $title = $this->getExportTitle($type);
            $filename = str($title)->slug();
            $orientation = in_array($request->query('orientation'), ['portrait', 'landscape'], true)
                ? $request->query('orientation')
                : 'landscape';
            
            $formattedFilters = $this->formatFiltersForExport($filters);

            if ($export === 'pdf') {
                return \Barryvdh\DomPDF\Facade\Pdf::loadView('exports.report', [
                    'title' => $title,
                    'filters' => $formattedFilters,
                    'columns' => $columns,
                    'rows' => $exportRows,
                ])->setPaper('a4', $orientation)->download($filename . '.pdf');
            }

            if ($export === 'excel') {
                return \Maatwebsite\Excel\Facades\Excel::download(
                    new \App\Exports\ReportExport($title, $formattedFilters, $columns, $exportRows),
                    $filename . '.xlsx'
                );
            }
        }

        return Inertia::render('admin/business/ReportPage', [
            'type' => $type,
            'searched' => $searched,
            'filters' => $filters,
            'refs' => $this->refs(),
            'rows' => $searched ? ($type === 'stok' ? $this->stockReportRows($filters) : $rows->paginate($this->perPage())->withQueryString()) : [],
        ]);
    }

    private function refs(): array
    {
        return [
            'barang' => BarangBibit::query()->where('status', 'AKTIF')->orderBy('nama_barang')->get(['id', 'nama_barang']),
            'botol' => Botol::query()->where('status', 'AKTIF')->orderBy('varian_ml')->get(['id', 'nama_botol', 'varian_ml']),
            'customer' => Customer::query()->where('status', 'AKTIF')->orderBy('nama_customer')->get(['id', 'nama_customer', 'tipe_customer']),
            'gudang' => Gudang::query()->where('status', 'AKTIF')->orderBy('nama_gudang')->get(['id', 'nama_gudang']),
            'supplier' => Supplier::query()->where('status', 'AKTIF')->orderBy('nama_supplier')->get(['id', 'nama_supplier']),
        ];
    }

    private function formatFiltersForExport(array $filters): array
    {
        $formatted = [];
        
        if (!empty($filters['tanggal_dari']) || !empty($filters['tanggal_sampai'])) {
            $dari = !empty($filters['tanggal_dari']) ? date('d-m-Y', strtotime($filters['tanggal_dari'])) : '-';
            $sampai = !empty($filters['tanggal_sampai']) ? date('d-m-Y', strtotime($filters['tanggal_sampai'])) : '-';
            $formatted['Periode'] = $dari . ' s/d ' . $sampai;
        }

        if (!empty($filters['id_supplier'])) {
            $formatted['Supplier'] = Supplier::find($filters['id_supplier'])?->nama_supplier ?? $filters['id_supplier'];
        }

        if (!empty($filters['id_customer'])) {
            $formatted['Customer'] = Customer::find($filters['id_customer'])?->nama_customer ?? $filters['id_customer'];
        }

        if (!empty($filters['id_gudang'])) {
            $formatted['Gudang'] = Gudang::find($filters['id_gudang'])?->nama_gudang ?? $filters['id_gudang'];
        }

        if (!empty($filters['id_barang'])) {
            $formatted['Barang Bibit'] = BarangBibit::find($filters['id_barang'])?->nama_barang ?? $filters['id_barang'];
        }

        if (!empty($filters['id_botol'])) {
            $formatted['Botol'] = Botol::find($filters['id_botol'])?->nama_botol ?? $filters['id_botol'];
        }

        if (!empty($filters['status'])) {
            $formatted['Status Pembayaran'] = $filters['status'];
        }

        if (!empty($filters['tipe_mutasi'])) {
            $formatted['Tipe Mutasi'] = $filters['tipe_mutasi'];
        }

        if (!empty($filters['tipe_penjualan'])) {
            $formatted['Tipe Penjualan'] = $filters['tipe_penjualan'];
        }

        if (!empty($filters['stok_status'])) {
            $formatted['Status Stok'] = $filters['stok_status'];
        }

        if (!empty($filters['jenis_barang'])) {
            $formatted['Jenis Barang'] = $filters['jenis_barang'];
        }

        return $formatted;
    }

    private function applyPurchaseFilters(Builder $query, array $filters): Builder
    {
        return $this->applyDateRange($query, $filters)
            ->when($filters['id_supplier'] ?? null, fn (Builder $query, string $value) => $query->where('id_supplier', $value))
            ->when($filters['id_gudang'] ?? null, fn (Builder $query, string $value) => $query->where('id_gudang', $value))
            ->when($filters['status'] ?? null, fn (Builder $query, string $value) => $query->where('status_pembayaran', $value))
            ->when($filters['id_barang'] ?? null, fn (Builder $query, string $value) => $query->whereHas('details', fn (Builder $detail) => $detail->where('id_barang', $value)));
    }

    private function applySalesFilters(Builder $query, array $filters): Builder
    {
        return $this->applyDateRange($query, $filters)
            ->when($filters['id_customer'] ?? null, fn (Builder $query, string $value) => $query->where('id_customer', $value))
            ->when($filters['id_gudang'] ?? null, fn (Builder $query, string $value) => $query->where('id_gudang', $value))
            ->when($filters['status'] ?? null, fn (Builder $query, string $value) => $query->where('status_pembayaran', $value))
            ->when($filters['tipe_penjualan'] ?? null, fn (Builder $query, string $value) => $query->where('tipe_penjualan', $value))
            ->when($filters['id_barang'] ?? null, fn (Builder $query, string $value) => $query->whereHas('details', fn (Builder $detail) => $detail->where('id_barang', $value)));
    }

    private function applyStockFilters(Builder $query, array $filters): Builder
    {
        return $query
            ->when($filters['id_gudang'] ?? null, fn (Builder $query, string $value) => $query->where('id_gudang', $value))
            ->when($filters['id_barang'] ?? null, fn (Builder $query, string $value) => $query->where('id_barang', $value))
            ->when(in_array($filters['jenis_barang'] ?? null, ['BIBIT', 'ABSOLUTE'], true), fn (Builder $query) => $query->whereHas('barang', fn (Builder $barang) => $barang->where('jenis_barang', $filters['jenis_barang'])))
            ->when(($filters['stok_status'] ?? null) === 'MENIPIS', fn (Builder $query) => $query->whereColumn('stok_ml', '<=', 'minimum_stok_ml'))
            ->when(($filters['stok_status'] ?? null) === 'TERSEDIA', fn (Builder $query) => $query->whereColumn('stok_ml', '>', 'minimum_stok_ml'));
    }

    private function stockReportRows(array $filters): array
    {
        $rows = [];
        $includeLiquid = !in_array($filters['jenis_barang'] ?? '', ['BOTOL'], true);
        $includeBotol = !in_array($filters['jenis_barang'] ?? '', ['BIBIT', 'ABSOLUTE'], true);

        if ($includeLiquid) {
            $stocks = $this->applyStockFilters(StokGudang::query()->with(['gudang', 'barang.wangi', 'barang.brand']), $filters)->latest('id')->get();
            foreach ($stocks as $stock) {
                $totalMl = (float) $stock->stok_ml;
                $rows[] = [
                    'id' => 'cairan-'.$stock->id,
                    'jenis_barang' => $stock->barang?->jenis_barang ?? 'BIBIT',
                    'nama_item' => $stock->barang?->nama_barang ?? '-',
                    'gudang' => $stock->gudang,
                    'stok_ml' => $totalMl,
                    'liter' => (int) floor($totalMl / 1000),
                    'sisa_ml' => (float) fmod($totalMl, 1000),
                    'minimum_stok_ml' => (float) $stock->minimum_stok_ml,
                ];
            }
        }

        if ($includeBotol) {
            $botolRows = Botol::query()
                ->when($filters['id_botol'] ?? null, fn (Builder $query, string $value) => $query->whereKey($value))
                ->when($filters['jenis_barang'] ?? null, fn (Builder $query, string $value) => $value === 'BOTOL' ? $query : $query)
                ->orderBy('varian_ml')
                ->get();

            foreach ($botolRows as $botol) {
                $stockBotol = (float) $botol->stock_botol;
                $isiPerDus = max(1, (int) $botol->isi_per_dus);
                $rows[] = [
                    'id' => 'botol-'.$botol->id,
                    'jenis_barang' => 'BOTOL',
                    'nama_item' => $botol->nama_botol,
                    'gudang' => null,
                    'stok_botol' => $stockBotol,
                    'isi_per_dus' => $isiPerDus,
                    'dus' => (int) floor($stockBotol / $isiPerDus),
                    'sisa_botol' => (float) fmod($stockBotol, $isiPerDus),
                ];
            }
        }

        return $rows;
    }

    private function applyMutationFilters(Builder $query, array $filters): Builder
    {
        return $this->applyDateRange($query, $filters)
            ->when($filters['id_gudang'] ?? null, fn (Builder $query, string $value) => $query->where('id_gudang', $value))
            ->when($filters['id_barang'] ?? null, fn (Builder $query, string $value) => $query->where('id_barang', $value))
            ->when($filters['tipe_mutasi'] ?? null, fn (Builder $query, string $value) => $query->where('tipe_mutasi', $value));
    }

    private function stockSummaryQuery(array $filters): Builder
    {
        return MutasiStok::query()
                ->with(['gudang', 'barang.wangi', 'barang.brand'])
                ->leftJoin('tt_stok_gudang', function ($join) {
                    $join->on('tt_stok_gudang.id_gudang', '=', 'tt_mutasi_stok.id_gudang')
                        ->on('tt_stok_gudang.id_barang', '=', 'tt_mutasi_stok.id_barang');
                })
                ->select([
                    'tt_mutasi_stok.id_barang',
                    'tt_mutasi_stok.id_gudang',
                ])
                ->selectRaw('MIN(tt_mutasi_stok.id) as id')
                ->selectRaw("SUM(CASE WHEN tt_mutasi_stok.tipe_mutasi = 'MASUK' THEN tt_mutasi_stok.qty_ml ELSE 0 END) as total_masuk_ml")
                ->selectRaw("SUM(CASE WHEN tt_mutasi_stok.tipe_mutasi = 'KELUAR' THEN tt_mutasi_stok.qty_ml ELSE 0 END) as total_keluar_ml")
                ->selectRaw("SUM(CASE WHEN tt_mutasi_stok.tipe_mutasi = 'MASUK' THEN tt_mutasi_stok.qty_ml ELSE -tt_mutasi_stok.qty_ml END) as selisih_ml")
                ->selectRaw('COUNT(tt_mutasi_stok.id) as total_mutasi')
                ->selectRaw('MAX(tt_mutasi_stok.tanggal) as terakhir_mutasi')
                ->selectRaw('MAX(tt_stok_gudang.stok_ml) as stok_akhir_ml')
                ->selectRaw('MAX(tt_stok_gudang.minimum_stok_ml) as minimum_stok_ml')
            ->when($filters['tanggal_dari'] ?? null, fn (Builder $query, string $value) => $query->whereDate('tt_mutasi_stok.tanggal', '>=', $value))
            ->when($filters['tanggal_sampai'] ?? null, fn (Builder $query, string $value) => $query->whereDate('tt_mutasi_stok.tanggal', '<=', $value))
            ->when($filters['id_gudang'] ?? null, fn (Builder $query, string $value) => $query->where('tt_mutasi_stok.id_gudang', $value))
            ->when($filters['id_barang'] ?? null, fn (Builder $query, string $value) => $query->where('tt_mutasi_stok.id_barang', $value))
            ->when($filters['tipe_mutasi'] ?? null, fn (Builder $query, string $value) => $query->where('tt_mutasi_stok.tipe_mutasi', $value))
            ->groupBy('tt_mutasi_stok.id_barang', 'tt_mutasi_stok.id_gudang')
            ->orderByDesc(DB::raw('MAX(tt_mutasi_stok.tanggal)'))
            ->orderBy('tt_mutasi_stok.id_barang');
    }

    private function applyDebtFilters(Builder $query, array $filters): Builder
    {
        return $this->applyDateRange($query, $filters)
            ->when($filters['id_supplier'] ?? null, fn (Builder $query, string $value) => $query->where('id_supplier', $value))
            ->when($filters['status'] ?? null, fn (Builder $query, string $value) => $query->where('status_hutang', $value));
    }

    private function applyReceivableFilters(Builder $query, array $filters): Builder
    {
        return $this->applyDateRange($query, $filters)
            ->when($filters['id_customer'] ?? null, fn (Builder $query, string $value) => $query->where('id_customer', $value))
            ->when($filters['status'] ?? null, fn (Builder $query, string $value) => $query->where('status_piutang', $value));
    }

    private function applySupplierReceivableFilters(Builder $query, array $filters): Builder
    {
        return $this->applyDateRange($query, $filters)
            ->when($filters['id_supplier'] ?? null, fn (Builder $query, string $value) => $query->where('id_supplier', $value))
            ->when($filters['status'] ?? null, fn (Builder $query, string $value) => $query->where('status_piutang', $value));
    }

    private function applyCashFilters(Builder $query, array $filters): Builder
    {
        return $this->applyDateRange($query, $filters)
            ->when($filters['status'] ?? null, fn (Builder $query, string $value) => $query->where('jenis_transaksi', $value));
    }

    private function applyDateRange(Builder $query, array $filters): Builder
    {
        return $query
            ->when($filters['tanggal_dari'] ?? null, fn (Builder $query, string $value) => $query->whereDate('tanggal', '>=', $value))
            ->when($filters['tanggal_sampai'] ?? null, fn (Builder $query, string $value) => $query->whereDate('tanggal', '<=', $value));
    }

    private function perPage(): int
    {
        $perPage = (int) request('per_page', 10);

        return in_array($perPage, [10, 25, 50, 100], true) ? $perPage : 10;
    }

    private function getExportTitle(string $type): string
    {
        return match ($type) {
            'pembelian' => 'Laporan Pembelian',
            'penjualan' => 'Laporan Penjualan',
            'stok' => 'Laporan Stok',
            'mutasi-stok' => 'Laporan Mutasi Stok',
            'barang-summary' => 'Laporan Barang Summary',
            'hutang' => 'Laporan Hutang Supplier',
            'piutang' => 'Laporan Piutang Customer',
            'piutang-supplier' => 'Laporan Piutang Supplier',
            'laba-kotor' => 'Laporan Laba Kotor',
            'kas' => 'Laporan Kas',
            default => 'Laporan',
        };
    }

    private function getExportColumns(string $type): array
    {
        if ($type === 'pembelian') return [
            ['key' => 'no_pembelian', 'label' => 'No Pembelian'],
            ['label' => 'Supplier', 'format' => fn($row) => $row->supplier?->nama_supplier ?? '-'],
            ['label' => 'Gudang', 'format' => fn($row) => $row->gudang?->nama_gudang ?? '-'],
            ['label' => 'Qty ML', 'format' => fn($row) => number_format((float) $row->total_qty_ml, 2, ',', '.')],
            ['label' => 'Total', 'format' => fn($row) => 'Rp ' . number_format((float) $row->total_pembelian, 0, ',', '.')],
            ['key' => 'status_pembayaran', 'label' => 'Status'],
        ];
        
        if ($type === 'penjualan' || $type === 'laba-kotor') return [
            ['key' => 'no_penjualan', 'label' => 'No Penjualan'],
            ['label' => 'Customer', 'format' => fn($row) => $row->customer?->nama_customer ?? '-'],
            ['label' => 'Gudang', 'format' => fn($row) => $row->gudang?->nama_gudang ?? '-'],
            ['label' => 'Penjualan', 'format' => fn($row) => 'Rp ' . number_format((float) $row->total_penjualan, 0, ',', '.')],
            ['label' => 'Modal', 'format' => fn($row) => 'Rp ' . number_format((float) $row->total_modal, 0, ',', '.')],
            ['label' => 'Laba', 'format' => fn($row) => 'Rp ' . number_format((float) $row->laba_kotor, 0, ',', '.')],
        ];
        
        if ($type === 'stok') return [
            ['key' => 'jenis_barang', 'label' => 'Jenis'],
            ['key' => 'nama_item', 'label' => 'Barang'],
            ['label' => 'Gudang', 'format' => fn($row) => data_get($row, 'gudang.nama_gudang', '-')],
            ['label' => 'Stok ML', 'format' => fn($row) => data_get($row, 'jenis_barang') === 'BOTOL' ? '-' : number_format((float) data_get($row, 'stok_ml'), 2, ',', '.')],
            ['label' => 'Liter/Sisa ML', 'format' => fn($row) => data_get($row, 'jenis_barang') === 'BOTOL' ? '-' : data_get($row, 'liter') . ' liter ' . data_get($row, 'sisa_ml') . ' ml'],
            ['label' => 'Stok Botol', 'format' => fn($row) => data_get($row, 'jenis_barang') === 'BOTOL' ? number_format((float) data_get($row, 'stok_botol'), 2, ',', '.') : '-'],
            ['label' => 'Dus/Sisa Botol', 'format' => fn($row) => data_get($row, 'jenis_barang') === 'BOTOL' ? data_get($row, 'dus') . ' dus ' . data_get($row, 'sisa_botol') . ' botol' : '-'],
            ['label' => 'Minimum', 'format' => fn($row) => data_get($row, 'minimum_stok_ml') ? number_format((float) data_get($row, 'minimum_stok_ml'), 2, ',', '.') : '-'],
        ];

        if ($type === 'mutasi-stok') return [
            ['key' => 'tanggal', 'label' => 'Tanggal'],
            ['key' => 'no_transaksi', 'label' => 'No Transaksi'],
            ['label' => 'Barang', 'format' => fn($row) => $row->barang?->nama_barang ?? '-'],
            ['key' => 'tipe_mutasi', 'label' => 'Tipe'],
            ['label' => 'Qty ML', 'format' => fn($row) => number_format((float) $row->qty_ml, 2, ',', '.')],
        ];

        if ($type === 'barang-summary') return [
            ['label' => 'Barang', 'format' => fn($row) => $row->barang?->nama_barang ?? '-'],
            ['label' => 'Gudang', 'format' => fn($row) => $row->gudang?->nama_gudang ?? '-'],
            ['label' => 'Masuk ML', 'format' => fn($row) => number_format((float) $row->total_masuk_ml, 2, ',', '.')],
            ['label' => 'Keluar ML', 'format' => fn($row) => number_format((float) $row->total_keluar_ml, 2, ',', '.')],
            ['label' => 'Net ML', 'format' => fn($row) => number_format((float) $row->selisih_ml, 2, ',', '.')],
            ['label' => 'Stok Akhir', 'format' => fn($row) => number_format((float) $row->stok_akhir_ml, 2, ',', '.')],
            ['label' => 'Minimum', 'format' => fn($row) => number_format((float) $row->minimum_stok_ml, 2, ',', '.')],
            ['label' => 'Transaksi', 'format' => fn($row) => number_format((float) $row->total_mutasi, 0, ',', '.')],
            ['key' => 'terakhir_mutasi', 'label' => 'Terakhir'],
        ];

        if ($type === 'hutang') return [
            ['key' => 'no_hutang', 'label' => 'No Hutang'],
            ['label' => 'Supplier', 'format' => fn($row) => $row->supplier?->nama_supplier ?? '-'],
            ['label' => 'Total', 'format' => fn($row) => 'Rp ' . number_format((float) $row->total_hutang, 0, ',', '.')],
            ['label' => 'Sisa', 'format' => fn($row) => 'Rp ' . number_format((float) $row->sisa_hutang, 0, ',', '.')],
            ['key' => 'status_hutang', 'label' => 'Status'],
        ];

        if ($type === 'piutang-supplier') return [
            ['key' => 'no_piutang_supplier', 'label' => 'No Piutang'],
            ['label' => 'Supplier', 'format' => fn($row) => $row->supplier?->nama_supplier ?? '-'],
            ['label' => 'Total', 'format' => fn($row) => 'Rp ' . number_format((float) $row->total_piutang, 0, ',', '.')],
            ['label' => 'Sisa', 'format' => fn($row) => 'Rp ' . number_format((float) $row->sisa_piutang, 0, ',', '.')],
            ['key' => 'status_piutang', 'label' => 'Status'],
        ];

        if ($type === 'kas') return [
            ['key' => 'tanggal', 'label' => 'Tanggal'],
            ['key' => 'no_transaksi', 'label' => 'No Transaksi'],
            ['key' => 'jenis_transaksi', 'label' => 'Jenis'],
            ['key' => 'sumber_transaksi', 'label' => 'Sumber'],
            ['key' => 'pihak', 'label' => 'Customer/Sales/Supplier'],
            ['label' => 'Kas Masuk', 'format' => fn($row) => 'Rp ' . number_format((float) $row->kas_masuk, 0, ',', '.')],
            ['label' => 'Kas Keluar', 'format' => fn($row) => 'Rp ' . number_format((float) $row->kas_keluar, 0, ',', '.')],
            ['label' => 'Saldo Akhir', 'format' => fn($row) => 'Rp ' . number_format((float) $row->saldo_akhir, 0, ',', '.')],
            ['key' => 'keterangan', 'label' => 'Keterangan'],
        ];

        return [
            ['key' => 'no_piutang', 'label' => 'No Piutang'],
            ['label' => 'Customer', 'format' => fn($row) => $row->customer?->nama_customer ?? '-'],
            ['label' => 'Total', 'format' => fn($row) => 'Rp ' . number_format((float) $row->total_piutang, 0, ',', '.')],
            ['label' => 'Sisa', 'format' => fn($row) => 'Rp ' . number_format((float) $row->sisa_piutang, 0, ',', '.')],
            ['key' => 'status_piutang', 'label' => 'Status'],
        ];
    }
}
