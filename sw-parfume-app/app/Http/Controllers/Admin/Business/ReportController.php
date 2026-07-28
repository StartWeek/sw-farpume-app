<?php

namespace App\Http\Controllers\Admin\Business;

use App\Http\Controllers\Controller;
use App\Models\Business\BarangBibit;
use App\Models\Business\Botol;
use App\Models\Business\BotolKosong;
use App\Models\Business\Customer;
use App\Models\Business\Gudang;
use App\Models\Business\HistoriSaldoBarang;
use App\Models\Business\Hutang;
use App\Models\Business\KasMutasi;
use App\Models\Business\MutasiStok;
use App\Models\Business\Pembelian;
use App\Models\Business\Penjualan;
use App\Models\Business\Piutang;
use App\Models\Business\PiutangSupplier;
use App\Models\Business\SaldoBarang;
use App\Models\Business\StokGudang;
use App\Models\Business\Supplier;
use App\Models\Business\TransaksiBotolKosong;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
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
            'pembelian' => $this->applyPurchaseFilters(Pembelian::query()->with(['supplier', 'gudang', 'details.barang', 'details.botol', 'details.botolKosong']), $filters)->latest('id'),
            'penjualan', 'laba-kotor' => $this->applySalesFilters(Penjualan::query()->with(['customer', 'sales', 'gudang', 'details.barang', 'details.botol', 'details.botolKosong']), $filters)->latest('id'),
            'stok' => null,
            'mutasi-stok' => $this->applyMutationFilters(MutasiStok::query()->with(['gudang', 'barang.brand', 'barang.botol', 'botolVariant']), $filters)->latest('id'),
            'barang-summary' => null,
            'hutang' => $this->applyDebtFilters(Hutang::query()->with('supplier'), $filters)->latest('id'),
            'piutang' => $this->applyReceivableFilters(Piutang::query()->with('customer'), $filters)->latest('id'),
            'piutang-supplier' => $this->applySupplierReceivableFilters(PiutangSupplier::query()->with('supplier'), $filters)->latest('id'),
            'kas' => $this->applyCashFilters(KasMutasi::query()->selectRaw('tt_kas_mutasi.*, saldo_akhir - kas_masuk + kas_keluar as saldo_awal'), $filters)->latest('tanggal')->latest('id'),
            default => abort(404),
        };

        $allRows = $searched ? collect(match ($type) {
            'stok' => $this->stockReportRows($filters),
            'barang-summary' => $this->stockSummaryRows($filters),
            default => (clone $rows)->get(),
        }) : collect();
        $summary = $this->reportSummary($type, $allRows);
        $groups = $this->reportGroups($type, $allRows);

        if ($searched && in_array($export, ['pdf', 'excel'], true)) {
            $exportRows = $allRows;
            $botolStockExport = $type === 'stok' ? $this->botolStockRows($filters) : [];
            $botolStockColumns = $type === 'stok' ? [
                ['key' => 'nama_item', 'label' => 'Botol'],
                ['label' => 'Gudang', 'format' => fn($row) => data_get($row, 'gudang', '-')],
                ['label' => 'Stok Botol', 'format' => fn($row) => $this->fmt((float) data_get($row, 'stok_botol'))],
            ] : [];
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
                    'summary' => $summary,
                    'groups' => $groups,
                    'botolStock' => $botolStockExport,
                    'botolStockColumns' => $botolStockColumns,
                ])->setPaper('a4', $orientation)->download($filename . '.pdf');
            }

            if ($export === 'excel') {
                return \Maatwebsite\Excel\Facades\Excel::download(
                    new \App\Exports\ReportExport($title, $formattedFilters, $columns, $exportRows, $summary, $groups, $botolStockExport, $botolStockColumns),
                    $filename . '.xlsx'
                );
            }
        }

        return Inertia::render('admin/business/ReportPage', [
            'type' => $type,
            'searched' => $searched,
            'filters' => $filters,
            'refs' => $this->refs(),
            'rows' => $searched ? match ($type) {
                'stok', 'barang-summary' => $this->paginateRows($allRows->all()),
                default => $rows->paginate($this->perPage())->withQueryString(),
            } : [],
            'botolStock' => $searched && $type === 'stok' ? $this->botolStockRows($filters) : [],
            'botolSummary' => $searched && $type === 'barang-summary' ? $this->botolSummaryRows($filters) : [],
            'summary' => $summary,
            'groups' => $groups,
        ]);
    }

    private function reportSummary(string $type, $rows): array
    {
        return match ($type) {
            'pembelian' => ['Total Pembelian' => $rows->sum('total_pembelian'), 'Diskon' => $rows->sum('discount'), 'Botol' => $rows->sum('total_qty_botol'), 'ML' => $rows->sum('total_qty_ml')],
            'penjualan', 'laba-kotor' => ['Total Penjualan' => $rows->sum('total_penjualan'), 'Diskon' => $rows->sum('discount'), 'Modal' => $rows->sum('total_modal'), 'Laba Kotor' => $rows->sum('laba_kotor'), 'Botol' => $rows->sum('total_qty_botol'), 'ML' => $rows->sum('total_qty_ml')],
            'hutang' => ['Total Hutang' => $rows->sum('total_hutang'), 'Sisa Hutang' => $rows->sum('sisa_hutang')],
            'piutang', 'piutang-supplier' => ['Total Piutang' => $rows->sum('total_piutang'), 'Sisa Piutang' => $rows->sum('sisa_piutang')],
            'kas' => $this->cashSummary($rows),
            'mutasi-stok' => ['Total ML' => $rows->sum('qty_ml')],
            'barang-summary' => ['Total Stok Awal ML' => $rows->sum('stok_awal_ml'), 'Total Masuk ML' => $rows->sum('total_masuk_ml'), 'Total Keluar ML' => $rows->sum('total_keluar_ml'), 'Total Stok Akhir ML' => $rows->sum('stok_akhir_ml')],
            'stok' => ['Total Stok Cairan (ML)' => $rows->sum('stok_ml'), 'Total Botol Isi/Terpakai' => $rows->sum('stok_botol_isi')],
            default => [],
        };
    }

    private function cashSummary($rows): array
    {
        $ordered = $rows->sortBy('id')->values();
        return [
            'Saldo Awal' => (float) ($ordered->first()?->saldo_awal ?? 0),
            'Kas Masuk' => $ordered->sum('kas_masuk'),
            'Kas Keluar' => $ordered->sum('kas_keluar'),
            'Saldo Akhir' => (float) ($ordered->last()?->saldo_akhir ?? 0),
        ];
    }

    private function reportGroups(string $type, $rows): array
    {
        if (! in_array($type, ['piutang', 'piutang-supplier'], true)) return [];
        $relation = $type === 'piutang' ? 'customer' : 'supplier';
        $name = $type === 'piutang' ? 'nama_customer' : 'nama_supplier';

        return $rows->groupBy(fn ($row) => data_get($row, "{$relation}.{$name}", '-'))
            ->map(fn ($items, $party) => [
                'pihak' => strtoupper($party),
                'total' => $items->sum('total_piutang'),
                'sisa' => $items->sum('sisa_piutang'),
            ])->values()->all();
    }

    private function refs(): array
    {
        return [
            'barang' => BarangBibit::query()->where('status', 'AKTIF')->orderBy('nama_barang')->get(['id', 'id_botol', 'nama_barang']),
            'botol' => Botol::query()->where('status', 'AKTIF')->orderBy('varian_ml')->get(['id', 'nama_botol', 'varian_ml']),
            'botol_kosong' => BotolKosong::query()->where('status', 'AKTIF')->orderBy('nama_botol')->get(['id', 'nama_botol']),
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
            ->when(in_array($filters['jenis_barang'] ?? null, ['BIBIT', 'ABSOLUTE'], true), fn (Builder $query) => $query->whereHas('details.barang', fn (Builder $barang) => $barang->where('jenis_barang', $filters['jenis_barang'])))
            ->when(($filters['jenis_barang'] ?? null) === 'BOTOL', fn (Builder $query) => $query->whereHas('details', fn (Builder $detail) => $detail->where('tipe_item', 'BOTOL')))
            ->when($filters['id_barang'] ?? null, fn (Builder $query, string $value) => $query->whereHas('details', fn (Builder $detail) => $detail->where('id_barang', $value)))
            ->when($filters['id_botol'] ?? null, fn (Builder $query, string $value) => $query->whereHas('details', fn (Builder $detail) => ($filters['jenis_barang'] ?? null) === 'BOTOL'
                ? $detail->where('tipe_item', 'BOTOL')->where('item_id', $value)
                : $detail->where('id_botol', $value)));
    }

    private function applySalesFilters(Builder $query, array $filters): Builder
    {
        return $this->applyDateRange($query, $filters)
            ->when($filters['id_customer'] ?? null, fn (Builder $query, string $value) => $query->where('id_customer', $value))
            ->when($filters['id_gudang'] ?? null, fn (Builder $query, string $value) => $query->where('id_gudang', $value))
            ->when($filters['status'] ?? null, fn (Builder $query, string $value) => $query->where('status_pembayaran', $value))
            ->when($filters['tipe_penjualan'] ?? null, fn (Builder $query, string $value) => $query->where('tipe_penjualan', $value))
            ->when(in_array($filters['jenis_barang'] ?? null, ['BIBIT', 'ABSOLUTE'], true), fn (Builder $query) => $query->whereHas('details.barang', fn (Builder $barang) => $barang->where('jenis_barang', $filters['jenis_barang'])))
            ->when(($filters['jenis_barang'] ?? null) === 'BOTOL', fn (Builder $query) => $query->whereHas('details', fn (Builder $detail) => $detail->where('tipe_item', 'BOTOL')))
            ->when($filters['id_barang'] ?? null, fn (Builder $query, string $value) => $query->whereHas('details', fn (Builder $detail) => $detail->where('id_barang', $value)))
            ->when($filters['id_botol'] ?? null, fn (Builder $query, string $value) => $query->whereHas('details', fn (Builder $detail) => ($filters['jenis_barang'] ?? null) === 'BOTOL'
                ? $detail->where('tipe_item', 'BOTOL')->where('item_id', $value)
                : $detail->where('id_botol', $value)));
    }

    private function applyStockFilters(Builder $query, array $filters): Builder
    {
        return $query
            ->when($filters['id_gudang'] ?? null, fn (Builder $query, string $value) => $query->where('id_gudang', $value))
            ->when($filters['id_barang'] ?? null, fn (Builder $query, string $value) => $query->where('id_barang', $value))
            ->when($filters['id_botol'] ?? null, fn (Builder $query, string $value) => $query->where('tt_stok_gudang.id_botol', $value))
            ->when(in_array($filters['jenis_barang'] ?? null, ['BIBIT', 'ABSOLUTE'], true), fn (Builder $query) => $query->whereHas('barang', fn (Builder $barang) => $barang->where('jenis_barang', $filters['jenis_barang'])))
            ->when(($filters['stok_status'] ?? null) === 'MENIPIS', fn (Builder $query) => $query->whereColumn('stok_ml', '<=', 'minimum_stok_ml'))
            ->when(($filters['stok_status'] ?? null) === 'TERSEDIA', fn (Builder $query) => $query->whereColumn('stok_ml', '>', 'minimum_stok_ml'));
    }

    private function stockReportRows(array $filters): array
    {
        if (($filters['jenis_barang'] ?? null) === 'BOTOL') {
            return [];
        }

        $rows = [];

        $stocks = $this->applyStockFilters(
            StokGudang::query()->with(['gudang', 'barang.brand', 'barang.botol', 'botolVariant']), $filters
        )
            ->join('tm_barang_bibit', 'tt_stok_gudang.id_barang', '=', 'tm_barang_bibit.id')
            ->leftJoin('tm_botol', 'tt_stok_gudang.id_botol', '=', 'tm_botol.id')
            ->orderBy('tm_botol.varian_ml')
            ->orderBy('tm_barang_bibit.nama_barang')
            ->select('tt_stok_gudang.*')
            ->get();

        foreach ($stocks as $stock) {
            $totalMl = (float) $stock->stok_ml;
            $rows[] = [
                'id' => 'cairan-'.$stock->id,
                'nama_item' => $stock->barang?->nama_barang ?? '-',
                'gudang' => $stock->gudang,
                'botol' => $stock->botolVariant ?? $stock->barang?->botol,
                'stok_ml' => $totalMl,
                'stok_botol_isi' => $stock->stok_botol_isi,
                'minimum_stok_ml' => (float) $stock->minimum_stok_ml,
            ];
        }

        return $rows;
    }

    private function botolStockRows(array $filters): array
    {
        if (! empty($filters['jenis_barang']) && $filters['jenis_barang'] !== 'BOTOL') {
            return [];
        }

        $query = BotolKosong::query()->with('gudang')->orderBy('nama_botol');

        if (!empty($filters['id_botol'])) {
            $query->whereKey($filters['id_botol']);
        }

        if (!empty($filters['id_gudang'])) {
            $query->where('id_gudang', $filters['id_gudang']);
        }

        return $query->get()
            ->map(fn (BotolKosong $botol) => [
                'id' => 'botol-' . $botol->id,
                'nama_item' => $botol->nama_botol,
                'gudang' => $botol->gudang?->nama_gudang ?? '-',
                'stok_botol' => (float) $botol->stock,
            ])
            ->all();
    }

    private function botolSummaryRows(array $filters): array
    {
        if (! empty($filters['jenis_barang']) && $filters['jenis_barang'] !== 'BOTOL') {
            return [];
        }

        return TransaksiBotolKosong::query()
            ->with(['gudang', 'botol'])
            ->when($filters['tanggal_dari'] ?? null, fn (Builder $query, string $value) => $query->whereDate('tanggal', '>=', $value))
            ->when($filters['tanggal_sampai'] ?? null, fn (Builder $query, string $value) => $query->whereDate('tanggal', '<=', $value))
            ->when($filters['id_gudang'] ?? null, fn (Builder $query, string $value) => $query->where('id_gudang', $value))
            ->when($filters['id_botol'] ?? null, fn (Builder $query, string $value) => $query->where('id_botol_kosong', $value))
            ->orderBy('tanggal')
            ->orderBy('id')
            ->get()
            ->groupBy(fn (TransaksiBotolKosong $row) => $row->id_gudang.':'.$row->id_botol_kosong)
            ->map(function ($items): array {
                $first = $items->first();
                $last = $items->last();

                return [
                    'id' => 'botol-summary-'.$first->id_gudang.'-'.$first->id_botol_kosong,
                    'nama_item' => $first->botol?->nama_botol ?? '-',
                    'gudang' => $first->gudang?->nama_gudang ?? '-',
                    'stok_awal' => (float) $first->stok_awal,
                    'total_masuk' => (float) $items->where('tipe_mutasi', 'MASUK')->sum('qty_botol'),
                    'total_keluar' => (float) $items->where('tipe_mutasi', 'KELUAR')->sum('qty_botol'),
                    'stok_akhir' => (float) $last->stok_akhir,
                    'total_mutasi' => $items->count(),
                    'terakhir_mutasi' => $last->tanggal->toDateString(),
                ];
            })
            ->values()
            ->all();
    }

    private function applyMutationFilters(Builder $query, array $filters): Builder
    {
        return $this->applyDateRange($query, $filters)
            ->when($filters['id_gudang'] ?? null, fn (Builder $query, string $value) => $query->where('id_gudang', $value))
            ->when($filters['id_barang'] ?? null, fn (Builder $query, string $value) => $query->where('id_barang', $value))
            ->when($filters['id_botol'] ?? null, fn (Builder $query, string $value) => $query->where('tt_mutasi_stok.id_botol', $value))
            ->when($filters['tipe_mutasi'] ?? null, fn (Builder $query, string $value) => $query->where('tipe_mutasi', $value));
    }

    private function stockSummaryRows(array $filters): array
    {
        if (($filters['jenis_barang'] ?? null) === 'BOTOL') {
            return [];
        }

        $relations = ['gudang', 'barang.brand', 'barang.botol', 'botolVariant'];
        $active = $this->applyStockBalanceFilters(SaldoBarang::query()->with($relations), $filters)->get();
        $history = $this->applyStockBalanceFilters(HistoriSaldoBarang::query()->with($relations), $filters)->get();

        return $history->concat($active)
            ->groupBy(fn ($row) => implode(':', [$row->id_gudang, $row->id_barang, $row->id_botol]))
            ->map(function ($items) {
                $ordered = $items->sortBy(fn ($row) => $row->tanggal->format('Y-m-d'))->values();
                $first = $ordered->first();
                $last = $ordered->last();
                $row = clone $first;
                $totalIn = (float) $ordered->sum('masuk_ml');
                $totalOut = (float) $ordered->sum('keluar_ml');

                $row->setAttribute('stok_awal_ml', (float) $first->stok_awal_ml);
                $row->setAttribute('total_masuk_ml', $totalIn);
                $row->setAttribute('total_keluar_ml', $totalOut);
                $row->setAttribute('selisih_ml', $totalIn - $totalOut);
                $row->setAttribute('stok_akhir_ml', (float) $last->stok_akhir_ml);
                $row->setAttribute('minimum_stok_ml', (float) $last->minimum_stok_ml);
                $row->setAttribute('total_mutasi', (int) $ordered->sum('total_mutasi'));
                $row->setAttribute('terakhir_mutasi', $ordered->pluck('terakhir_mutasi')->filter()->last()?->toDateString());

                return $row;
            })
            ->sortByDesc('terakhir_mutasi')
            ->values()
            ->all();
    }

    private function applyStockBalanceFilters(Builder $query, array $filters): Builder
    {
        return $query
            ->when($filters['tanggal_dari'] ?? null, fn (Builder $query, string $value) => $query->whereDate('tanggal', '>=', $value))
            ->when($filters['tanggal_sampai'] ?? null, fn (Builder $query, string $value) => $query->whereDate('tanggal', '<=', $value))
            ->when($filters['id_gudang'] ?? null, fn (Builder $query, string $value) => $query->where('id_gudang', $value))
            ->when($filters['id_barang'] ?? null, fn (Builder $query, string $value) => $query->where('id_barang', $value))
            ->when($filters['id_botol'] ?? null, fn (Builder $query, string $value) => $query->where('id_botol', $value))
            ->when(in_array($filters['jenis_barang'] ?? null, ['BIBIT', 'ABSOLUTE'], true), fn (Builder $query) => $query->whereHas('barang', fn (Builder $barang) => $barang->where('jenis_barang', $filters['jenis_barang'])));
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
        $query = $this->applyDateRange($query, $filters)
            ->when($filters['status'] ?? null, fn (Builder $query, string $value) => $query->where('jenis_transaksi', $value));

        return $query;
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

        return in_array($perPage, [10, 25, 50], true) ? $perPage : 10;
    }

    private function paginateRows(array $rows): LengthAwarePaginator
    {
        $page = LengthAwarePaginator::resolveCurrentPage();
        $perPage = $this->perPage();

        return (new LengthAwarePaginator(
            array_slice($rows, ($page - 1) * $perPage, $perPage),
            count($rows),
            $perPage,
            $page,
            ['path' => request()->url(), 'query' => request()->query()]
        ));
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
            ['label' => 'Qty ML', 'format' => fn($row) => $this->fmt((float) $row->total_qty_ml)],
            ['label' => 'Qty Botol', 'format' => fn($row) => $this->fmt((float) $row->total_qty_botol)],
            ['label' => 'Detail Barang', 'format' => fn($row) => $this->detailText($row)],
            ['label' => 'Diskon', 'format' => fn($row) => $this->fmt((float) $row->discount, true)],
            ['label' => 'Total', 'format' => fn($row) => $this->fmt((float) $row->total_pembelian, true)],
            ['key' => 'status_pembayaran', 'label' => 'Status'],
        ];
        
        if ($type === 'penjualan' || $type === 'laba-kotor') return [
            ['key' => 'no_penjualan', 'label' => 'No Penjualan'],
            ['label' => 'Customer', 'format' => fn($row) => $row->customer?->nama_customer ?? '-'],
            ['label' => 'Gudang', 'format' => fn($row) => $row->gudang?->nama_gudang ?? '-'],
            ['label' => 'Detail Barang', 'format' => fn($row) => $this->detailText($row)],
            ['label' => 'Diskon', 'format' => fn($row) => $this->fmt((float) $row->discount, true)],
            ['label' => 'Penjualan', 'format' => fn($row) => $this->fmt((float) $row->total_penjualan, true)],
            ['label' => 'Modal', 'format' => fn($row) => $this->fmt((float) $row->total_modal, true)],
            ['label' => 'Laba', 'format' => fn($row) => $this->fmt((float) $row->laba_kotor, true)],
        ];
        
        if ($type === 'stok') return [
            ['key' => 'nama_item', 'label' => 'Barang'],
            ['label' => 'Gudang', 'format' => fn($row) => data_get($row, 'gudang.nama_gudang', '-')],
            ['label' => 'Varian Botol', 'format' => fn($row) => data_get($row, 'botol.nama_botol', '-')],
            ['label' => 'Stok Cairan (ML)', 'format' => fn($row) => $this->fmt((float) data_get($row, 'stok_ml'))],
            ['label' => 'Botol Isi/Terpakai', 'format' => fn($row) => $this->fmt((float) data_get($row, 'stok_botol_isi'))],
            ['label' => 'Minimum', 'format' => fn($row) => data_get($row, 'minimum_stok_ml') ? $this->fmt((float) data_get($row, 'minimum_stok_ml')) : '-'],
        ];

        if ($type === 'mutasi-stok') return [
            ['key' => 'tanggal', 'label' => 'Tanggal'],
            ['key' => 'no_transaksi', 'label' => 'No Transaksi'],
            ['label' => 'Barang', 'format' => fn($row) => $row->barang?->nama_barang ?? '-'],
            ['key' => 'tipe_mutasi', 'label' => 'Tipe'],
            ['label' => 'Qty ML', 'format' => fn($row) => $this->fmt((float) $row->qty_ml)],
        ];

        if ($type === 'barang-summary') return [
            ['label' => 'Varian Botol', 'format' => fn($row) => $row->botolVariant?->nama_botol ?? $row->barang?->botol?->nama_botol ?? '-'],
            ['label' => 'Barang', 'format' => fn($row) => $row->barang?->nama_barang ?? '-'],
            ['label' => 'Gudang', 'format' => fn($row) => $row->gudang?->nama_gudang ?? '-'],
            ['label' => 'Stok Awal', 'format' => fn($row) => $this->fmt((float) $row->stok_awal_ml)],
            ['label' => 'Masuk ML', 'format' => fn($row) => $this->fmt((float) $row->total_masuk_ml)],
            ['label' => 'Keluar ML', 'format' => fn($row) => $this->fmt((float) $row->total_keluar_ml)],
            ['label' => 'Stok Akhir', 'format' => fn($row) => $this->fmt((float) $row->stok_akhir_ml)],
            ['label' => 'Minimum', 'format' => fn($row) => $this->fmt((float) $row->minimum_stok_ml)],
            ['label' => 'Transaksi', 'format' => fn($row) => $this->fmt((float) $row->total_mutasi)],
            ['key' => 'terakhir_mutasi', 'label' => 'Terakhir'],
        ];

        if ($type === 'hutang') return [
            ['key' => 'no_hutang', 'label' => 'No Hutang'],
            ['label' => 'Supplier', 'format' => fn($row) => $row->supplier?->nama_supplier ?? '-'],
            ['label' => 'Total', 'format' => fn($row) => $this->fmt((float) $row->total_hutang, true)],
            ['label' => 'Sisa', 'format' => fn($row) => $this->fmt((float) $row->sisa_hutang, true)],
            ['key' => 'status_hutang', 'label' => 'Status'],
        ];

        if ($type === 'piutang-supplier') return [
            ['key' => 'no_piutang_supplier', 'label' => 'No Piutang'],
            ['label' => 'Supplier', 'format' => fn($row) => $row->supplier?->nama_supplier ?? '-'],
            ['label' => 'Total', 'format' => fn($row) => $this->fmt((float) $row->total_piutang, true)],
            ['label' => 'Sisa', 'format' => fn($row) => $this->fmt((float) $row->sisa_piutang, true)],
            ['key' => 'status_piutang', 'label' => 'Status'],
        ];

        if ($type === 'kas') return [
            ['key' => 'tanggal', 'label' => 'Tanggal'],
            ['key' => 'no_transaksi', 'label' => 'No Transaksi'],
            ['key' => 'jenis_transaksi', 'label' => 'Jenis'],
            ['key' => 'sumber_transaksi', 'label' => 'Sumber'],
            ['key' => 'pihak', 'label' => 'Customer/Sales/Supplier'],
            ['label' => 'Kas Masuk', 'format' => fn($row) => $this->fmt((float) $row->kas_masuk, true)],
            ['label' => 'Kas Keluar', 'format' => fn($row) => $this->fmt((float) $row->kas_keluar, true)],
            ['label' => 'Saldo Akhir', 'format' => fn($row) => $this->fmt((float) $row->saldo_akhir, true)],
            ['key' => 'keterangan', 'label' => 'Keterangan'],
        ];

        return [
            ['key' => 'no_piutang', 'label' => 'No Piutang'],
            ['label' => 'Customer', 'format' => fn($row) => $row->customer?->nama_customer ?? '-'],
            ['label' => 'Total', 'format' => fn($row) => $this->fmt((float) $row->total_piutang, true)],
            ['label' => 'Sisa', 'format' => fn($row) => $this->fmt((float) $row->sisa_piutang, true)],
            ['key' => 'status_piutang', 'label' => 'Status'],
        ];
    }

    /**
     * Format angka sesuai Intl.NumberFormat("id-ID", {maximumFractionDigits:2})
     * Cocok dengan fungsi number() di frontend _components.jsx
     */
    private function fmt(float $value, bool $money = false): string
    {
        $formatted = preg_replace('/,00$/', '', number_format($value, 2, ',', '.'));
        return $money ? 'Rp ' . $formatted : $formatted;
    }

    private function detailText($row): string
    {
        return $row->details->map(function ($detail): string {
            $name = strtoupper($detail->nama_item ?? $detail->barang?->nama_barang ?? $detail->botol?->nama_botol ?? '-');
            $qty = $this->fmt((float) ($detail->konversi_qty_dasar ?: $detail->qty_ml));
            $unit = $detail->satuan_dasar ?? 'ML';
            $ml = (float) $detail->qty_ml;
            $perMl = (float) ($detail->harga_jual_per_ml ?: $detail->harga_beli_per_ml);
            return "{$name}: {$qty} {$unit}" . ($unit === 'BOTOL' ? ' / ' . $this->fmt($ml) . ' ML' : '') . ($perMl > 0 ? ' @ Rp ' . $this->fmt($perMl) . '/ML' : '');
        })->implode('; ');
    }
}
