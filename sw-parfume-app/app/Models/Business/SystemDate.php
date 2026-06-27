<?php

namespace App\Models\Business;

use Illuminate\Database\Eloquent\Model;

class SystemDate extends Model
{
    protected $table = 'tp_system';

    protected $fillable = ['tanggal_system'];

    protected $casts = ['tanggal_system' => 'date'];
}
