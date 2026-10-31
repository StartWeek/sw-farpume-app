<!DOCTYPE html>
@php
    $documentTitle = $validation->type === 'hancur-stock' ? 'Hancur Stock' : $validation->snapshot['label'];
@endphp
<html lang="id"><head><meta charset="utf-8"><title>{{ $documentTitle }} {{ $validation->number }}</title>
@include('exports.receipt_styles')
</head><body>
@php
$s = $validation->snapshot;
$d = data_get($validation->result, 'details', []);
$approved = $validation->status === 'APPROVED';
$trade = $validation->type === 'pembelian' || str_starts_with($validation->type, 'penjualan-');
$hasAmount = isset($s['amount']);
$partyLabel = $validation->type === 'pembelian' || str_contains($validation->type, 'supplier') || $validation->type === 'bayar-hutang'
    ? 'Supplier' : (str_starts_with($validation->type, 'penjualan-') || $validation->type === 'bayar-piutang' ? 'Customer' : 'Pihak');
$reference = data_get($validation->result, 'number') ?: ($s['reference'] ?? null);
$hasBaseConversion = collect($s['items'] ?? [])->contains(fn ($item) => ($item['base_unit'] ?? $item['unit']) !== $item['unit']);
$n = fn($v) => preg_replace('/,00$/', '', number_format((float)$v, 2, ',', '.'));
$rp = fn($v) => 'Rp '.$n($v);
$status = ['PENDING' => 'Menunggu Validasi', 'APPROVED' => 'Disetujui', 'REJECTED' => 'Ditolak'][$validation->status] ?? $validation->status;
$total = (float) ($s['amount'] ?? 0);
$paid = $d['jumlah_bayar'] ?? match ($s['payment_method'] ?? '') {
    'CASH', 'TRANSFER', 'SPLIT' => $total,
    'DP' => min($total, max(0, (float) ($s['down_payment'] ?? 0))),
    default => 0,
};
$date = fn($v) => $v ? \Illuminate\Support\Carbon::parse($v)->format('d-m-Y') : '-';
@endphp
@include('exports.receipt_header', ['documentTitle' => $documentTitle, 'documentNumber' => $validation->number, 'documentDate' => $date($validation->operational_date)])
<div class="status"><strong>{{ $status }}</strong>@if(!$approved)<span class="muted"> - {{ $validation->status === 'REJECTED' ? 'Tidak diproses.' : 'Belum diproses.' }}</span>@endif</div>
<table class="info">
    @if(!empty($s['party']) && $s['party'] !== '-')<tr><td colspan="2">{{ $partyLabel }}: <strong>{{ $s['party'] }}</strong></td></tr>@endif
    @if(!empty($s['warehouse']) || !empty($s['sales']))
        <tr><td>@if(!empty($s['warehouse']))Gudang: {{ $s['warehouse'] }}@endif</td><td>@if(!empty($s['sales']))Sales: {{ $s['sales'] }}@endif</td></tr>
    @endif
    @if($reference)<tr><td colspan="2">Referensi: {{ $reference }}</td></tr>@endif
    @if(!empty($s['payment_method']) || !empty($s['direction']) || !empty($s['due_date']))
        <tr><td>@if(!empty($s['payment_method']))Metode: {{ $s['payment_method'] === 'SPLIT' ? 'Cash + Transfer' : $s['payment_method'] }}@elseif(!empty($s['direction']))Arah: {{ $s['direction'] }}@endif</td><td>@if(!empty($s['due_date']))Jatuh tempo: {{ $date($s['due_date']) }}@endif</td></tr>
    @endif
</table>
@if(!empty($s['items']))
<table class="items"><thead><tr><th style="width:5%">No</th><th style="width:{{ $trade ? '34' : ($hasBaseConversion ? '55' : '75') }}%">Barang</th><th style="width:20%" class="right">Jumlah</th>@if($trade)<th style="width:21%" class="right">Harga</th><th style="width:20%" class="right">Subtotal</th>@elseif($hasBaseConversion)<th style="width:20%" class="right">Setara</th>@endif</tr></thead><tbody>
@foreach($s['items'] as $item)<tr><td>{{ $loop->iteration }}</td><td class="bold">{{ $item['name'] }}<div class="muted">Kode / Barcode: {{ $item['code'] ?? '-' }}</div>@if(!empty($item['variant']))<div class="muted">{{ $item['variant'] }}</div>@endif</td><td class="right">{{ $n($item['qty']) }} {{ $item['unit'] }}@if($trade && ($item['base_unit'] ?? $item['unit']) !== $item['unit'])<div class="muted">{{ $n($item['base_qty']) }} {{ $item['base_unit'] }}</div>@endif</td>@if($trade)<td class="right">{{ $rp($item['price'] ?? 0) }}<div class="muted">/ {{ $item['price_unit'] ?? $item['unit'] }}</div></td><td class="right bold">{{ $rp($item['subtotal'] ?? 0) }}</td>@elseif($hasBaseConversion)<td class="right">{{ $n($item['base_qty'] ?? $item['qty']) }} {{ $item['base_unit'] ?? $item['unit'] }}</td>@endif</tr>@endforeach
</tbody></table>
@endif
@if($hasAmount)<table class="summary"><tr><td></td><td><table class="totals">
@if($trade && ($s['discount'] ?? 0) > 0)<tr><td>Subtotal</td><td class="right">{{ $rp(collect($s['items'])->sum('subtotal')) }}</td></tr><tr><td>Diskon</td><td class="right">- {{ $rp($s['discount']) }}</td></tr>@endif
<tr class="grand"><td>{{ $trade ? 'Total' : 'Nominal' }}</td><td class="right">{{ $rp($total) }}</td></tr>
@if($trade)<tr><td>{{ $approved ? 'Dibayar saat transaksi' : 'Rencana pembayaran' }}</td><td class="right">{{ $rp($paid) }}</td></tr><tr><td>Sisa tagihan</td><td class="right">{{ $rp(max(0, $total - $paid)) }}</td></tr>@endif
@if($trade)@include('exports.receipt_payment_details', ['paymentDetails' => $d['payment_details'] ?? $s['payment_details'] ?? null, 'formatMoney' => $rp])@endif
@if(isset($d['sisa_hutang']) || isset($d['sisa_piutang']))<tr><td>Sisa setelah transaksi</td><td class="right">{{ $rp($d['sisa_hutang'] ?? $d['sisa_piutang']) }}</td></tr>@endif
@if(isset($d['saldo_akhir']))<tr><td>Saldo kas setelah transaksi</td><td class="right">{{ $rp($d['saldo_akhir']) }}</td></tr>@endif
</table></td></tr></table>@endif
@if(!empty($s['notes']))<div class="notes"><strong>Keterangan</strong><br>{{ $s['notes'] }}</div>@endif
@if($validation->rejection_reason)<div class="notes"><strong>Alasan penolakan</strong><br>{{ $validation->rejection_reason }}</div>@endif
<table class="actors"><tr><td>Pengaju: <strong>{{ $validation->submitted_by_name }}</strong></td><td>@if($validation->reviewed_by_name)Pemeriksa: <strong>{{ $validation->reviewed_by_name }}</strong>@endif</td></tr></table>
@if(!empty($settings['receipt_footer']))<div class="footer">{{ $settings['receipt_footer'] }}</div>@endif
</body></html>
