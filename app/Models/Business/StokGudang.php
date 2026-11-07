<?php

namespace App\Models\Business;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StokGudang extends Model
{
    protected $table = 'tt_stok_gudang';

    protected $fillable = ['id_gudang', 'id_barang', 'id_botol', 'stok_ml', 'stok_reserved_ml', 'minimum_stok_ml', 'last_update'];

    protected $casts = [
        'stok_ml' => 'decimal:2',
        'stok_reserved_ml' => 'decimal:2',
        'minimum_stok_ml' => 'decimal:2',
        'last_update' => 'datetime',
    ];

    protected $appends = ['stok_botol_isi'];

    public function gudang(): BelongsTo
    {
        return $this->belongsTo(Gudang::class, 'id_gudang');
    }

    public function barang(): BelongsTo
    {
        return $this->belongsTo(BarangBibit::class, 'id_barang');
    }

    public function botolVariant(): BelongsTo
    {
        return $this->belongsTo(Botol::class, 'id_botol');
    }

    public function getStokBotolIsiAttribute(): int
    {
        $capacity = (float) ($this->botolVariant?->varian_ml
            ?? $this->barang?->botol?->varian_ml
            ?? 0);

        return $capacity > 0 ? (int) ceil((float) $this->stok_ml / $capacity) : 0;
    }

}
