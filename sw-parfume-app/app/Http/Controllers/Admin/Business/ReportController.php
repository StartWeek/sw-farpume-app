<?php

namespace App\Http\Controllers\Admin\Business;

use App\Exports\ReportExport;
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
use App\Models\Business\TransactionValidation;
use App\Models\Business\TransaksiBotolKosong;
use App\Services\Business\BusinessService;
use App\Services\Business\TransactionValidationService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class ReportController extends Controller
{
    public function show(Request $request, string $type): InertiaResponse|SymfonyResponse|JsonResponse
    {
        abort_unless(in_array($type, ['validasi-transaksi', 'pembelian', 'penjualan', 'laba-kotor', 'stok', 'mutasi-stok', 'barang-summary', 'hutang', 'piutang', 'piutang-supplier', 'kas'], true), 404);
        if ($request->has('options')) {
            return $this->searchOptions($request, $type);
        }
        $searched = $request->boolean('search');
        $export = $request->query('export');
        $filters = $request->only([
            'validation_type',
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
            'barcode',
        ]);
        if ($type === 'laba-kotor') {
            $filters = array_intersect_key($filters, array_flip(['tanggal_dari', 'tanggal_sampai', 'id_gudang', 'tipe_penjualan']));
            $request->validate([
                'id_gudang' => ['nullable', 'integer', 'min:1'],
                'tipe_penjualan' => ['nullable', Rule::in(['RETAIL', 'GROSIR'])],
            ]);
        }
        if ($type !== 'stok') {
            if (! $request->has('search')) {
                $operationalDate = app(BusinessService::class)->operationalDate()->toDateString();
                $filters += ['tanggal_dari' => $operationalDate, 'tanggal_sampai' => $operationalDate];
            }
        }
        $request->validate([
            'barcode' => ['nullable', 'string', 'max:255'],
            'per_page' => ['nullable', 'integer', Rule::in([10, 25, 50])],
            'page' => ['nullable', 'integer', 'min:1'],
            'botol_page' => ['nullable', 'integer', 'min:1'],
            'groups_page' => ['nullable', 'integer', 'min:1'],
            'tanggal_dari' => ['nullable', 'date'],
            'tanggal_sampai' => ['nullable', 'date', ...($request->filled('tanggal_dari') ? ['after_or_equal:tanggal_dari'] : [])],
        ]);
        if (isset($filters['barcode'])) {
            $filters['barcode'] = strtoupper(trim($filters['barcode']));
        }
        if ($type === 'stok') {
            $request->validate([
                'stok_status' => ['nullable', Rule::in(['TERSEDIA', 'HABIS'])],
            ]);
        }

        if ($type === 'validasi-transaksi') {
            $request->validate([
                'status' => ['nullable', Rule::in(['PENDING', 'APPROVED', 'REJECTED'])],
                'validation_type' => ['nullable', Rule::in(array_keys(TransactionValidationService::TYPES))],
            ]);
        }
        if (! $searched) {
            return Inertia::render('admin/business/ReportPage', [
                'type' => $type, 'searched' => false, 'filters' => $filters,
                'reportAvailable' => $this->reportAvailable($type, $filters),
                'refs' => $this->refs($type, $filters),
                'rows' => [], 'botolStock' => [], 'botolStockTotal' => 0,
                'botolSummary' => [], 'summary' => [], 'groups' => [],
            ]);
        }
        $rows = $this->reportRowsQuery($type, $filters);

        $summary = $searched ? $this->reportSummary($type, $rows) : [];
        $groups = $searched ? $this->reportGroupsQuery($type, $rows) : null;
        $botolStock = $searched && $type === 'stok' ? $this->botolStockQuery($filters) : null;
        $botolSummary = $searched && $type === 'barang-summary' ? $this->botolSummaryQuery($filters) : null;

        if ($searched && in_array($export, ['pdf', 'excel'], true)) {
            $exportRows = (clone $rows)->get();
            if ($type === 'stok') {
                $exportRows = $exportRows->map(fn (StokGudang $stock) => $this->formatStockRow($stock));
            }
            $groups = $groups?->get()->map(fn (object $group) => (array) $group)->all() ?? [];
            $botolSummaryExport = $type === 'barang-summary' ? $this->botolSummaryRows($filters) : [];
            $botolSummaryColumns = $type === 'barang-summary' ? $this->getExportColumns('botol-summary') : [];
            $botolStockExport = $type === 'stok' ? $this->botolStockRows($filters) : [];
            $botolStockColumns = $type === 'stok' ? [
                ['key' => 'kode_botol', 'label' => 'Kode / Barcode'],
                ['key' => 'nama_item', 'label' => 'Nama Botol Kosong'],
                ['label' => 'Gudang', 'format' => fn ($row) => data_get($row, 'gudang', '-')],
                ['label' => 'Stok Kosong (PCS)', 'format' => fn ($row) => $this->fmt((float) data_get($row, 'stok_botol'))],
            ] : [];
            $columns = $this->getExportColumns($type);
            $title = $this->getExportTitle($type);
            $filename = str($title)->slug();
            $orientation = in_array($request->query('orientation'), ['portrait', 'landscape'], true)
                ? $request->query('orientation')
                : 'landscape';

            $formattedFilters = $this->formatFiltersForExport($filters);

            if ($export === 'pdf') {
                return Pdf::loadView('exports.report', [
                    'title' => $title,
                    'portraitValidation' => $type === 'validasi-transaksi' && $orientation === 'portrait',
                    'filters' => $formattedFilters,
                    'columns' => $columns,
                    'rows' => $exportRows,
                    'summary' => $summary,
                    'groups' => $groups,
                    'botolStock' => $botolStockExport,
                    'botolStockColumns' => $botolStockColumns,
                    'botolSummary' => $botolSummaryExport,
                    'botolSummaryColumns' => $botolSummaryColumns,
                ])->setPaper('a4', $orientation)->download($filename.'.pdf');
            }

            if ($export === 'excel') {
                return Excel::download(
                    new ReportExport($title, $formattedFilters, $columns, $exportRows, $summary, $groups, $botolStockExport, $botolStockColumns, $botolSummaryExport, $botolSummaryColumns),
                    $filename.'.xlsx'
                );
            }
        }

        return Inertia::render('admin/business/ReportPage', [
            'type' => $type,
            'searched' => $searched,
            'filters' => $filters,
            'refs' => $this->refs($type, $filters),
            'rows' => $searched ? $this->paginateReportRows($type, $rows) : [],
            'botolStock' => $botolStock ? (clone $botolStock)->paginate($this->perPage(), ['*'], 'botol_page')->withQueryString()
                ->through(fn (BotolKosong $botol) => $this->formatBotolStockRow($botol)) : [],
            'botolStockTotal' => $botolStock ? (float) (clone $botolStock)->sum('stock') : 0,
            'botolSummary' => $botolSummary?->paginate($this->perPage(), ['*'], 'botol_page')->withQueryString()
                ->through(fn (TransaksiBotolKosong $row) => $this->formatBotolSummaryRow($row)) ?? [],
            'summary' => $summary,
            'groups' => $groups?->paginate($this->perPage(), ['*'], 'groups_page')->withQueryString() ?? [],
        ]);
    }

    private function reportRowsQuery(string $type, array $filters): Builder
    {
        return match ($type) {
            'validasi-transaksi' => $this->applyDateRange(TransactionValidation::query(), $filters, 'operational_date')
                ->when($filters['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
                ->when($filters['validation_type'] ?? null, fn ($query, $value) => $query->where('type', $value))->latest('id'),
            'pembelian' => $this->applyPurchaseFilters(Pembelian::query()->with(['supplier', 'gudang', 'details.barang', 'details.botol', 'details.botolKosong']), $filters)->latest('id'),
            'penjualan', 'laba-kotor' => $this->applySalesFilters(Penjualan::query()->with(['customer', 'sales', 'gudang', 'details.barang', 'details.botol', 'details.botolKosong']), $filters)->latest('id'),
            'stok' => $this->stockReportQuery($filters),
            'mutasi-stok' => $this->applyMutationFilters(MutasiStok::query()->with(['gudang', 'barang.brand', 'barang.botol', 'botolVariant']), $filters)->latest('id'),
            'barang-summary' => $this->stockSummaryQuery($filters),
            'hutang' => $this->applyDebtFilters(Hutang::query()->with('supplier'), $filters)->latest('id'),
            'piutang' => $this->applyReceivableFilters(Piutang::query()->with('customer'), $filters)->latest('id'),
            'piutang-supplier' => $this->applySupplierReceivableFilters(PiutangSupplier::query()->with('supplier'), $filters)->latest('id'),
            'kas' => $this->applyCashFilters(KasMutasi::query()->selectRaw('tt_kas_mutasi.*, saldo_akhir - kas_masuk + kas_keluar as saldo_awal'), $filters)->latest('tanggal')->latest('id'),
            default => abort(404),
        };
    }

    private function reportAvailable(string $type, array $filters): bool
    {
        if ($type === 'barang-summary') {
            // Check source rows, not the expensive grouped summary and boundary calculations.
            return (($filters['jenis_barang'] ?? null) !== 'BOTOL' && (
                $this->applyStockBalanceFilters(SaldoBarang::query(), $filters)->exists()
                || $this->applyStockBalanceFilters(HistoriSaldoBarang::query(), $filters)->exists()
            )) || $this->bottleSummaryTransactionsQuery($filters)->exists();
        }

        return $this->reportRowsQuery($type, $filters)->reorder()->exists()
            || ($type === 'stok' && $this->botolStockQuery($filters)->reorder()->exists());
    }

    private function reportSummary(string $type, Builder $rows): array
    {
        if ($type === 'validasi-transaksi') {
            $counts = (clone $rows)->reorder()->select('status')->selectRaw('COUNT(*) as total')
                ->groupBy('status')->pluck('total', 'status');

            return [
                'Pengajuan Menunggu' => (int) ($counts['PENDING'] ?? 0),
                'Pengajuan Disetujui' => (int) ($counts['APPROVED'] ?? 0),
                'Pengajuan Ditolak' => (int) ($counts['REJECTED'] ?? 0),
            ];
        }

        $columns = match ($type) {
            'pembelian' => ['Total Pembelian' => 'total_pembelian', 'Diskon' => 'discount', 'Botol' => 'total_qty_botol', 'ML' => 'total_qty_ml'],
            'penjualan', 'laba-kotor' => ['Total Penjualan' => 'total_penjualan', 'Diskon' => 'discount', 'Modal' => 'total_modal', 'Laba Kotor' => 'laba_kotor', 'Botol' => 'total_qty_botol', 'ML' => 'total_qty_ml'],
            'hutang' => ['Total Hutang' => 'total_hutang', 'Sisa Hutang' => 'sisa_hutang'],
            'piutang', 'piutang-supplier' => ['Total Piutang' => 'total_piutang', 'Sisa Piutang' => 'sisa_piutang'],
            'kas' => ['Kas Masuk' => 'kas_masuk', 'Kas Keluar' => 'kas_keluar'],
            'mutasi-stok' => ['Total ML' => 'qty_ml'],
            'barang-summary' => ['Total Stok Awal ML' => 'stok_awal_ml', 'Total Masuk ML' => 'total_masuk_ml', 'Total Keluar ML' => 'total_keluar_ml', 'Total Stok Akhir ML' => 'stok_akhir_ml'],
            'stok' => ['Total Stok Cairan (ML)' => 'stok_ml', 'Total Perkiraan Botol Isi' => 'stok_botol_isi'],
            default => [],
        };
        $query = DB::query()->fromSub((clone $rows)->reorder()->toBase(), 'report_rows');
        foreach (array_values($columns) as $index => $column) {
            $query->selectRaw("COALESCE(SUM({$column}), 0) as total_{$index}");
        }
        $totals = $query->first();
        $summary = [];
        foreach (array_keys($columns) as $index => $label) {
            $summary[$label] = (float) $totals->{"total_{$index}"};
        }

        if ($type === 'kas') {
            $first = (clone $rows)->withoutEagerLoads()->reorder()->orderBy('id')->first();
            $last = (clone $rows)->withoutEagerLoads()->reorder()->orderByDesc('id')->first();

            return ['Saldo Awal' => (float) ($first?->saldo_awal ?? 0), ...$summary, 'Saldo Akhir' => (float) ($last?->saldo_akhir ?? 0)];
        }

        return $summary;
    }

    private function reportGroupsQuery(string $type, Builder $rows): ?QueryBuilder
    {
        if (! in_array($type, ['piutang', 'piutang-supplier'], true)) {
            return null;
        }
        $table = $type === 'piutang' ? 'tm_customer' : 'tm_supplier';
        $foreignKey = $type === 'piutang' ? 'id_customer' : 'id_supplier';
        $name = $type === 'piutang' ? 'nama_customer' : 'nama_supplier';

        $groups = DB::query()->fromSub((clone $rows)->reorder()->toBase(), 'receivables')
            ->leftJoin($table, "receivables.{$foreignKey}", '=', "{$table}.id")
            ->selectRaw("COALESCE({$table}.{$name}, '-') as pihak, SUM(total_piutang) as total, SUM(sisa_piutang) as sisa")
            ->groupByRaw("COALESCE({$table}.{$name}, '-')");

        return DB::query()->fromSub($groups, 'party_totals')
            ->selectRaw('UPPER(pihak) as pihak, total, sisa')->orderBy('pihak');
    }

    private function optionDefinitions(string $type): array
    {
        if ($type === 'laba-kotor') {
            return ['gudang' => [Gudang::class, 'id_gudang', 'nama_gudang', 'kode_gudang']];
        }
        $definitions = [];
        if (in_array($type, ['pembelian', 'penjualan', 'laba-kotor', 'stok', 'mutasi-stok', 'barang-summary'], true)) {
            $definitions = [
                'barang' => [BarangBibit::class, 'id_barang', 'nama_barang', 'kode_barang'],
                'botol' => [Botol::class, 'id_botol', 'nama_botol', 'kode_botol'],
                'botol_kosong' => [BotolKosong::class, 'id_botol', 'nama_botol', 'kode_botol'],
                'gudang' => [Gudang::class, 'id_gudang', 'nama_gudang', 'kode_gudang'],
            ];
        }
        if (in_array($type, ['penjualan', 'laba-kotor', 'piutang'], true)) {
            $definitions['customer'] = [Customer::class, 'id_customer', 'nama_customer', null];
        }
        if (in_array($type, ['pembelian', 'hutang', 'piutang-supplier'], true)) {
            $definitions['supplier'] = [Supplier::class, 'id_supplier', 'nama_supplier', null];
        }

        return $definitions;
    }

    private function optionColumns(string $resource, string $name, ?string $code): array
    {
        return array_filter(['id', $name, $code, $resource === 'customer' ? 'tipe_customer' : null, $resource === 'gudang' ? 'tipe_gudang' : null]);
    }

    private function refs(string $type, array $filters): array
    {
        if ($type === 'validasi-transaksi') {
            return ['validation_types' => collect(TransactionValidationService::TYPES)->map(fn ($value, $key) => ['value' => $key, 'label' => $value['label']])->values()];
        }
        $refs = [];
        foreach ($this->optionDefinitions($type) as $resource => [$model, $filter, $name, $code]) {
            if (in_array($resource, ['botol', 'botol_kosong'], true) && ($resource === 'botol_kosong') !== (($filters['jenis_barang'] ?? '') === 'BOTOL')) {
                $refs[$resource] = [];

                continue;
            }
            $refs[$resource] = ! empty($filters[$filter])
                ? $model::query()->whereKey($filters[$filter])->get($this->optionColumns($resource, $name, $code))
                : [];
        }

        return $refs;
    }

    private function searchOptions(Request $request, string $type): JsonResponse
    {
        $values = $request->validate([
            'options' => ['required', Rule::in(array_keys($this->optionDefinitions($type)))],
            'search' => ['nullable', 'string', 'max:100'],
            'tipe_gudang' => ['nullable', Rule::in(['BIBIT', 'BOTOL'])],
        ]);
        $resource = $values['options'];
        [$model, , $name, $code] = $this->optionDefinitions($type)[$resource];
        $term = trim($values['search'] ?? '');
        $query = $model::query()->where('status', 'AKTIF')
            ->when($term !== '', fn (Builder $query) => $query->where(function (Builder $query) use ($term, $name, $code): void {
                $query->where($name, 'like', '%'.$term.'%');
                if ($code) {
                    $query->orWhere($code, 'like', '%'.$term.'%');
                }
            }))
            ->when($resource === 'gudang' && ! empty($values['tipe_gudang']), fn (Builder $query) => $query->where('tipe_gudang', $values['tipe_gudang']))
            ->orderBy($name)->orderBy('id');
        $rows = $query->limit(26)->get($this->optionColumns($resource, $name, $code));

        return response()->json(['data' => $rows->take(25)->values(), 'has_more' => $rows->count() > 25]);
    }

    private function formatFiltersForExport(array $filters): array
    {
        $formatted = [];
        if (! empty($filters['barcode'])) {
            $formatted['Kode / Barcode'] = $filters['barcode'];
        }

        if (! empty($filters['tanggal_dari']) || ! empty($filters['tanggal_sampai'])) {
            $dari = ! empty($filters['tanggal_dari']) ? date('d-m-Y', strtotime($filters['tanggal_dari'])) : '-';
            $sampai = ! empty($filters['tanggal_sampai']) ? date('d-m-Y', strtotime($filters['tanggal_sampai'])) : '-';
            $formatted['Periode'] = $dari.' s/d '.$sampai;
        }

        if (! empty($filters['id_supplier'])) {
            $formatted['Supplier'] = Supplier::find($filters['id_supplier'])?->nama_supplier ?? $filters['id_supplier'];
        }

        if (! empty($filters['id_customer'])) {
            $formatted['Customer'] = Customer::find($filters['id_customer'])?->nama_customer ?? $filters['id_customer'];
        }

        if (! empty($filters['id_gudang'])) {
            $formatted['Gudang'] = Gudang::find($filters['id_gudang'])?->nama_gudang ?? $filters['id_gudang'];
        }

        if (! empty($filters['id_barang'])) {
            $formatted['Barang Bibit'] = BarangBibit::find($filters['id_barang'])?->nama_barang ?? $filters['id_barang'];
        }

        if (! empty($filters['id_botol'])) {
            $formatted['Botol'] = Botol::find($filters['id_botol'])?->nama_botol ?? $filters['id_botol'];
        }

        if (! empty($filters['status'])) {
            $isValidationStatus = in_array($filters['status'], ['PENDING', 'APPROVED', 'REJECTED'], true);
            $formatted[$isValidationStatus ? 'Status Validasi' : 'Status Pembayaran'] = $isValidationStatus ? $this->validationStatus($filters['status']) : $filters['status'];
        }

        if (! empty($filters['tipe_mutasi'])) {
            $formatted['Tipe Mutasi'] = $filters['tipe_mutasi'];
        }

        if (! empty($filters['tipe_penjualan'])) {
            $formatted['Tipe Penjualan'] = $filters['tipe_penjualan'];
        }

        if (! empty($filters['stok_status'])) {
            $formatted['Status Stok'] = match ($filters['stok_status']) {
                'TERSEDIA' => 'Ada Stok',
                'HABIS' => 'Stok Habis',
                default => $filters['stok_status'],
            };
        }

        if (! empty($filters['jenis_barang'])) {
            $formatted['Jenis Barang'] = $filters['jenis_barang'];
        }

        if (! empty($filters['validation_type'])) {
            $formatted['Jenis Transaksi'] = TransactionValidationService::TYPES[$filters['validation_type']]['label'] ?? $filters['validation_type'];
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
        return $this->applyBarcodeFilter($query, $filters)
            ->when($filters['id_gudang'] ?? null, fn (Builder $query, string $value) => $query->where('tt_stok_gudang.id_gudang', $value))
            ->when($filters['id_barang'] ?? null, fn (Builder $query, string $value) => $query->where('tt_stok_gudang.id_barang', $value))
            ->when($filters['id_botol'] ?? null, fn (Builder $query, string $value) => $query->where('tt_stok_gudang.id_botol', $value))
            ->when(in_array($filters['jenis_barang'] ?? null, ['BIBIT', 'ABSOLUTE'], true), fn (Builder $query) => $query->whereHas('barang', fn (Builder $barang) => $barang->where('jenis_barang', $filters['jenis_barang'])))
            ->when(($filters['stok_status'] ?? null) === 'HABIS', fn (Builder $query) => $query->where('tt_stok_gudang.stok_ml', '=', 0))
            ->when(($filters['stok_status'] ?? null) === 'TERSEDIA', fn (Builder $query) => $query->where('tt_stok_gudang.stok_ml', '>', 0));
    }

    private function stockReportQuery(array $filters): Builder
    {
        $query = $this->applyStockFilters(
            StokGudang::query()->with(['gudang', 'barang.brand', 'barang.botol', 'botolVariant']), $filters
        )
            ->join('tm_barang_bibit', 'tt_stok_gudang.id_barang', '=', 'tm_barang_bibit.id')
            ->leftJoin('tm_botol', 'tt_stok_gudang.id_botol', '=', 'tm_botol.id')
            ->leftJoin('tm_botol as default_botol', 'tm_barang_bibit.id_botol', '=', 'default_botol.id')
            ->orderBy('tm_botol.varian_ml')
            ->orderBy('tm_barang_bibit.nama_barang')
            ->orderBy('tt_stok_gudang.id')
            ->select('tt_stok_gudang.*');
        $capacity = 'COALESCE(tm_botol.varian_ml, default_botol.varian_ml, 0)';
        $bottles = "1.0 * tt_stok_gudang.stok_ml / NULLIF({$capacity}, 0)";
        // ROUND plus a remainder check is CEIL-compatible on both SQLite and MySQL.
        $query->selectRaw("CASE WHEN {$capacity} > 0 THEN ROUND({$bottles}, 0) + CASE WHEN {$bottles} > ROUND({$bottles}, 0) THEN 1 ELSE 0 END ELSE 0 END as stok_botol_isi");

        if (($filters['jenis_barang'] ?? null) === 'BOTOL') {
            $query->whereRaw('1 = 0');
        }

        return $query;
    }

    private function formatStockRow(StokGudang $stock): array
    {
        return [
            'id' => 'cairan-'.$stock->id,
            'kode_barang' => $stock->barang?->kode_barang,
            'nama_item' => $stock->barang?->nama_barang ?? '-',
            'gudang' => $stock->gudang,
            'botol' => $stock->botolVariant ?? $stock->barang?->botol,
            'stok_ml' => (float) $stock->stok_ml,
            'stok_botol_isi' => $stock->stok_botol_isi,
            'minimum_stok_ml' => (float) $stock->minimum_stok_ml,
        ];
    }

    private function botolStockQuery(array $filters): Builder
    {
        $query = BotolKosong::query()->with('gudang')->orderBy('nama_botol')->orderBy('id');
        if (! empty($filters['jenis_barang']) && $filters['jenis_barang'] !== 'BOTOL') {
            $query->whereRaw('1 = 0');
        }
        $query
            ->when(($filters['stok_status'] ?? null) === 'HABIS', fn (Builder $query) => $query->where('stock', '=', 0))
            ->when(($filters['stok_status'] ?? null) === 'TERSEDIA', fn (Builder $query) => $query->where('stock', '>', 0));
        if (! empty($filters['barcode'])) {
            $query->whereRaw('UPPER(kode_botol) = ?', [$filters['barcode']]);
        }

        if (! empty($filters['id_botol'])) {
            $query->whereKey($filters['id_botol']);
        }

        if (! empty($filters['id_gudang'])) {
            $query->where('id_gudang', $filters['id_gudang']);
        }

        return $query;
    }

    private function formatBotolStockRow(BotolKosong $botol): array
    {
        return [
            'id' => 'botol-'.$botol->id,
            'kode_botol' => $botol->kode_botol,
            'nama_item' => $botol->nama_botol,
            'gudang' => $botol->gudang?->nama_gudang ?? '-',
            'stok_botol' => (float) $botol->stock,
        ];
    }

    private function botolStockRows(array $filters): array
    {
        return $this->botolStockQuery($filters)->get()
            ->map(fn (BotolKosong $botol) => $this->formatBotolStockRow($botol))->all();
    }

    private function bottleSummaryTransactionsQuery(array $filters): Builder
    {
        return $this->applyBarcodeFilter(TransaksiBotolKosong::query(), $filters, 'botol', 'kode_botol')
            ->when($filters['tanggal_dari'] ?? null, fn (Builder $query, string $value) => $query->whereDate('tanggal', '>=', $value))
            ->when($filters['tanggal_sampai'] ?? null, fn (Builder $query, string $value) => $query->whereDate('tanggal', '<=', $value))
            ->when($filters['id_gudang'] ?? null, fn (Builder $query, string $value) => $query->where('id_gudang', $value))
            ->when($filters['id_botol'] ?? null, fn (Builder $query, string $value) => $query->where('id_botol_kosong', $value))
            ->when(! empty($filters['jenis_barang']) && $filters['jenis_barang'] !== 'BOTOL', fn (Builder $query) => $query->whereRaw('1 = 0'));
    }

    private function botolSummaryQuery(array $filters): Builder
    {
        $transactions = $this->bottleSummaryTransactionsQuery($filters)->toBase();
        $grouped = DB::query()->fromSub($transactions, 'transactions')
            ->select('id_gudang', 'id_botol_kosong')
            ->selectRaw("SUM(CASE WHEN tipe_mutasi = 'MASUK' THEN qty_botol ELSE 0 END) as total_masuk")
            ->selectRaw("SUM(CASE WHEN tipe_mutasi = 'KELUAR' THEN qty_botol ELSE 0 END) as total_keluar")
            ->selectRaw('COUNT(*) as total_mutasi, MAX(tanggal) as terakhir_mutasi')
            ->groupBy('id_gudang', 'id_botol_kosong');
        foreach (['stok_awal' => 'asc', 'stok_akhir' => 'desc'] as $column => $direction) {
            $boundary = DB::query()->fromSub($transactions, 'boundary')
                ->whereColumn('boundary.id_gudang', 'transactions.id_gudang')
                ->whereColumn('boundary.id_botol_kosong', 'transactions.id_botol_kosong')
                ->orderBy('tanggal', $direction)->orderBy('id', $direction)->limit(1)->select($column);
            $grouped->selectSub($boundary, $column);
        }

        return TransaksiBotolKosong::query()->fromSub($grouped, 'tt_botol_kosong')
            ->with(['gudang', 'botol'])->orderBy('id_gudang')->orderBy('id_botol_kosong');
    }

    private function formatBotolSummaryRow(TransaksiBotolKosong $row): array
    {
        return [
            'id' => 'botol-summary-'.$row->id_gudang.'-'.$row->id_botol_kosong,
            'kode_botol' => $row->botol?->kode_botol,
            'nama_item' => $row->botol?->nama_botol ?? '-',
            'gudang' => $row->gudang?->nama_gudang ?? '-',
            'stok_awal' => (float) $row->stok_awal,
            'total_masuk' => (float) $row->total_masuk,
            'total_keluar' => (float) $row->total_keluar,
            'stok_akhir' => (float) $row->stok_akhir,
            'total_mutasi' => (int) $row->total_mutasi,
            'terakhir_mutasi' => $row->terakhir_mutasi,
        ];
    }

    private function botolSummaryRows(array $filters): array
    {
        return $this->botolSummaryQuery($filters)->get()
            ->map(fn (TransaksiBotolKosong $row) => $this->formatBotolSummaryRow($row))->all();
    }

    private function applyMutationFilters(Builder $query, array $filters): Builder
    {
        return $this->applyBarcodeFilter($this->applyDateRange($query, $filters), $filters)
            ->when($filters['id_gudang'] ?? null, fn (Builder $query, string $value) => $query->where('id_gudang', $value))
            ->when($filters['id_barang'] ?? null, fn (Builder $query, string $value) => $query->where('id_barang', $value))
            ->when($filters['id_botol'] ?? null, fn (Builder $query, string $value) => $query->where('tt_mutasi_stok.id_botol', $value))
            ->when($filters['tipe_mutasi'] ?? null, fn (Builder $query, string $value) => $query->where('tipe_mutasi', $value));
    }

    private function stockSummaryQuery(array $filters): Builder
    {
        $columns = ['id', 'tanggal', 'id_gudang', 'id_barang', 'id_botol', 'stok_awal_ml', 'masuk_ml', 'keluar_ml', 'stok_akhir_ml', 'minimum_stok_ml', 'total_mutasi', 'terakhir_mutasi'];
        $history = $this->applyStockBalanceFilters(HistoriSaldoBarang::query(), $filters)
            ->select($columns)->selectRaw('0 as source_order')->toBase();
        $active = $this->applyStockBalanceFilters(SaldoBarang::query(), $filters)
            ->select($columns)->selectRaw('1 as source_order')->toBase();
        $balances = $history->unionAll($active);
        $grouped = DB::query()->fromSub($balances, 'balances')
            ->select('id_gudang', 'id_barang', 'id_botol')
            ->selectRaw('SUM(masuk_ml) as total_masuk_ml, SUM(keluar_ml) as total_keluar_ml, SUM(masuk_ml) - SUM(keluar_ml) as selisih_ml')
            ->selectRaw('SUM(total_mutasi) as total_mutasi')
            ->groupBy('id_gudang', 'id_barang', 'id_botol');

        foreach (['stok_awal_ml' => 'asc', 'stok_akhir_ml' => 'desc', 'minimum_stok_ml' => 'desc', 'terakhir_mutasi' => 'desc'] as $column => $direction) {
            $boundary = DB::query()->fromSub($balances, 'boundary')
                ->whereColumn('boundary.id_gudang', 'balances.id_gudang')
                ->whereColumn('boundary.id_barang', 'balances.id_barang')
                ->where(fn (QueryBuilder $query) => $query->whereColumn('boundary.id_botol', 'balances.id_botol')
                    ->orWhere(fn (QueryBuilder $query) => $query->whereNull('boundary.id_botol')->whereNull('balances.id_botol')))
                ->when($column === 'terakhir_mutasi', fn (QueryBuilder $query) => $query->whereNotNull('terakhir_mutasi'))
                ->orderBy('tanggal', $direction)->orderBy('source_order', $direction)->orderBy('id', $direction)
                ->limit(1)->select($column);
            $grouped->selectSub($boundary, $column);
        }

        return SaldoBarang::query()->fromSub($grouped, 'tt_saldo_barang')
            ->with(['gudang', 'barang.brand', 'barang.botol', 'botolVariant'])
            ->withCasts(['total_masuk_ml' => 'float', 'total_keluar_ml' => 'float', 'selisih_ml' => 'float', 'total_mutasi' => 'integer'])
            ->when(($filters['jenis_barang'] ?? null) === 'BOTOL', fn (Builder $query) => $query->whereRaw('1 = 0'))
            ->orderByDesc('terakhir_mutasi')->orderBy('id_gudang')->orderBy('id_barang')->orderBy('id_botol');
    }

    private function applyStockBalanceFilters(Builder $query, array $filters): Builder
    {
        return $this->applyBarcodeFilter($query, $filters)
            ->when($filters['tanggal_dari'] ?? null, fn (Builder $query, string $value) => $query->whereDate('tanggal', '>=', $value))
            ->when($filters['tanggal_sampai'] ?? null, fn (Builder $query, string $value) => $query->whereDate('tanggal', '<=', $value))
            ->when($filters['id_gudang'] ?? null, fn (Builder $query, string $value) => $query->where('id_gudang', $value))
            ->when($filters['id_barang'] ?? null, fn (Builder $query, string $value) => $query->where('id_barang', $value))
            ->when($filters['id_botol'] ?? null, fn (Builder $query, string $value) => $query->where('id_botol', $value))
            ->when(in_array($filters['jenis_barang'] ?? null, ['BIBIT', 'ABSOLUTE'], true), fn (Builder $query) => $query->whereHas('barang', fn (Builder $barang) => $barang->where('jenis_barang', $filters['jenis_barang'])));
    }

    private function applyBarcodeFilter(Builder $query, array $filters, string $relation = 'barang', string $column = 'kode_barang'): Builder
    {
        return $query->when($filters['barcode'] ?? null, fn (Builder $query, string $code) => $query
            ->whereHas($relation, fn (Builder $item) => $item->whereRaw("UPPER({$column}) = ?", [$code])));
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

    private function applyDateRange(Builder $query, array $filters, string $column = 'tanggal'): Builder
    {
        return $query
            ->when($filters['tanggal_dari'] ?? null, fn (Builder $query, string $value) => $query->whereDate($column, '>=', $value))
            ->when($filters['tanggal_sampai'] ?? null, fn (Builder $query, string $value) => $query->whereDate($column, '<=', $value));
    }

    private function perPage(): int
    {
        $perPage = (int) request('per_page', 10);

        return in_array($perPage, [10, 25, 50], true) ? $perPage : 10;
    }

    private function paginateReportRows(string $type, Builder $rows): LengthAwarePaginator
    {
        $pagination = (clone $rows)->paginate($this->perPage())->withQueryString();

        if ($type === 'stok') {
            $pagination->through(fn (StokGudang $stock) => $this->formatStockRow($stock));
        }

        return $pagination;
    }

    private function getExportTitle(string $type): string
    {
        return match ($type) {
            'validasi-transaksi' => 'Laporan Validasi Transaksi',
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
        if ($type === 'validasi-transaksi') {
            return [
                ['key' => 'number', 'label' => 'No Validasi'],
                ['label' => 'Tanggal Operasional', 'format' => fn ($row) => $row->operational_date->format('d-m-Y')],
                ['label' => 'Jenis Transaksi', 'format' => fn ($row) => data_get($row, 'snapshot.label', '-')],
                ['label' => 'Pihak / Gudang', 'format' => fn ($row) => data_get($row, 'snapshot.party', '-').' / '.data_get($row, 'snapshot.warehouse', '-')],
                ['label' => 'Detail Barang / Barcode', 'format' => fn ($row) => collect(data_get($row, 'snapshot.items', []))->map(fn ($item) => '['.($item['code'] ?? '-').'] '.$item['name'])->implode('; ') ?: '-'],
                ['label' => 'Nilai / Jumlah', 'format' => fn ($row) => data_get($row, 'snapshot.amount') !== null ? $this->fmt((float) data_get($row, 'snapshot.amount'), true) : collect(data_get($row, 'snapshot.items', []))->map(fn ($item) => $item['name'].': '.$this->fmt((float) $item['qty']).' '.$item['unit'])->implode('; ')],
                ['label' => 'Status Validasi', 'format' => fn ($row) => $this->validationStatus($row->status)],
                ['key' => 'submitted_by_name', 'label' => 'Pengaju'],
                ['label' => 'Diajukan', 'format' => fn ($row) => $row->created_at?->timezone('Asia/Jakarta')->format('d-m-Y H:i')],
                ['key' => 'reviewed_by_name', 'label' => 'Pemeriksa'],
                ['label' => 'Diperiksa', 'format' => fn ($row) => $row->reviewed_at?->timezone('Asia/Jakarta')->format('d-m-Y H:i') ?? '-'],
                ['label' => 'No Transaksi', 'format' => fn ($row) => data_get($row, 'result.number', '-')],
                ['key' => 'rejection_reason', 'label' => 'Alasan Penolakan'],
            ];
        }
        if ($type === 'pembelian') {
            return [
                ['key' => 'no_pembelian', 'label' => 'No Pembelian'],
                ['label' => 'Supplier', 'format' => fn ($row) => $row->supplier?->nama_supplier ?? '-'],
                ['label' => 'Gudang', 'format' => fn ($row) => $row->gudang?->nama_gudang ?? '-'],
                ['label' => 'Qty ML', 'format' => fn ($row) => $this->fmt((float) $row->total_qty_ml)],
                ['label' => 'Qty Botol', 'format' => fn ($row) => $this->fmt((float) $row->total_qty_botol)],
                ['label' => 'Detail Barang', 'format' => fn ($row) => $this->detailText($row)],
                ['label' => 'Diskon', 'format' => fn ($row) => $this->fmt((float) $row->discount, true)],
                ['label' => 'Total', 'format' => fn ($row) => $this->fmt((float) $row->total_pembelian, true)],
                ['key' => 'status_pembayaran', 'label' => 'Status'],
            ];
        }

        if ($type === 'laba-kotor') {
            return [
                ['key' => 'tanggal', 'label' => 'Tanggal'],
                ['key' => 'no_penjualan', 'label' => 'No Penjualan'],
                ['label' => 'Customer', 'format' => fn ($row) => $row->customer?->nama_customer ?? $row->manual_customer_name ?? '-'],
                ['label' => 'Penjualan Setelah Diskon', 'format' => fn ($row) => $this->fmt((float) $row->total_penjualan, true)],
                ['label' => 'Modal Barang (HPP)', 'format' => fn ($row) => $this->fmt((float) $row->total_modal, true)],
                ['label' => 'Laba Kotor', 'format' => fn ($row) => $this->fmt((float) $row->laba_kotor, true)],
            ];
        }

        if ($type === 'penjualan') {
            return [
                ['key' => 'no_penjualan', 'label' => 'No Penjualan'],
                ['label' => 'Customer', 'format' => fn ($row) => $row->customer?->nama_customer ?? '-'],
                ['label' => 'Gudang', 'format' => fn ($row) => $row->gudang?->nama_gudang ?? '-'],
                ['label' => 'Detail Barang', 'format' => fn ($row) => $this->detailText($row)],
                ['label' => 'Diskon', 'format' => fn ($row) => $this->fmt((float) $row->discount, true)],
                ['label' => 'Penjualan', 'format' => fn ($row) => $this->fmt((float) $row->total_penjualan, true)],
                ['label' => 'Modal', 'format' => fn ($row) => $this->fmt((float) $row->total_modal, true)],
                ['label' => 'Laba', 'format' => fn ($row) => $this->fmt((float) $row->laba_kotor, true)],
            ];
        }

        if ($type === 'stok') {
            return [
                ['key' => 'kode_barang', 'label' => 'Kode / Barcode'],
                ['key' => 'nama_item', 'label' => 'Barang'],
                ['label' => 'Gudang', 'format' => fn ($row) => data_get($row, 'gudang.nama_gudang', '-')],
                ['label' => 'Kapasitas Botol', 'format' => fn ($row) => data_get($row, 'botol.nama_botol', '-')],
                ['key' => 'stok_ml', 'label' => 'Jumlah Isi (ML)', 'format' => fn ($row) => $this->fmt((float) data_get($row, 'stok_ml'))],
                ['key' => 'stok_botol_isi', 'label' => 'Perkiraan Wadah (Botol)', 'format' => fn ($row) => (float) data_get($row, 'botol.varian_ml') > 0 ? $this->fmt((float) data_get($row, 'stok_botol_isi')) : '-'],
            ];
        }

        if ($type === 'mutasi-stok') {
            return [
                ['key' => 'tanggal', 'label' => 'Tanggal'],
                ['key' => 'no_transaksi', 'label' => 'No Transaksi'],
                ['label' => 'Kode / Barcode', 'format' => fn ($row) => $row->barang?->kode_barang ?? '-'],
                ['label' => 'Barang', 'format' => fn ($row) => $row->barang?->nama_barang ?? '-'],
                ['key' => 'tipe_mutasi', 'label' => 'Tipe'],
                ['label' => 'Qty ML', 'format' => fn ($row) => $this->fmt((float) $row->qty_ml)],
            ];
        }

        if ($type === 'barang-summary') {
            return [
                ['label' => 'Kode / Barcode', 'format' => fn ($row) => $row->barang?->kode_barang ?? '-'],
                ['label' => 'Varian Botol', 'format' => fn ($row) => $row->botolVariant?->nama_botol ?? $row->barang?->botol?->nama_botol ?? '-'],
                ['label' => 'Barang', 'format' => fn ($row) => $row->barang?->nama_barang ?? '-'],
                ['label' => 'Gudang', 'format' => fn ($row) => $row->gudang?->nama_gudang ?? '-'],
                ['label' => 'Stok Awal', 'format' => fn ($row) => $this->fmt((float) $row->stok_awal_ml)],
                ['label' => 'Masuk ML', 'format' => fn ($row) => $this->fmt((float) $row->total_masuk_ml)],
                ['label' => 'Keluar ML', 'format' => fn ($row) => $this->fmt((float) $row->total_keluar_ml)],
                ['label' => 'Stok Akhir', 'format' => fn ($row) => $this->fmt((float) $row->stok_akhir_ml)],
                ['label' => 'Minimum', 'format' => fn ($row) => $this->fmt((float) $row->minimum_stok_ml)],
                ['label' => 'Transaksi', 'format' => fn ($row) => $this->fmt((float) $row->total_mutasi)],
                ['key' => 'terakhir_mutasi', 'label' => 'Terakhir'],
            ];
        }

        if ($type === 'botol-summary') {
            return [
                ['key' => 'kode_botol', 'label' => 'Kode / Barcode'],
                ['key' => 'nama_item', 'label' => 'Botol'],
                ['key' => 'gudang', 'label' => 'Gudang'],
                ['key' => 'stok_awal', 'label' => 'Stok Awal'],
                ['key' => 'total_masuk', 'label' => 'Masuk (PCS)'],
                ['key' => 'total_keluar', 'label' => 'Keluar (PCS)'],
                ['key' => 'stok_akhir', 'label' => 'Stok Akhir'],
                ['key' => 'total_mutasi', 'label' => 'Transaksi'],
                ['key' => 'terakhir_mutasi', 'label' => 'Terakhir'],
            ];
        }

        if ($type === 'hutang') {
            return [
                ['key' => 'no_hutang', 'label' => 'No Hutang'],
                ['label' => 'Supplier', 'format' => fn ($row) => $row->supplier?->nama_supplier ?? '-'],
                ['label' => 'Total', 'format' => fn ($row) => $this->fmt((float) $row->total_hutang, true)],
                ['label' => 'Sisa', 'format' => fn ($row) => $this->fmt((float) $row->sisa_hutang, true)],
                ['key' => 'status_hutang', 'label' => 'Status'],
            ];
        }

        if ($type === 'piutang-supplier') {
            return [
                ['key' => 'no_piutang_supplier', 'label' => 'No Piutang'],
                ['label' => 'Supplier', 'format' => fn ($row) => $row->supplier?->nama_supplier ?? '-'],
                ['label' => 'Total', 'format' => fn ($row) => $this->fmt((float) $row->total_piutang, true)],
                ['label' => 'Sisa', 'format' => fn ($row) => $this->fmt((float) $row->sisa_piutang, true)],
                ['key' => 'status_piutang', 'label' => 'Status'],
            ];
        }

        if ($type === 'kas') {
            return [
                ['key' => 'tanggal', 'label' => 'Tanggal'],
                ['key' => 'no_transaksi', 'label' => 'No Transaksi'],
                ['key' => 'jenis_transaksi', 'label' => 'Jenis'],
                ['key' => 'sumber_transaksi', 'label' => 'Sumber'],
                ['key' => 'pihak', 'label' => 'Customer/Sales/Supplier'],
                ['label' => 'Kas Masuk', 'format' => fn ($row) => $this->fmt((float) $row->kas_masuk, true)],
                ['label' => 'Kas Keluar', 'format' => fn ($row) => $this->fmt((float) $row->kas_keluar, true)],
                ['label' => 'Saldo Akhir', 'format' => fn ($row) => $this->fmt((float) $row->saldo_akhir, true)],
                ['key' => 'keterangan', 'label' => 'Keterangan'],
            ];
        }

        return [
            ['key' => 'no_piutang', 'label' => 'No Piutang'],
            ['label' => 'Customer', 'format' => fn ($row) => $row->customer?->nama_customer ?? '-'],
            ['label' => 'Total', 'format' => fn ($row) => $this->fmt((float) $row->total_piutang, true)],
            ['label' => 'Sisa', 'format' => fn ($row) => $this->fmt((float) $row->sisa_piutang, true)],
            ['key' => 'status_piutang', 'label' => 'Status'],
        ];
    }

    private function validationStatus(string $status): string
    {
        return ['PENDING' => 'Menunggu', 'APPROVED' => 'Disetujui', 'REJECTED' => 'Ditolak'][$status] ?? $status;
    }

    /**
     * Format angka sesuai Intl.NumberFormat("id-ID", {maximumFractionDigits:2})
     * Cocok dengan fungsi number() di frontend _components.jsx
     */
    private function fmt(float $value, bool $money = false): string
    {
        $formatted = preg_replace('/,00$/', '', number_format($value, 2, ',', '.'));

        return $money ? 'Rp '.$formatted : $formatted;
    }

    private function detailText($row): string
    {
        return $row->details->map(function ($detail): string {
            $code = $detail->tipe_item === 'BOTOL'
                ? ($detail->botolKosong?->kode_botol ?? $detail->botol?->kode_botol)
                : $detail->barang?->kode_barang;
            $name = strtoupper($detail->nama_item ?? $detail->barang?->nama_barang ?? $detail->botol?->nama_botol ?? '-');
            $qty = $this->fmt((float) ($detail->konversi_qty_dasar ?: $detail->qty_ml));
            $unit = $detail->satuan_dasar ?? 'ML';
            $ml = (float) $detail->qty_ml;
            $perMl = (float) ($detail->harga_jual_per_ml ?: $detail->harga_beli_per_ml);

            return ($code ? '['.$code.'] ' : '')."{$name}: {$qty} {$unit}".($unit === 'BOTOL' ? ' / '.$this->fmt($ml).' ML' : '').($perMl > 0 ? ' @ Rp '.$this->fmt($perMl).'/ML' : '');
        })->implode('; ');
    }
}
