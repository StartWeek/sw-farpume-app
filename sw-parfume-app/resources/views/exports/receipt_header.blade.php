<table class="header">
    <tr>
        <td style="width: 50%;">
            <div class="store-name">{{ $settings['store_name'] ?? 'PARIS PARFUM' }}</div>
            @if(!empty($settings['store_address']))<div class="muted">{{ $settings['store_address'] }}</div>@endif
            @if(!empty($settings['store_phone']))<div class="muted">{{ $settings['store_phone'] }}</div>@endif
        </td>
        <td class="right">
            <h1 class="document-title">{{ $documentTitle }}</h1>
            <div class="bold">{{ $documentNumber }}</div>
            <div>{{ $documentDate }}</div>
        </td>
    </tr>
</table>
