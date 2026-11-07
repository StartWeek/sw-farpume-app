<?php

namespace App\Models\Business;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransaksiBotolKosong extends Model
{
    protected $table = 'tt_botol_kosong';

    protected $guarded = [];

    protected $casts = [
        'tanggal' => 'date',
        'qty_botol' => 'decimal:2',
        'stok_awal' => 'decimal:2',
        'stok_akhir' => 'decimal:2',
    ];

    public function gudang(): BelongsTo
    {
        return $this->belongsTo(Gudang::class, 'id_gudang');
    }

    public function botol(): BelongsTo
    {
        return $this->belongsTo(BotolKosong::class, 'id_botol_kosong');
    }
}
