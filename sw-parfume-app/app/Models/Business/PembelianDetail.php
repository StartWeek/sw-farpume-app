<?php

namespace App\Models\Business;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PembelianDetail extends Model
{
    protected $table = 'tt_pembelian_detail';

    protected $fillable = [
        'id_pembelian',
        'tipe_item',
        'item_id',
        'nama_item',
        'id_barang',
        'qty_input',
        'satuan_input',
        'qty_ml',
        'konversi_qty_dasar',
        'satuan_dasar',
        'harga',
        'harga_beli_per_ml',
        'subtotal',
    ];

    public function barang(): BelongsTo
    {
        return $this->belongsTo(BarangBibit::class, 'id_barang');
    }

    public function botol(): BelongsTo
    {
        return $this->belongsTo(Botol::class, 'item_id');
    }
}
