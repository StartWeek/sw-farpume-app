<?php

namespace App\Models\Business;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Hutang extends Model
{
    protected $table = 'tt_hutang';

    protected $fillable = ['no_hutang', 'tanggal', 'id_supplier', 'id_pembelian', 'total_hutang', 'total_bayar', 'sisa_hutang', 'status_hutang', 'jatuh_tempo', 'keterangan', 'created_by'];

    protected $casts = ['tanggal' => 'date', 'jatuh_tempo' => 'date', 'total_hutang' => 'decimal:2', 'total_bayar' => 'decimal:2', 'sisa_hutang' => 'decimal:2'];

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class, 'id_supplier');
    }

    public function pembelian(): BelongsTo
    {
        return $this->belongsTo(Pembelian::class, 'id_pembelian');
    }
}
