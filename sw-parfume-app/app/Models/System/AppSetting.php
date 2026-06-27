<?php

namespace App\Models\System;

use Illuminate\Database\Eloquent\Model;

class AppSetting extends Model
{
    protected $table = 'tp_app_settings';

    protected $fillable = [
        'logo_path',
        'login_logo_path',
        'app_name',
        'primary_color',
        'light_theme',
        'dark_theme',
        'is_dark_mode',
        'store_name',
        'store_address',
        'store_phone',
        'receipt_footer',
        'receipt_template',
        'payment_receipt_template',
    ];

    protected $casts = [
        'is_dark_mode' => 'boolean',
    ];
}
