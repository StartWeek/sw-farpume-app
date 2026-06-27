<?php

namespace App\Models\Business;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BotolKosong extends Model
{
    protected $table = 'tm_botol_kosong';

    protected $fillable = [
        'kode_botol',
        'id_gudang',
        'nama_botol',
        'kapasitas',
        'harga_beli',
        'harga_jual',
        'stock',
        'satuan',
        'status',
        'keterangan',
    ];

    protected $casts = [
        'kapasitas' => 'integer',
        'harga_beli' => 'decimal:2',
        'harga_jual' => 'decimal:2',
        'stock' => 'decimal:2',
    ];

    public function gudang(): BelongsTo
    {
        return $this->belongsTo(Gudang::class, 'id_gudang');
    }
}
