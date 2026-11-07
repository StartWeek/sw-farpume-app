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
        'status',
    ];

    protected $casts = [
        'varian_ml' => 'integer',
        'isi_per_dus' => 'integer',
    ];
}
