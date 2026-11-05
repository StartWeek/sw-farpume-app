<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>{{ $title }}</title>
    @include('exports.partials.report_styles')
    <style>
        @page { margin: 12mm; }
        .data-table { table-layout: fixed; }
        .data-table th, .data-table td { vertical-align: top; word-wrap: break-word; }
        .data-table thead { display: table-header-group; }
        .data-table tr { page-break-inside: avoid; }
        .footer { position: fixed; bottom: -6mm; right: 0; font-size: 9px; }
        .page:after { content: counter(page); }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{ $title }}</h1>
        <p>Dicetak pada: {{ now()->timezone('Asia/Jakarta')->format('d-m-Y H:i') }} WIB</p>
    </div>
    @if(count($filters) > 0)
        <table class="filter-table">
            <tbody>
                @foreach(array_chunk($filters, 2, true) as $chunk)
                    <tr>
                        @foreach($chunk as $label => $value)
                            <td class="filter-label">{{ $label }}</td>
                            <td class="filter-value">: {{ $value }}</td>
                        @endforeach
                        @if(count($chunk) == 1)<td colspan="2"></td>@endif
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif
    <div class="footer">Halaman <span class="page"></span></div>
    @foreach(['ML' => 'Cairan (ML)', 'PCS' => 'Botol Kosong (PCS)'] as $unit => $section)
        <h3>{{ strtoupper($section) }}</h3>
        <table class="data-table">
            <thead>
                <tr>@foreach($columns as $column)<th>{{ $column['label'] }}</th>@endforeach</tr>
            </thead>
            <tbody>
                @forelse(collect($rows)->where('unit', $unit) as $row)
                    <tr>
                        @foreach($columns as $column)
                            @php $numeric = in_array($column['key'], ['opening', 'incoming', 'outgoing', 'quantity'], true); @endphp
                            <td class="{{ $numeric ? 'text-right' : '' }}" data-type="{{ $numeric ? 'n' : 's' }}">{{ $numeric && is_numeric(data_get($row, $column['key'])) ? (float) data_get($row, $column['key']) : strtoupper((string) (data_get($row, $column['key']) ?? '-')) }}</td>
                        @endforeach
                    </tr>
                @empty
                    <tr><td colspan="{{ count($columns) }}">Data tidak tersedia.</td></tr>
                @endforelse
            </tbody>
        </table>
    @endforeach
</body>
</html>
