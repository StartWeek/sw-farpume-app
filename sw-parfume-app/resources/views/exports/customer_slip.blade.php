<!DOCTYPE html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Slip Customer</title>
<style>
@page { size: 80mm 297mm; margin: 4mm; }
* { box-sizing: border-box; } body { margin: 0; color: #111; background: #f1f5f9; font: 12px/1.45 Arial, sans-serif; }
.slip { width: 72mm; margin: 20px auto; padding: 10px; background: white; overflow-wrap: anywhere; }
h1 { font-size: 17px; margin: 0 0 4px; } h2 { font-size: 14px; margin: 8px 0; text-transform: uppercase; } p { margin: 3px 0; }
.center { text-align: center; } .muted { font-size: 11px; } .rule { border-top: 1px dashed #111; margin: 10px 0; }
.line { display: flex; justify-content: space-between; gap: 8px; break-inside: avoid; } .line span { min-width: 0; } .line span:last-child { text-align: right; max-width: 60%; }
.item { margin: 9px 0; break-inside: avoid; } .total { font-size: 14px; font-weight: bold; } .notes { white-space: pre-wrap; }
.controls { width: 72mm; margin: 15px auto; } button { width: 100%; padding: 12px; cursor: pointer; font-weight: bold; }
@media print { body { background: white; } .slip { margin: 0; padding: 0; } .controls { display: none; } }
</style></head><body>
@php
$n = fn($v) => preg_replace('/,00$/', '', number_format((float) $v, 2, ',', '.'));
$rp = fn($v) => 'Rp '.$n($v);
if (isset($validation)) {
    $s = $validation->snapshot;
    $d = data_get($validation->result, 'details', []);
    $total = (float) ($s['amount'] ?? 0);
    $paid = $d['jumlah_bayar'] ?? match ($s['payment_method'] ?? '') {
        'CASH', 'TRANSFER', 'SPLIT' => $total,
        'DP' => min($total, max(0, (float) ($s['down_payment'] ?? 0))),
        default => 0,
    };
    $receipt = [
        'title' => $s['label'], 'number' => data_get($validation->result, 'number') ?: $validation->number,
        'date' => $validation->operational_date->format('d-m-Y'), 'party_name' => $s['party'] ?? '-',
        'sales' => $s['sales'] ?? null, 'warehouse' => $s['warehouse'] ?? null,
        'items' => $s['items'] ?? [], 'total' => $total, 'discount' => $s['discount'] ?? 0,
        'amount_paid' => $paid,
        'payment_details' => $d['payment_details'] ?? $s['payment_details'] ?? null,
        'remaining' => $validation->type === 'bayar-piutang'
            ? ($d['sisa_piutang'] ?? (isset($s['remaining_before'])
                ? max(0, (float) $s['remaining_before'] - ($validation->status === 'REJECTED' ? 0 : $total)) : null))
            : max(0, $total - $paid),
        'payment_method' => $s['payment_method'] ?? null, 'jatuh_tempo' => $s['due_date'] ?? null,
        'notes' => $s['notes'] ?? null, 'source_number' => $s['reference'] ?? null,
    ];
    $approved = $validation->status === 'APPROVED';
    $status = ['PENDING' => 'MENUNGGU VALIDASI', 'APPROVED' => 'DISETUJUI', 'REJECTED' => 'DITOLAK'][$validation->status];
} else {
    $approved = true;
    $status = $receipt['payment_status'] ?? $receipt['status'] ?? '';
}
@endphp
@if(!request()->boolean('preview'))
<div class="controls"><button type="button" onclick="window.print()">Cetak Slip</button><p class="muted">Gunakan printer thermal 80 mm pada dialog cetak browser.</p></div>
@endif
<main class="slip">
<header class="center"><h1>{{ $settings['store_name'] ?? 'PARIS PARFUM' }}</h1>@if(!empty($settings['store_address']))<p class="muted">{{ $settings['store_address'] }}</p>@endif @if(!empty($settings['store_phone']))<p class="muted">{{ $settings['store_phone'] }}</p>@endif<h2>{{ $receipt['title'] ?? 'Penjualan' }}</h2><p><strong>{{ $receipt['number'] }}</strong></p><p>{{ $receipt['date'] }}</p>@if($status)<p><strong>{{ $status }}</strong></p>@endif</header>
@if(!$approved)<p class="center muted">{{ $validation->status === 'REJECTED' ? 'Tidak diproses.' : 'Belum diproses.' }}</p>@endif
<div class="rule"></div><p>Customer: <strong>{{ $receipt['party_name'] ?? '-' }}</strong></p>
@if(!empty($receipt['sales']) && $receipt['sales'] !== '-')<p>Sales: {{ $receipt['sales'] }}</p>@endif
@if(!empty($receipt['source_number']) && $receipt['source_number'] !== '-')<p>Referensi: {{ $receipt['source_number'] }}</p>@endif
@if(!empty($receipt['items']))<div class="rule"></div>@endif
@foreach($receipt['items'] ?? [] as $item)
<div class="item"><strong>{{ $item['name'] }}</strong><p class="muted">Kode / Barcode: {{ $item['code'] ?? '-' }}</p>@if(!empty($item['variant']))<p class="muted">{{ $item['variant'] }}</p>@endif<div class="line"><span>{{ $n($item['qty']) }} {{ $item['unit'] }}</span>@if(isset($item['subtotal']))<span>{{ $rp($item['subtotal']) }}</span>@endif</div>@if(isset($item['price']))<p class="muted">{{ $rp($item['price']) }} / {{ $item['price_unit'] ?? $item['unit'] }}</p>@endif</div>
@endforeach
<div class="rule"></div>
@if(($receipt['discount'] ?? 0) > 0)<div class="line"><span>Diskon</span><span>{{ $rp($receipt['discount']) }}</span></div>@endif
<div class="line total"><span>{{ isset($validation) && $validation->type === 'bayar-piutang' ? 'Pembayaran' : (($receipt['type'] ?? '') === 'piutang' ? 'Total tagihan' : 'Total') }}</span><span>{{ $rp($receipt['total']) }}</span></div>
@if(!isset($validation) || $validation->type !== 'bayar-piutang')<div class="line"><span>{{ ($receipt['type'] ?? '') === 'piutang' ? 'Total dibayar' : ($approved ? 'Dibayar' : 'Rencana bayar') }}</span><span>{{ $rp($receipt['amount_paid'] ?? $receipt['paid'] ?? 0) }}</span></div>@endif
<div class="line"><span>{{ isset($validation) && $validation->type === 'bayar-piutang' && $validation->status === 'PENDING' ? 'Rencana sisa tagihan' : 'Sisa tagihan' }}</span><span>{{ isset($receipt['remaining']) ? $rp($receipt['remaining']) : '-' }}</span></div>
@include('exports.receipt_payment_details', ['paymentDetails' => $receipt['payment_details'] ?? null, 'formatMoney' => $rp, 'thermal' => true])
@if(!empty($receipt['payment_method']))<p>Metode: {{ $receipt['payment_method'] === 'SPLIT' ? 'Cash + Transfer' : $receipt['payment_method'] }}</p>@endif
@if(!empty($receipt['jatuh_tempo']))<p>Jatuh tempo: {{ $receipt['jatuh_tempo'] }}</p>@endif
@if(!empty($receipt['notes']))<div class="rule"></div><p class="notes">{{ $receipt['notes'] }}</p>@endif
@if(isset($validation) && $validation->rejection_reason)<div class="rule"></div><p class="notes">Alasan ditolak: {{ $validation->rejection_reason }}</p>@endif
@if(!empty($settings['receipt_footer']))<div class="rule"></div><p class="center muted">{{ $settings['receipt_footer'] }}</p>@endif
</main>
</body></html>
