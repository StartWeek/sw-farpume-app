<?php

namespace App\Models\Business;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MutasiStok extends Model
{
    protected $table = 'tt_mutasi_stok';

    protected $fillable = ['tanggal', 'tipe_mutasi', 'sumber_transaksi', 'no_transaksi', 'id_gudang', 'id_barang', 'qty_ml', 'stok_sebelum_ml', 'stok_sesudah_ml', 'keterangan', 'created_by'];

    protected $casts = ['tanggal' => 'date', 'qty_ml' => 'decimal:2', 'stok_sebelum_ml' => 'decimal:2', 'stok_sesudah_ml' => 'decimal:2'];

    public function gudang(): BelongsTo
    {
        return $this->belongsTo(Gudang::class, 'id_gudang');
    }

    public function barang(): BelongsTo
    {
        return $this->belongsTo(BarangBibit::class, 'id_barang');
    }
}
