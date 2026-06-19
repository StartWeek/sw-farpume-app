<?php

namespace App\Models\Business;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Wangi extends Model
{
    protected $table = 'tm_wangi';

    protected $fillable = ['kode_wangi', 'nama_wangi', 'kategori_aroma', 'status'];

    public function barangBibit(): HasMany
    {
        return $this->hasMany(BarangBibit::class, 'id_wangi');
    }
}
