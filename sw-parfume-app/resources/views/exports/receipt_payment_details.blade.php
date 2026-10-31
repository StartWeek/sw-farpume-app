@if($paymentDetails)
    @foreach(['cash_received' => 'Cash diterima', 'transfer' => 'Transfer', 'change' => 'Kembalian'] as $key => $label)
        @if(($paymentDetails[$key] ?? 0) > 0)
            @if($thermal ?? false)
                <div class="line"><span>{{ $label }}</span><span>{{ $formatMoney($paymentDetails[$key]) }}</span></div>
            @else
                <tr><td>{{ $label }}</td><td class="right">{{ $formatMoney($paymentDetails[$key]) }}</td></tr>
            @endif
        @endif
    @endforeach
@endif
