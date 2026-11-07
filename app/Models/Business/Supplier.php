<?php

namespace App\Models\Business;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Supplier extends Model
{
    protected $table = 'tm_supplier';

    protected $fillable = ['kode_supplier', 'nama_supplier', 'tipe_gudang', 'id_gudang', 'pic_name', 'no_hp', 'alamat', 'keterangan', 'status'];

    public function gudang(): BelongsTo
    {
        return $this->belongsTo(Gudang::class, 'id_gudang');
    }

    public function pembelian(): HasMany
    {
        return $this->hasMany(Pembelian::class, 'id_supplier');
    }
}
