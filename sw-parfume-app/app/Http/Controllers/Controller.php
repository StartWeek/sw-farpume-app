<?php

namespace App\Http\Controllers;

use App\Services\EncryptService;

class Controller
{
    protected EncryptService $encrypt;

    public function __construct()
    {
        $this->encrypt = new EncryptService();
    }
}