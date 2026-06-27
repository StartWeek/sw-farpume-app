<?php

namespace App\Models\Business;

use Illuminate\Database\Eloquent\Model;

class TokoClosing extends Model
{
    protected $table = 'tt_toko_closing';

    protected $fillable = [
        'tanggal_tutup',
        'saldo_awal',
        'saldo_akhir',
        'total_penjualan',
        'total_pembelian',
        'keterangan',
        'created_by',
    ];

    protected $casts = [
        'tanggal_tutup' => 'date',
        'saldo_awal' => 'decimal:2',
        'saldo_akhir' => 'decimal:2',
        'total_penjualan' => 'decimal:2',
        'total_pembelian' => 'decimal:2',
    ];
}
