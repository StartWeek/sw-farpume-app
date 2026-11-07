<?php

namespace App\Models\Business;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Customer extends Model
{
    protected $table = 'tm_customer';

    protected $fillable = ['kode_customer', 'nama_customer', 'tipe_customer', 'no_hp', 'alamat', 'limit_piutang', 'status'];

    protected $casts = ['limit_piutang' => 'decimal:2'];

    public function penjualan(): HasMany
    {
        return $this->hasMany(Penjualan::class, 'id_customer');
    }
}
