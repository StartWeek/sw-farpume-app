<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{ $title }}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            color: #333;
        }
        h2 {
            text-align: center;
            margin-bottom: 20px;
            font-size: 18px;
        }
        .filters {
            margin-bottom: 20px;
            font-size: 11px;
            color: #555;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #f4f4f4;
            font-weight: bold;
        }
        .text-right {
            text-align: right;
        }
    </style>
</head>
<body>

    <h2>{{ $title }}</h2>

    @if(count($filters) > 0)
    <div class="filters">
        <strong>Filter Aktif:</strong>
        <ul>
            @foreach($filters as $key => $value)
                @if(!empty($value))
                    <li>{{ ucwords(str_replace('_', ' ', $key)) }}: {{ $value }}</li>
                @endif
            @endforeach
        </ul>
    </div>
    @endif

    <table>
        <thead>
            <tr>
                @foreach($columns as $col)
                    <th>{{ $col['label'] }}</th>
                @endforeach
            </tr>
        </thead>
        <tbody>
            @forelse($rows as $row)
                <tr>
                    @foreach($columns as $col)
                        <td>
                            @php
                                $val = null;
                                if (isset($col['format']) && is_callable($col['format'])) {
                                    $val = $col['format']($row);
                                } elseif (isset($col['key'])) {
                                    $val = data_get($row, $col['key']);
                                }
                            @endphp
                            {{ $val ?? '-' }}
                        </td>
                    @endforeach
                </tr>
            @empty
                <tr>
                    <td colspan="{{ count($columns) }}" style="text-align: center;">Data tidak tersedia.</td>
                </tr>
            @endforelse
        </tbody>
    </table>

</body>
</html>
