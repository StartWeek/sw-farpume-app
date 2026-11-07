<?php

namespace App\Models\Business;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Brand extends Model
{
    protected $table = 'tm_brand';

    protected $fillable = ['kode_brand', 'nama_brand', 'negara_asal', 'keterangan', 'status'];

    public function barangBibit(): HasMany
    {
        return $this->hasMany(BarangBibit::class, 'id_brand');
    }
}
