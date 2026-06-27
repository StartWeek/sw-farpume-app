<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{ $title }}</title>
    <style>
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 11px;
            color: #333;
        }
        .header {
            text-align: center;
            margin-bottom: 25px;
            border-bottom: 2px solid #222;
            padding-bottom: 15px;
        }
        .header h1 {
            margin: 0;
            font-size: 20px;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: bold;
            color: #111;
        }
        .header p {
            margin: 5px 0 0 0;
            font-size: 11px;
            color: #666;
        }
        .filter-table {
            width: 100%;
            margin-bottom: 25px;
            border: none;
            border-collapse: collapse;
        }
        .filter-table td {
            padding: 4px 8px;
            vertical-align: top;
            border: none;
        }
        .filter-label {
            width: 130px;
            font-weight: bold;
            color: #444;
        }
        .filter-value {
            color: #222;
        }
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .data-table th, .data-table td {
            border: 1px solid #ddd;
            padding: 8px 10px;
            text-align: left;
        }
        .data-table th {
            background-color: #f8f9fa;
            font-weight: bold;
            color: #111;
            text-transform: uppercase;
            font-size: 10px;
            letter-spacing: 0.5px;
        }
        .data-table tr:nth-child(even) {
            background-color: #fafafa;
        }
        .text-right {
            text-align: right;
        }
        .text-center {
            text-align: center;
        }
        .font-mono {
            font-family: 'SF Mono', 'Menlo', 'Courier New', monospace;
        }
    </style>
</head>
<body>

    <div class="header">
        <h1>{{ $title }}</h1>
        <p>Dicetak pada: {{ \Carbon\Carbon::now()->format('d-m-Y H:i') }}</p>
    </div>

    @if(count($filters) > 0)
    <table class="filter-table">
        <tbody>
            @php
                $chunks = array_chunk($filters, 2, true);
            @endphp
            @foreach($chunks as $chunk)
            <tr>
                @foreach($chunk as $key => $value)
                <td class="filter-label">{{ $key }}</td>
                <td class="filter-value">: {{ is_array($value) ? implode(', ', $value) : $value }}</td>
                @endforeach
                @if(count($chunk) == 1)
                <td colspan="2"></td>
                @endif
            </tr>
            @endforeach
        </tbody>
    </table>
    @endif

    <table class="data-table">
        <thead>
            <tr>
                @foreach($columns as $col)
                    <th>{{ $col['label'] }}</th>
                @endforeach
            </tr>
        </thead>
        <tbody>
            @forelse($rows as $row)
                <tr>
                    @foreach($columns as $col)
                        @php
                            $val = null;
                            if (isset($col['format']) && is_callable($col['format'])) {
                                $val = $col['format']($row);
                            } elseif (isset($col['key'])) {
                                $val = data_get($row, $col['key']);
                            }
                            if (isset($col['key']) && preg_match('/tanggal|_at$/i', $col['key']) && $val) {
                                $val = \Carbon\Carbon::parse($val)->format('d-m-y');
                            }
                            $display = is_string($val) ? mb_strtoupper($val) : ($val ?? '-');
                            $isNumeric = is_numeric($val) || (is_string($val) && preg_match('/^Rp\s/', $val));
                            $isCenter = isset($col['key']) && preg_match('/status|tipe/i', $col['key']);
                        @endphp
                        <td class="{{ $isNumeric ? 'text-right' : '' }}{{ $isCenter ? 'text-center' : '' }}">
                            {{ $display }}
                        </td>
                    @endforeach
                </tr>
            @empty
                <tr>
                    <td colspan="{{ count($columns) }}" style="text-align: center; padding: 20px;">Data tidak tersedia.</td>
                </tr>
            @endforelse
        </tbody>
        @if(!empty($summary))
        <tfoot>
            <tr style="background-color: #e9ecef; font-weight: bold;">
                <td style="text-transform: uppercase;">GRAND TOTAL</td>
                @php
                    $summaryValues = array_values($summary);
                    $summaryLabels = array_keys($summary);
                    $colCount = count($columns);
                    $valIdx = 0;
                @endphp
                @for($c = 1; $c < $colCount; $c++)
                    @php
                        $val = $summaryValues[$valIdx] ?? null;
                        $lbl = $summaryLabels[$valIdx] ?? '';
                        $display = '';
                        if ($val !== null) {
                            $formatted = preg_replace('/,00$/', '', number_format((float) $val, 2, ',', '.'));
                            $display = preg_match('/ML|BOTOL|TRANSAKSI/i', $lbl)
                                ? $formatted
                                : 'Rp ' . $formatted;
                            $valIdx++;
                        }
                    @endphp
                    <td class="text-right">{{ $display }}</td>
                @endfor
            </tr>
        </tfoot>
        @endif
    </table>

    @if(!empty($botolStockColumns))
        <h3 style="margin-top: 25px; padding-top: 15px; border-top: 2px solid #222;">STOK BOTOL KOSONG</h3>
        <table class="data-table">
            <thead>
                <tr>
                    @foreach($botolStockColumns as $col)
                        <th>{{ $col['label'] }}</th>
                    @endforeach
                </tr>
            </thead>
            <tbody>
                @forelse($botolStock as $row)
                    <tr>
                        @foreach($botolStockColumns as $col)
                            @php
                                $val = null;
                                if (isset($col['format']) && is_callable($col['format'])) {
                                    $val = $col['format']($row);
                                } elseif (isset($col['key'])) {
                                    $val = data_get($row, $col['key']);
                                }
                                $display = is_string($val) ? mb_strtoupper($val) : ($val ?? '-');
                                $isNumeric = is_numeric($val) || (is_string($val) && preg_match('/^Rp\s/', $val));
                            @endphp
                            <td class="{{ $isNumeric ? 'text-right' : '' }}">
                                {{ $display }}
                            </td>
                        @endforeach
                    </tr>
                @empty
                    <tr>
                        <td colspan="{{ count($botolStockColumns) }}" style="text-align: center; padding: 20px;">Data botol kosong tidak tersedia.</td>
                    </tr>
                @endforelse
            </tbody>
        </table>
    @endif

    @if(!empty($groups))
        <h3 style="margin-top: 20px;">REKAP PER PIHAK</h3>
        <table class="data-table"><thead><tr><th>Customer/Supplier</th><th>Total</th><th>Sisa</th></tr></thead><tbody>
        @foreach($groups as $group)<tr><td>{{ strtoupper($group['pihak']) }}</td><td class="text-right">Rp {{ preg_replace('/,00$/', '', number_format($group['total'], 2, ',', '.')) }}</td><td class="text-right">Rp {{ preg_replace('/,00$/', '', number_format($group['sisa'], 2, ',', '.')) }}</td></tr>@endforeach
        </tbody></table>
    @endif

</body>
</html>
