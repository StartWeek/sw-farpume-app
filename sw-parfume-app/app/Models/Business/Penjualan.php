<?php

namespace App\Models\Business;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Penjualan extends Model
{
    protected $table = 'tt_penjualan';

    protected $fillable = ['no_penjualan', 'tanggal', 'id_customer', 'tipe_penjualan', 'id_sales', 'id_gudang', 'total_qty_ml', 'total_qty_botol', 'total_penjualan', 'jumlah_bayar', 'total_modal', 'laba_kotor', 'metode_pembayaran', 'status_pembayaran', 'jatuh_tempo', 'keterangan', 'created_by'];

    protected $casts = ['tanggal' => 'date', 'jatuh_tempo' => 'date', 'total_qty_ml' => 'decimal:2', 'total_qty_botol' => 'decimal:2', 'total_penjualan' => 'decimal:2', 'jumlah_bayar' => 'decimal:2', 'total_modal' => 'decimal:2', 'laba_kotor' => 'decimal:2'];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'id_customer');
    }

    public function sales(): BelongsTo
    {
        return $this->belongsTo(Sales::class, 'id_sales');
    }

    public function gudang(): BelongsTo
    {
        return $this->belongsTo(Gudang::class, 'id_gudang');
    }

    public function details(): HasMany
    {
        return $this->hasMany(PenjualanDetail::class, 'id_penjualan');
    }

    public function piutang(): HasOne
    {
        return $this->hasOne(Piutang::class, 'id_penjualan');
    }
}
