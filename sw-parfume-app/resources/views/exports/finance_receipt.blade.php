<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>{{ $receipt['title'] }} {{ $receipt['number'] }}</title>
    @include('exports.receipt_styles')
</head>
<body>
    @php
        $n = fn ($value) => preg_replace('/,00$/', '', number_format((float) $value, 2, ',', '.'));
        $rp = fn ($value) => 'Rp '.$n($value);
    @endphp
    @include('exports.receipt_header', ['documentTitle' => $receipt['title'], 'documentNumber' => $receipt['number'], 'documentDate' => $receipt['date']])
    <table class="info">
        <tr><td>{{ $receipt['party_label'] }}: <strong>{{ $receipt['party_name'] }}</strong></td><td>Status: {{ $receipt['status'] }}</td></tr>
        @if(!empty($receipt['source_number']) && $receipt['source_number'] !== '-')
            <tr><td colspan="2">Referensi: {{ $receipt['source_number'] }}</td></tr>
        @endif
    </table>
    @if(!empty($receipt['items']))
        <table class="items">
            <thead><tr><th style="width: 75%;">Barang</th><th class="right" style="width: 25%;">Jumlah</th></tr></thead>
            <tbody>
                @foreach($receipt['items'] as $item)
                    <tr><td>{{ $item['name'] }}</td><td class="right">{{ $n($item['qty']) }} {{ $item['unit'] }}</td></tr>
                @endforeach
            </tbody>
        </table>
    @endif
    <table class="summary"><tr><td></td><td>
        <table class="totals">
            <tr><td>Total Tagihan</td><td class="right">{{ $rp($receipt['total']) }}</td></tr>
            <tr><td>Total Dibayar</td><td class="right">{{ $rp($receipt['paid']) }}</td></tr>
            <tr class="grand"><td>Sisa Tagihan</td><td class="right">{{ $rp($receipt['remaining']) }}</td></tr>
        </table>
    </td></tr></table>
    @if(!empty($settings['receipt_footer']))<div class="footer">{{ $settings['receipt_footer'] }}</div>@endif
</body>
</html>
