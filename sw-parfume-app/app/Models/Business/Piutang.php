<?php

namespace App\Models\Business;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Piutang extends Model
{
    protected $table = 'tt_piutang';

    protected $fillable = ['no_piutang', 'tanggal', 'id_customer', 'id_penjualan', 'total_piutang', 'total_bayar', 'sisa_piutang', 'status_piutang', 'jatuh_tempo'];

    protected $casts = ['tanggal' => 'date', 'jatuh_tempo' => 'date'];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'id_customer');
    }

    public function penjualan(): BelongsTo
    {
        return $this->belongsTo(Penjualan::class, 'id_penjualan');
    }
}
