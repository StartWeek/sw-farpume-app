<style>
    @page { margin: 14mm; }
    .filter-table { table-layout: fixed; font-size: 9px; }
    .filter-table .filter-label { width: 18%; }
    .filter-table .filter-value { width: 32%; }
    .filter-table td { word-wrap: break-word; white-space: normal; }
    .cash-portrait {
        width: 100%; table-layout: fixed; border-collapse: collapse;
        margin-bottom: 16px; font-size: 9px;
    }
    .cash-portrait thead { display: table-header-group; }
    .cash-portrait tfoot { display: table-row-group; }
    .cash-portrait tr { page-break-inside: avoid; }
    .cash-portrait th, .cash-portrait td {
        border: 1px solid #ddd; padding: 6px 4px; vertical-align: top;
        word-wrap: break-word; overflow-wrap: break-word; white-space: normal;
    }
    .cash-portrait th { background: #f1f5f9; text-align: left; font-size: 9px; }
    .cash-portrait .amount { text-align: right; }
    .cash-portrait .detail { margin-top: 4px; }
    .cash-portrait .muted { color: #64748b; }
    .cash-portrait .note { margin-top: 6px; white-space: pre-line; }
    .cash-portrait .totals { background: #e9ecef; font-weight: bold; }
</style>
@php
    $cashMoney = fn ($value) => 'Rp '.preg_replace('/,00$/', '', number_format((float) $value, 2, ',', '.'));
@endphp
<p><strong>Saldo Awal Periode:</strong> {{ $cashMoney($summary['Saldo Awal'] ?? 0) }}</p>
<table class="cash-portrait">
    <thead>
        <tr>
            <th style="width:20%">No Transaksi / Tanggal</th>
            <th style="width:29%">Rincian Transaksi</th>
            <th style="width:17%" class="amount">Kas Masuk</th>
            <th style="width:17%" class="amount">Kas Keluar</th>
            <th style="width:17%" class="amount">Saldo Akhir</th>
        </tr>
    </thead>
    <tbody>
        @forelse($rows as $row)
            <tr>
                <td>
                    <strong>{{ mb_strtoupper(data_get($row, 'no_transaksi') ?: '-') }}</strong>
                    <div class="detail muted">{{ data_get($row, 'tanggal') ? \Carbon\Carbon::parse(data_get($row, 'tanggal'))->format('d-m-y') : '-' }}</div>
                </td>
                <td>
                    <strong>{{ mb_strtoupper(data_get($row, 'jenis_transaksi') ?: '-') }}</strong>
                    <div class="detail">Sumber: {{ mb_strtoupper(data_get($row, 'sumber_transaksi') ?: '-') }}</div>
                    <div class="detail">Pihak: {{ mb_strtoupper(data_get($row, 'pihak') ?: '-') }}</div>
                    @if(data_get($row, 'keterangan'))
                        <div class="note muted">Keterangan: {{ mb_strtoupper(data_get($row, 'keterangan')) }}</div>
                    @endif
                </td>
                <td class="amount">{{ $cashMoney(data_get($row, 'kas_masuk', 0)) }}</td>
                <td class="amount">{{ $cashMoney(data_get($row, 'kas_keluar', 0)) }}</td>
                <td class="amount">{{ $cashMoney(data_get($row, 'saldo_akhir', 0)) }}</td>
            </tr>
        @empty
            <tr><td colspan="5" style="text-align:center; padding:20px">Data tidak tersedia.</td></tr>
        @endforelse
    </tbody>
    @if(!empty($summary))
        <tfoot>
            <tr class="totals">
                <td colspan="2">GRAND TOTAL</td>
                <td class="amount">{{ $cashMoney($summary['Kas Masuk'] ?? 0) }}</td>
                <td class="amount">{{ $cashMoney($summary['Kas Keluar'] ?? 0) }}</td>
                <td class="amount">{{ $cashMoney($summary['Saldo Akhir'] ?? 0) }}</td>
            </tr>
        </tfoot>
    @endif
</table>
