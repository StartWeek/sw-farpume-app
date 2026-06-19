<?php

namespace App\Models\Business;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StokGudang extends Model
{
    protected $table = 'tt_stok_gudang';

    protected $fillable = ['id_gudang', 'id_barang', 'stok_ml', 'stok_reserved_ml', 'minimum_stok_ml', 'last_update'];

    protected $casts = [
        'stok_ml' => 'decimal:2',
        'stok_reserved_ml' => 'decimal:2',
        'minimum_stok_ml' => 'decimal:2',
        'last_update' => 'datetime',
    ];

    public function gudang(): BelongsTo
    {
        return $this->belongsTo(Gudang::class, 'id_gudang');
    }

    public function barang(): BelongsTo
    {
        return $this->belongsTo(BarangBibit::class, 'id_barang');
    }
}
