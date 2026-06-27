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

    public function __construct(string $title, array $filters, array $columns, $rows, array $summary = [], array $groups = [])
    {
        $this->title = $title;
        $this->filters = $filters;
        $this->columns = $columns;
        $this->rows = $rows;
        $this->summary = $summary;
        $this->groups = $groups;
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
        ]);
    }
}
