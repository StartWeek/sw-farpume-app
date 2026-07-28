<?php

namespace App\Models\Business;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HistoriSaldoBarang extends Model
{
    protected $table = 'th_saldo_barang';

    protected $guarded = [];

    protected $casts = [
        'tanggal' => 'date',
        'stok_awal_ml' => 'decimal:2',
        'masuk_ml' => 'decimal:2',
        'keluar_ml' => 'decimal:2',
        'stok_akhir_ml' => 'decimal:2',
        'minimum_stok_ml' => 'decimal:2',
        'terakhir_mutasi' => 'date',
        'closed_at' => 'datetime',
    ];

    public function gudang(): BelongsTo
    {
        return $this->belongsTo(Gudang::class, 'id_gudang');
    }

    public function barang(): BelongsTo
    {
        return $this->belongsTo(BarangBibit::class, 'id_barang');
    }

    public function botolVariant(): BelongsTo
    {
        return $this->belongsTo(Botol::class, 'id_botol');
    }
}
