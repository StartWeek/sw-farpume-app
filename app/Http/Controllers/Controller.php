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

    protected function uppercase(array $data): array
    {
        return array_map(function ($value) {
            if (is_array($value)) return $this->uppercase($value);
            return is_string($value) ? mb_strtoupper($value) : $value;
        }, $data);
    }
}
