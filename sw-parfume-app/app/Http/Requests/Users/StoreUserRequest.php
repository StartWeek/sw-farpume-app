<?php

namespace App\Http\Requests\Users;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'username' => ['required', 'string', 'max:50', Rule::unique('tm_users', 'username')],
            'name' => ['required', 'string', 'max:100'],
            'role' => ['required', Rule::in(['admin', 'superadmin', 'manager', 'kepala_toko'])],
            'password' => ['required', 'string'],
        ];
    }
}
