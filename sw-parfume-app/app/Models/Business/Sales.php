<?php

namespace App\Models\Business;

use Illuminate\Database\Eloquent\Model;

class Sales extends Model
{
    protected $table = 'tm_sales';

    protected $fillable = ['kode_sales', 'nama_sales', 'no_hp', 'alamat', 'status'];
}
