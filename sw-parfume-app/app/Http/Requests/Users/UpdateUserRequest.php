<?php

namespace App\Http\Requests\Users;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $userId = $this->route('user')?->id;

        return [
            'username' => ['required', 'string', 'max:50', Rule::unique('tm_users', 'username')->ignore($userId)],
            'name' => ['required', 'string', 'max:100'],
            'role' => ['required', Rule::in(['admin', 'superadmin', 'manager', 'kepala_toko'])],
            'password' => ['nullable', 'string'],
        ];
    }
}
