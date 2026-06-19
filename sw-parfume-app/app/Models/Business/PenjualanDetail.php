<?php

namespace App\Models\Business;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PenjualanDetail extends Model
{
    protected $table = 'tt_penjualan_detail';

    protected $fillable = [
        'id_penjualan',
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
        'harga_jual_per_ml',
        'subtotal_modal',
        'subtotal_jual',
        'laba_kotor',
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
