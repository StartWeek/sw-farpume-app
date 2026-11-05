@php
    $pdfLayoutKind = isset($validation)
        ? ($validation->type === 'pembelian' ? 'purchase' : 'payment')
        : (($receipt['type'] ?? '') === 'pembelian' ? 'purchase' : 'payment');
    $pdfLayout = $settings['receipt_pdf_layout'][$pdfLayoutKind] ?? [];
@endphp
<style>
    @page { size: a4 portrait; margin: 14mm; }
    body { margin: 0; font-family: DejaVu Sans, sans-serif; font-size: 10px; line-height: 1.4; color: #111; }
    h1, h2, p { margin: 0; }
    table { width: 100%; border-collapse: collapse; }
    td, th { vertical-align: top; word-wrap: break-word; overflow-wrap: break-word; }
    .header { border-bottom: 2px solid #111; margin-bottom: 12px; table-layout: fixed; }
    .header td { padding-bottom: 10px; }
    .store-name { font-size: 17px; font-weight: bold; }
    .document-title { font-size: 14px; font-weight: bold; text-transform: uppercase; }
    .muted { color: #444; font-size: 9px; }
    .right { text-align: right; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .info { table-layout: fixed; margin-bottom: 12px; }
    .info td { width: 50%; padding: 3px 8px 3px 0; }
    .items { table-layout: fixed; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
    .items th { text-align: left; border-top: 1px solid #111; border-bottom: 1px solid #111; padding: 6px 4px; font-size: 9px; }
    .items td { padding: 7px 4px; border-bottom: 1px solid #ccc; }
    .items .right { text-align: right; }
    .items .center { text-align: center; }
    .summary { margin-top: 12px; page-break-inside: avoid; table-layout: fixed; }
    .summary > tbody > tr > td { width: 50%; }
    .totals td { padding: 3px 4px; }
    .totals .grand td { border-top: 1px solid #111; border-bottom: 1px solid #111; padding: 6px 4px; font-size: 12px; font-weight: bold; }
    .notes { margin-top: 10px; white-space: pre-line; word-wrap: break-word; overflow-wrap: break-word; }
    .signatures { margin-top: 20px; page-break-inside: avoid; table-layout: fixed; }
    .signatures td { width: 50%; text-align: center; }
    .signature-line { padding-top: 32px; }
    .actors { margin-top: 18px; table-layout: fixed; page-break-inside: avoid; }
    .actors td { width: 50%; }
    .status { margin-bottom: 10px; }
    .footer { margin-top: 14px; padding-top: 6px; border-top: 1px solid #ccc; font-size: 9px; page-break-inside: avoid; }
    @foreach(['header' => 0, 'info' => 0, 'items' => 0, 'summary' => 3.175, 'signatures' => 5.292, 'actors' => 4.763, 'footer' => 3.704] as $block => $baseMargin)
        @php
            $offsetX = max(-10, min(10, (float) ($pdfLayout[$block]['x'] ?? 0)));
            $offsetY = max(0, min(40, (float) ($pdfLayout[$block]['y'] ?? 0)));
        @endphp
        body > .{{ $block }} { margin-left: {{ $offsetX }}mm; margin-top: {{ $baseMargin + $offsetY }}mm; width: {{ 182 - abs($offsetX) }}mm; }
    @endforeach
    @if($preview ?? false)
        @media screen {
            html { background: #e2e8f0; }
            body { box-sizing: border-box; width: 210mm; min-height: 297mm; padding: 14mm; background: white; }
        }
    @endif
</style>
