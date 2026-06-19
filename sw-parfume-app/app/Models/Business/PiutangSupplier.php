<?php

namespace App\Models\Business;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PiutangSupplier extends Model
{
    protected $table = 'tt_piutang_supplier';

    protected $fillable = [
        'no_piutang_supplier',
        'tanggal',
        'id_supplier',
        'total_piutang',
        'total_bayar',
        'sisa_piutang',
        'status_piutang',
        'jatuh_tempo',
        'keterangan',
        'created_by',
    ];

    protected $casts = [
        'tanggal' => 'date',
        'jatuh_tempo' => 'date',
        'total_piutang' => 'decimal:2',
        'total_bayar' => 'decimal:2',
        'sisa_piutang' => 'decimal:2',
    ];

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class, 'id_supplier');
    }
}
