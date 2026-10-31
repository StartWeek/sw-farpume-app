<style>
    @page { margin: 14mm; }
    .validation-portrait { width: 100%; table-layout: fixed; border-collapse: collapse; font-size: 10px; }
    .validation-portrait thead { display: table-header-group; }
    .validation-portrait tbody, .validation-portrait tr { page-break-inside: avoid; }
    .validation-portrait th, .validation-portrait td {
        border: 1px solid #ddd; padding: 7px 4px; vertical-align: top;
        word-wrap: break-word; overflow-wrap: break-word; white-space: normal;
    }
    .validation-portrait th { background: #f1f5f9; font-size: 9px; text-align: left; }
    .validation-portrait .muted { margin-top: 3px; color: #64748b; font-size: 9px; }
    .validation-portrait .reviewer { margin-top: 8px; }
    .validation-portrait .rejection { padding: 8px; background: #f8fafc; white-space: pre-line; }
</style>
@php
    $statusLabels = ['PENDING' => 'Menunggu', 'APPROVED' => 'Disetujui', 'REJECTED' => 'Ditolak'];
    $quantity = fn ($value) => preg_replace('/,00$/', '', number_format((float) $value, 2, ',', '.'));
    $reviewTime = fn ($value) => $value?->timezone('Asia/Jakarta')->format('d-m-Y H:i') ?? '-';
@endphp
<table class="validation-portrait">
    <thead>
        <tr>
            <th style="width:15%">No Validasi /<br>Tgl Operasional</th>
            <th style="width:25%">Transaksi / Pihak / Gudang</th>
            <th style="width:15%">Nilai / Jumlah</th>
            <th style="width:12%">Status</th>
            <th style="width:20%">Pengaju / Pemeriksa</th>
            <th style="width:13%">No Transaksi</th>
        </tr>
    </thead>
    @forelse($rows as $row)
        <tbody>
            <tr>
                <td><strong>{{ $row->number }}</strong><div class="muted">{{ $row->operational_date->format('d-m-Y') }}</div></td>
                <td><strong>{{ data_get($row, 'snapshot.label', '-') }}</strong><div class="muted">Pihak: {{ data_get($row, 'snapshot.party', '-') }}</div><div class="muted">Gudang: {{ data_get($row, 'snapshot.warehouse') ?: '-' }}</div>
                    @foreach(data_get($row, 'snapshot.items', []) as $item)
                        <div class="muted">[{{ $item['code'] ?? '-' }}] {{ $item['name'] }}</div>
                    @endforeach
                </td>
                <td>
                    @if(data_get($row, 'snapshot.amount') !== null)
                        Rp {{ $quantity(data_get($row, 'snapshot.amount')) }}
                    @else
                        @forelse(data_get($row, 'snapshot.items', []) as $item)
                            <div>{{ $item['name'] }}: {{ $quantity($item['qty']) }} {{ $item['unit'] }}</div>
                        @empty
                            -
                        @endforelse
                    @endif
                </td>
                <td>{{ $statusLabels[$row->status] ?? $row->status }}</td>
                <td><strong>Pengaju</strong><div>{{ $row->submitted_by_name }}</div><div class="muted">{{ $reviewTime($row->created_at) }} WIB</div><div class="reviewer"><strong>Pemeriksa</strong></div><div>{{ $row->reviewed_by_name ?? '-' }}</div><div class="muted">{{ $row->reviewed_at ? $reviewTime($row->reviewed_at).' WIB' : '-' }}</div></td>
                <td>{{ data_get($row, 'result.number') ?: '-' }}</td>
            </tr>
            @if($row->rejection_reason)
                <tr><td colspan="6" class="rejection"><strong>Alasan penolakan {{ $row->number }}:</strong> {{ $row->rejection_reason }}</td></tr>
            @endif
        </tbody>
    @empty
        <tbody><tr><td colspan="6" style="text-align:center; padding:20px">Data tidak tersedia.</td></tr></tbody>
    @endforelse
</table>
