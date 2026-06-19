<?php

namespace App\Models\Business;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Pembelian extends Model
{
    protected $table = 'tt_pembelian';

    protected $fillable = ['no_pembelian', 'tanggal', 'id_supplier', 'id_gudang', 'total_qty_ml', 'total_qty_botol', 'total_pembelian', 'jumlah_bayar', 'metode_pembayaran', 'status_pembayaran', 'jatuh_tempo', 'keterangan', 'created_by'];

    protected $casts = ['tanggal' => 'date', 'jatuh_tempo' => 'date', 'total_qty_ml' => 'decimal:2', 'total_qty_botol' => 'decimal:2', 'total_pembelian' => 'decimal:2', 'jumlah_bayar' => 'decimal:2'];

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class, 'id_supplier');
    }

    public function gudang(): BelongsTo
    {
        return $this->belongsTo(Gudang::class, 'id_gudang');
    }

    public function details(): HasMany
    {
        return $this->hasMany(PembelianDetail::class, 'id_pembelian');
    }

    public function hutang(): HasOne
    {
        return $this->hasOne(Hutang::class, 'id_pembelian');
    }
}
