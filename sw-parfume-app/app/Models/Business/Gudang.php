<?php

namespace App\Models\Business;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Gudang extends Model
{
    protected $table = 'tm_gudang';

    protected $fillable = ['kode_gudang', 'nama_gudang', 'alamat', 'status'];

    public function stok(): HasMany
    {
        return $this->hasMany(StokGudang::class, 'id_gudang');
    }
}
