<?php

namespace App\Models\Business;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BarangBibit extends Model
{
    protected $table = 'tm_barang_bibit';

    protected $fillable = [
        'kode_barang',
        'id_brand',
        'id_botol',
        'nama_barang',
        'jenis_barang',
        'harga_beli_per_ml',
        'harga_jual_retail_per_ml',
        'harga_jual_grosir_per_ml',
        'minimum_stok_ml',
        'satuan_dasar',
        'status',
    ];

    protected $casts = [
        'harga_beli_per_ml' => 'decimal:2',
        'harga_jual_retail_per_ml' => 'decimal:2',
        'harga_jual_grosir_per_ml' => 'decimal:2',
        'minimum_stok_ml' => 'decimal:2',
    ];

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class, 'id_brand');
    }

    public function botol(): BelongsTo
    {
        return $this->belongsTo(Botol::class, 'id_botol');
    }

    public function stok(): HasMany
    {
        return $this->hasMany(StokGudang::class, 'id_barang');
    }
}
