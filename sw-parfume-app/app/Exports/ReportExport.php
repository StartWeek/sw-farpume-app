<?php

namespace App\Exports;

use Illuminate\Contracts\View\View;
use Maatwebsite\Excel\Concerns\FromView;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;

class ReportExport implements FromView, ShouldAutoSize
{
    protected string $title;
    protected array $filters;
    protected array $columns;
    protected $rows;
    protected array $summary;
    protected array $groups;
    protected array $botolStock;
    protected array $botolStockColumns;

    public function __construct(
        string $title,
        array $filters,
        array $columns,
        $rows,
        array $summary = [],
        array $groups = [],
        array $botolStock = [],
        array $botolStockColumns = []
    ) {
        $this->title = $title;
        $this->filters = $filters;
        $this->columns = $columns;
        $this->rows = $rows;
        $this->summary = $summary;
        $this->groups = $groups;
        $this->botolStock = $botolStock;
        $this->botolStockColumns = $botolStockColumns;
    }

    public function view(): View
    {
        return view('exports.report', [
            'title' => $this->title,
            'filters' => $this->filters,
            'columns' => $this->columns,
            'rows' => $this->rows,
            'summary' => $this->summary,
            'groups' => $this->groups,
            'botolStock' => $this->botolStock,
            'botolStockColumns' => $this->botolStockColumns,
        ]);
    }
}
