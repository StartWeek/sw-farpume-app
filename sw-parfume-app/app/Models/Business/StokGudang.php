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

    protected $appends = ['stok_botol_isi', 'sisa_botol_ml'];

    public function gudang(): BelongsTo
    {
        return $this->belongsTo(Gudang::class, 'id_gudang');
    }

    public function barang(): BelongsTo
    {
        return $this->belongsTo(BarangBibit::class, 'id_barang');
    }

    public function getStokBotolIsiAttribute(): int
    {
        $capacity = (float) ($this->barang?->botol?->varian_ml ?? 0);

        return $capacity > 0 ? (int) ceil((float) $this->stok_ml / $capacity) : 0;
    }

    public function getSisaBotolMlAttribute(): float
    {
        $stock = (float) $this->stok_ml;
        $capacity = (float) ($this->barang?->botol?->varian_ml ?? 0);
        if ($stock <= 0 || $capacity <= 0) {
            return 0;
        }

        $remainder = fmod($stock, $capacity);

        return $remainder > 0 ? $remainder : $capacity;
    }
}
