<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{ $title }}</title>
    @include('exports.partials.report_styles')
</head>
<body>

    <div class="header">
        <h1>{{ $title }}</h1>
        <p>Dicetak pada: {{ \Carbon\Carbon::now()->timezone('Asia/Jakarta')->format('d-m-Y H:i').' WIB' }}</p>
    </div>

    @if(array_key_exists('Pengajuan Menunggu', $summary ?? []))
        <p style="font-size:10px; padding:8px; background:#f1f5f9;">@foreach($summary as $label => $value)<strong>{{ $label }}:</strong> {{ $value }} &nbsp;&nbsp; @endforeach</p>
    @endif
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

    @if(!empty($botolSummaryColumns))
        <h3>SUMMARY BOTOL KOSONG</h3>
        <table class="data-table">
            <thead><tr>
                @foreach($botolSummaryColumns as $col)<th>{{ $col['label'] }}</th>@endforeach
            </tr></thead>
            <tbody>
                @forelse($botolSummary as $row)
                    <tr>
                        @foreach($botolSummaryColumns as $col)
                            <td>{{ data_get($row, $col['key']) ?? '-' }}</td>
                        @endforeach
                    </tr>
                @empty
                    <tr><td colspan="{{ count($botolSummaryColumns) }}">Data botol kosong tidak tersedia.</td></tr>
                @endforelse
            </tbody>
        </table>
    @endif

    @if(!empty($botolStockColumns))
        <h3>STOK ISI / CAIRAN</h3>
        <p>Saldo Inventory dan Pembelian dijumlahkan per barang dan gudang. Rincian varian botol tetap terpisah. Perkiraan wadah dijumlahkan per catatan varian yang memiliki kapasitas, dibulatkan ke atas. Botol terakhir bisa terisi sebagian.</p>
    @endif

    @if($portraitValidation ?? false)
        @include('exports.validation_report_portrait')
    @elseif($portraitCash ?? false)
        @include('exports.cash_report_portrait')
    @else
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
                        <td @if(array_key_exists('Pengajuan Menunggu', $summary ?? [])) data-type="s" @endif class="{{ $isNumeric ? 'text-right' : '' }}{{ $isCenter ? 'text-center' : '' }}">
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
        @if(!empty($summary) && !array_key_exists('Pengajuan Menunggu', $summary))
        <tfoot>
            <tr style="background-color: #e9ecef; font-weight: bold;">
                <td style="text-transform: uppercase;">GRAND TOTAL</td>
                @php $colCount = count($columns); @endphp
                @for($c = 1; $c < $colCount; $c++)
                    @php
                        $colLabel = $columns[$c]['label'] ?? $columns[$c]['key'] ?? '';
                        $display = '';
                        // Only try to match on numeric/value columns (skip label/id columns)
                        $skipPattern = '/^(No\.?\s|No\s)/i';
                        if (!empty($botolStockColumns)) {
                            $summaryKey = match ($columns[$c]['key'] ?? '') {
                                'stok_ml' => 'Total Stok Cairan (ML)',
                                'stok_botol_isi' => 'Total Perkiraan Botol Isi',
                                default => null,
                            };
                            if ($summaryKey !== null) {
                                $display = preg_replace('/,00$/', '', number_format((float) ($summary[$summaryKey] ?? 0), 2, ',', '.'));
                            }
                        } elseif (!preg_match($skipPattern, $colLabel)) {
                            foreach($summary as $summaryKey => $summaryVal) {
                                $searchKey = str_replace(['Total ', ' ML'], '', $summaryKey);
                                $colClean = str_replace(['Qty ', 'Total '], '', $colLabel);
                                if (
                                    ($searchKey && stripos($colLabel, $searchKey) !== false) ||
                                    ($colClean && stripos($summaryKey, $colClean) !== false)
                                ) {
                                    $formatted = preg_replace('/,00$/', '', number_format((float) $summaryVal, 2, ',', '.'));
                                    $display = preg_match('/ML|BOTOL|TRANSAKSI/i', $summaryKey)
                                        ? $formatted
                                        : 'Rp ' . $formatted;
                                    break;
                                }
                            }
                        }
                    @endphp
                    <td class="text-right">{{ $display }}</td>
                @endfor
            </tr>
        </tfoot>
        @endif
    </table>
    @endif

    @if(!empty($botolStockColumns))
        <h3 style="margin-top: 25px; padding-top: 15px; border-top: 2px solid #222;">STOK BOTOL KOSONG</h3>
        <p>Persediaan kemasan botol tanpa isi, dicatat dalam buah (PCS).</p>
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
                            <td @if(array_key_exists('Pengajuan Menunggu', $summary ?? [])) data-type="s" @endif class="{{ $isNumeric ? 'text-right' : '' }}">
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
            <tfoot>
                <tr style="background-color: #e9ecef; font-weight: bold;">
                    <td colspan="{{ count($botolStockColumns) - 1 }}">TOTAL BOTOL KOSONG (PCS)</td>
                    <td class="text-right">{{ preg_replace('/,00$/', '', number_format(array_sum(array_column($botolStock, 'stok_botol')), 2, ',', '.')) }}</td>
                </tr>
            </tfoot>
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
