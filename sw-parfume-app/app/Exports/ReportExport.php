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

    public function __construct(string $title, array $filters, array $columns, $rows)
    {
        $this->title = $title;
        $this->filters = $filters;
        $this->columns = $columns;
        $this->rows = $rows;
    }

    public function view(): View
    {
        return view('exports.report', [
            'title' => $this->title,
            'filters' => $this->filters,
            'columns' => $this->columns,
            'rows' => $this->rows,
        ]);
    }
}
