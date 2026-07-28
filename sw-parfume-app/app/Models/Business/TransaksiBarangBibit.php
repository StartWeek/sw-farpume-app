<?php

namespace App\Models\Business;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransaksiBarangBibit extends Model
{
    protected $table = 'tt_barang_bibit';

    protected $guarded = [];

    protected $casts = [
        'tanggal' => 'date',
        'qty_ml' => 'decimal:2',
        'stok_awal_ml' => 'decimal:2',
        'stok_akhir_ml' => 'decimal:2',
    ];

    public function gudang(): BelongsTo
    {
        return $this->belongsTo(Gudang::class, 'id_gudang');
    }

    public function barang(): BelongsTo
    {
        return $this->belongsTo(BarangBibit::class, 'id_barang');
    }

    public function botol(): BelongsTo
    {
        return $this->belongsTo(Botol::class, 'id_botol');
    }
}
