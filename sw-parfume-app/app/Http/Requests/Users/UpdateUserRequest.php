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
            'role' => ['required', Rule::in(['owner', 'admin', 'manager', 'kepala_toko', 'kasir'])],
            'password' => ['nullable', 'string'],
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
            'role.in' => 'Role tidak valid.',
        ];
    }
}
