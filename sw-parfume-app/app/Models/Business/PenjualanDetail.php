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
        'id_botol',
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
        'discount',
    ];

    protected $casts = [
        'qty_input' => 'decimal:2',
        'qty_ml' => 'decimal:2',
        'konversi_qty_dasar' => 'decimal:2',
        'harga' => 'decimal:2',
        'harga_beli_per_ml' => 'decimal:2',
        'harga_jual_per_ml' => 'decimal:2',
        'subtotal_modal' => 'decimal:2',
        'subtotal_jual' => 'decimal:2',
        'laba_kotor' => 'decimal:2',
        'discount' => 'decimal:2',
    ];

    public function barang(): BelongsTo
    {
        return $this->belongsTo(BarangBibit::class, 'id_barang');
    }

    public function botol(): BelongsTo
    {
        return $this->belongsTo(Botol::class, 'item_id');
    }

    public function botolKosong(): BelongsTo
    {
        return $this->belongsTo(BotolKosong::class, 'item_id');
    }

    public function botolVariant(): BelongsTo
    {
        return $this->belongsTo(Botol::class, 'id_botol');
    }
}
