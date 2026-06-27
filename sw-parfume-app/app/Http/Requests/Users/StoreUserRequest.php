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
            'role' => ['required', Rule::in(['owner', 'admin', 'manager', 'kepala_toko', 'kasir'])],
            'password' => ['required', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'required' => 'Kolom ini wajib diisi.',
            'username.required' => 'Username belum diisi.',
            'username.unique' => 'Username sudah digunakan.',
            'username.max' => 'Username maksimal :max karakter.',
            'name.required' => 'Nama belum diisi.',
            'name.max' => 'Nama maksimal :max karakter.',
            'role.required' => 'Role belum dipilih.',
            'role.in' => 'Role yang dipilih tidak valid.',
            'password.required' => 'Password belum diisi.',
        ];
    }
}
