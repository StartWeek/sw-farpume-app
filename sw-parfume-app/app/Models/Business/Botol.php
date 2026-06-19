<?php

namespace App\Models\Business;

use Illuminate\Database\Eloquent\Model;

class Botol extends Model
{
    protected $table = 'tm_botol';

    protected $fillable = [
        'kode_botol',
        'varian_ml',
        'nama_botol',
        'isi_per_dus',
        'harga_beli_per_botol',
        'harga_jual_per_botol',
        'harga_jual_per_dus',
        'stock_botol',
        'status',
    ];

    protected $casts = [
        'varian_ml' => 'integer',
        'isi_per_dus' => 'integer',
        'harga_beli_per_botol' => 'decimal:2',
        'harga_jual_per_botol' => 'decimal:2',
        'harga_jual_per_dus' => 'decimal:2',
        'stock_botol' => 'decimal:2',
    ];
}
