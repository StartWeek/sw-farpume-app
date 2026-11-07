<?php

namespace App\Models\Business;

use Illuminate\Database\Eloquent\Model;

class KasMutasi extends Model
{
    protected $table = 'tt_kas_mutasi';

    protected $fillable = [
        'tanggal',
        'no_transaksi',
        'jenis_transaksi',
        'sumber_transaksi',
        'pihak',
        'kas_masuk',
        'kas_keluar',
        'saldo_akhir',
        'keterangan',
        'created_by',
    ];

    protected $casts = [
        'tanggal' => 'date',
        'kas_masuk' => 'decimal:2',
        'kas_keluar' => 'decimal:2',
        'saldo_akhir' => 'decimal:2',
    ];
}
