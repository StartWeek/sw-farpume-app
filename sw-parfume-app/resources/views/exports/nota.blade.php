<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>{{ $title }}</title>
    @include('exports.receipt_styles')
</head>
<body>
    @php
        $footer = $settings['receipt_footer'] ?? '';
        $quantity = fn ($value) => rtrim(rtrim(number_format($value, 2, ',', '.'), '0'), ',');
        $currency = fn ($value) => 'Rp ' . $quantity($value);
        $hasItemDiscount = collect($receipt['items'])->contains(fn ($item) => ($item['discount'] ?? 0) > 0);
    @endphp

    @include('exports.receipt_header', ['documentTitle' => $receipt['title'], 'documentNumber' => $receipt['number'], 'documentDate' => $receipt['date'] ?? '-'])

    <table class="info">
        <tr>
            <td>{{ $receipt['party_label'] ?? 'Pihak' }}: <strong>{{ $receipt['party_name'] }}</strong></td>
            <td>Gudang: {{ $receipt['warehouse'] ?? '-' }}</td>
        </tr>
        <tr>
            <td>{{ $receipt['payment_method'] === 'SPLIT' ? 'Cash + Transfer' : $receipt['payment_method'] }} / {{ $receipt['payment_status'] }}</td>
            <td>@if(!empty($receipt['jatuh_tempo']))Jatuh tempo: {{ $receipt['jatuh_tempo'] }}@endif</td>
        </tr>
        @if(!empty($receipt['sales']) && $receipt['sales'] !== '-')<tr><td colspan="2">Sales: {{ $receipt['sales'] }}</td></tr>@endif
    </table>

    <table class="items">
        <thead>
            <tr>
                <th class="center" style="width: 4%;">No</th>
                <th style="width: {{ $hasItemDiscount ? 31 : 41 }}%;">Barang</th>
                <th class="right" style="width: 17%;">Jumlah</th>
                <th class="right" style="width: 19%;">Harga</th>
                @if($hasItemDiscount)<th class="right" style="width: 10%;">Diskon</th>@endif
                <th class="right" style="width: 19%;">Subtotal</th>
            </tr>
        </thead>
        <tbody>
            @foreach($receipt['items'] as $item)
                <tr>
                    <td class="center">{{ $loop->iteration }}</td>
                    <td>
                        <div class="bold">{{ $item['name'] }}</div>
                        <div class="muted">Kode / Barcode: {{ $item['code'] ?? '-' }}</div>
                        @if(!empty($item['variant']))<div class="muted">{{ $item['variant'] }}</div>@endif
                    </td>
                    <td class="right">{{ $quantity($item['qty']) }} {{ $item['unit'] }}</td>
                    <td class="right">{{ $currency($item['price']) }}<div class="muted">/ {{ $item['price_unit'] ?? $item['unit'] }}</div></td>
                    @if($hasItemDiscount)<td class="right">{{ $item['discount'] > 0 ? $currency($item['discount']) : '-' }}</td>@endif
                    <td class="right bold">{{ $currency($item['subtotal']) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <table class="summary">
        <tr>
            <td>
                @if($receipt['total_qty'] > 0)<div class="muted">Total cairan: {{ $quantity($receipt['total_qty']) }} ML</div>@endif
                @if($receipt['total_bottle'] > 0)<div class="muted">Total botol: {{ $quantity($receipt['total_bottle']) }} BOTOL</div>@endif
                @if(!empty($receipt['notes']))
                    <div class="notes">{{ $receipt['notes'] }}</div>
                @endif
            </td>
            <td>
                <table class="totals">
                    @if($receipt['discount'] > 0)
                        <tr><td>Subtotal</td><td class="right">{{ $currency(array_sum(array_column($receipt['items'], 'subtotal'))) }}</td></tr>
                        <tr><td>Diskon</td><td class="right">- {{ $currency($receipt['discount']) }}</td></tr>
                    @endif
                    <tr class="grand"><td>Total</td><td class="right">{{ $currency($receipt['total']) }}</td></tr>
                    <tr><td>Dibayar</td><td class="right">{{ $currency($receipt['amount_paid'] ?? 0) }}</td></tr>
                    @include('exports.receipt_payment_details', ['paymentDetails' => $receipt['payment_details'] ?? null, 'formatMoney' => $currency])
                    <tr class="bold"><td>Sisa Tagihan</td><td class="right">{{ $currency($receipt['remaining'] ?? 0) }}</td></tr>
                </table>
            </td>
        </tr>
    </table>

    <table class="signatures">
        <tr><td>{{ $receipt['party_label'] ?? 'Pihak' }}</td><td>{{ ($receipt['type'] ?? '') === 'pembelian' ? 'Penerima' : 'Kasir' }}</td></tr>
        <tr><td class="signature-line">( ____________________ )</td><td class="signature-line">( ____________________ )</td></tr>
    </table>
    @if($footer)<div class="footer">{{ $footer }}</div>@endif
</body>
</html>
