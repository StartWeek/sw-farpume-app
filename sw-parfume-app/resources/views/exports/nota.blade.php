<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{ $title }}</title>
    <style>
        @page {
            size: a4;
            margin: 15mm 18mm;
        }
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 10px;
            color: #1a1a1a;
            line-height: 1.5;
            margin: 0;
            padding: 0;
        }

        /* ── Header ── */
        .header {
            border-bottom: 3px solid #1a1a1a;
            padding-bottom: 14px;
            margin-bottom: 18px;
        }
        .header-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
        }
        .company-info h1 {
            margin: 0;
            font-size: 20px;
            font-weight: 900;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            color: #111;
        }
        .company-info p {
            margin: 2px 0 0 0;
            font-size: 9px;
            color: #555;
        }
        .doc-title {
            text-align: right;
        }
        .doc-title h2 {
            margin: 0;
            font-size: 16px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #111;
        }
        .doc-title .doc-number {
            font-size: 11px;
            font-weight: 700;
            color: #333;
            margin-top: 2px;
        }

        /* ── Info Panels ── */
        .info-grid {
            display: flex;
            gap: 24px;
            margin-bottom: 18px;
        }
        .info-box {
            flex: 1;
            border: 1px solid #ddd;
            border-radius: 6px;
            padding: 10px 14px;
        }
        .info-box h3 {
            margin: 0 0 6px 0;
            font-size: 8px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #888;
        }
        .info-box .value {
            font-size: 11px;
            font-weight: 700;
            color: #111;
        }
        .info-box .value-sub {
            font-size: 9px;
            color: #666;
            margin-top: 2px;
        }

        /* ── Table ── */
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
        }
        thead th {
            background: #f5f5f5;
            border-top: 2px solid #1a1a1a;
            border-bottom: 1px solid #ccc;
            padding: 9px 10px;
            font-size: 8px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            color: #444;
            text-align: left;
        }
        thead th.right {
            text-align: right;
        }
        thead th.center {
            text-align: center;
        }
        tbody td {
            padding: 8px 10px;
            border-bottom: 1px solid #eee;
            font-size: 10px;
            color: #222;
            vertical-align: top;
        }
        tbody td.right {
            text-align: right;
            font-weight: 600;
        }
        tbody td.center {
            text-align: center;
        }
        tbody tr:last-child td {
            border-bottom: 1px solid #ccc;
        }

        /* ── Totals ── */
        .totals {
            width: 320px;
            margin-left: auto;
        }
        .totals table {
            width: 100%;
            margin-bottom: 0;
        }
        .totals td {
            padding: 5px 10px;
            font-size: 10px;
            border: none;
        }
        .totals .label {
            color: #666;
            text-align: right;
            font-weight: 500;
        }
        .totals .amount {
            text-align: right;
            font-weight: 700;
            color: #111;
        }
        .totals tr.grand td {
            border-top: 2px solid #1a1a1a;
            font-size: 12px;
            font-weight: 900;
            padding-top: 8px;
            margin-top: 4px;
        }

        /* ── Footer ── */
        .footer {
            margin-top: 30px;
            padding-top: 12px;
            border-top: 1px solid #ddd;
            display: flex;
            justify-content: space-between;
            font-size: 8px;
            color: #999;
        }
        .signature-area {
            margin-top: 40px;
            display: flex;
            justify-content: flex-end;
        }
        .signature-box {
            text-align: center;
            width: 160px;
        }
        .signature-box .line {
            margin-top: 50px;
            border-top: 1px solid #1a1a1a;
            padding-top: 4px;
            font-size: 9px;
            font-weight: 600;
        }

        /* ── Status Badge ── */
        .badge {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 4px;
            font-size: 8px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .badge-lunas {
            background: #d4edda;
            color: #155724;
        }
        .badge-belum {
            background: #fff3cd;
            color: #856404;
        }

        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .text-bold { font-weight: 700; }
    </style>
</head>
<body>

    @php
        $storeName = $settings['store_name'] ?? 'PARIS PARFUM';
        $storeAddress = $settings['store_address'] ?? '';
        $storePhone = $settings['store_phone'] ?? '';
        $footer = $settings['receipt_footer'] ?? 'Terima kasih atas kerjasama Anda.';
        $isLunas = ($receipt['payment_status'] ?? '') === 'LUNAS';
    @endphp

    {{-- ── HEADER ── --}}
    <div class="header">
        <div class="header-top">
            <div class="company-info">
                <h1>{{ $storeName }}</h1>
                @if($storeAddress)<p>{{ $storeAddress }}</p>@endif
                @if($storePhone)<p>Telp: {{ $storePhone }}</p>@endif
            </div>
            <div class="doc-title">
                <h2>INVOICE PEMBELIAN</h2>
                <div class="doc-number">{{ $receipt['number'] }}</div>
            </div>
        </div>
    </div>

    {{-- ── INFO PANELS ── --}}
    <div class="info-grid">
        <div class="info-box">
            <h3>Supplier</h3>
            <div class="value">{{ strtoupper($receipt['party_name']) }}</div>
        </div>
        <div class="info-box">
            <h3>Gudang</h3>
            <div class="value">{{ strtoupper($receipt['warehouse'] ?? '-') }}</div>
        </div>
        <div class="info-box">
            <h3>Tanggal</h3>
            <div class="value">{{ $receipt['date'] ?? '-' }}</div>
        </div>
        <div class="info-box">
            <h3>Status Pembayaran</h3>
            <div class="value">
                <span class="badge {{ $isLunas ? 'badge-lunas' : 'badge-belum' }}">
                    {{ $receipt['payment_status'] ?? '-' }}
                </span>
            </div>
            <div class="value-sub">Metode: {{ $receipt['payment_method'] }}</div>
        </div>
    </div>

    {{-- ── ITEMS TABLE ── --}}
    <table>
        <thead>
            <tr>
                <th style="width:30px;" class="center">No</th>
                <th>Nama Barang</th>
                <th style="width:90px;" class="center">Qty</th>
                <th style="width:60px;" class="center">Satuan</th>
                <th style="width:110px;" class="right">Harga / ML</th>
                <th style="width:60px;" class="center">Disc</th>
                <th style="width:120px;" class="right">Subtotal</th>
            </tr>
        </thead>
        <tbody>
            @php $no = 1; @endphp
            @foreach($receipt['items'] as $item)
            <tr>
                <td class="center">{{ $no++ }}</td>
                <td>
                    <div class="text-bold">{{ strtoupper($item['name']) }}</div>
                    @if(!empty($item['variant']))
                        <div style="font-size:8px;color:#888;">Botol: {{ strtoupper($item['variant']) }}</div>
                    @endif
                </td>
                <td class="center">{{ number_format($item['qty'], 0, ',', '.') }}</td>
                <td class="center">{{ $item['unit'] }}</td>
                <td class="right">Rp {{ number_format($item['price'], 0, ',', '.') }}</td>
                <td class="center">{{ $item['discount'] > 0 ? 'Rp ' . number_format($item['discount'], 0, ',', '.') : '-' }}</td>
                <td class="right">Rp {{ number_format($item['subtotal'], 0, ',', '.') }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    {{-- ── TOTALS ── --}}
    <div class="totals">
        <table>
            <tr>
                <td class="label">Total Qty</td>
                <td class="amount">{{ number_format($receipt['total_qty'], 0, ',', '.') }} ML</td>
            </tr>
            @if($receipt['total_bottle'] > 0)
            <tr>
                <td class="label">Total Botol</td>
                <td class="amount">{{ number_format($receipt['total_bottle'], 0, ',', '.') }} BOTOL</td>
            </tr>
            @endif
            @if($receipt['discount'] > 0)
            <tr>
                <td class="label">Subtotal</td>
                <td class="amount">Rp {{ number_format($receipt['total'] + $receipt['discount'], 0, ',', '.') }}</td>
            </tr>
            <tr>
                <td class="label">Diskon</td>
                <td class="amount" style="color:#c0392b;">- Rp {{ number_format($receipt['discount'], 0, ',', '.') }}</td>
            </tr>
            @endif
            <tr class="grand">
                <td class="label">GRAND TOTAL</td>
                <td class="amount">Rp {{ number_format($receipt['total'], 0, ',', '.') }}</td>
            </tr>
        </table>
    </div>

    {{-- ── SIGNATURE ── --}}
    <div class="signature-area">
        <div class="signature-box">
            <div class="line">Penerima</div>
        </div>
    </div>

    {{-- ── FOOTER ── --}}
    <div class="footer">
        <div>Dicetak: {{ \Carbon\Carbon::now()->format('d-m-Y H:i') }}</div>
        <div>{{ $footer }}</div>
    </div>

</body>
</html>
