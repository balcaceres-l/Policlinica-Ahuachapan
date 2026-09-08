<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class CambiarPasswordRequest extends FormRequest
{
    /**
     * La política de complejidad se define en AppServiceProvider::boot().
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'password_actual' => ['required', 'string'],
            'password' => [
                'required',
                'string',
                'confirmed',
                'different:password_actual',
                Password::defaults(),
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'password_actual.required' => 'Ingresa tu contraseña actual.',
            'password.required' => 'Ingresa la nueva contraseña.',
            'password.confirmed' => 'La confirmación no coincide con la nueva contraseña.',
            'password.different' => 'La nueva contraseña debe ser distinta de la actual.',
        ];
    }
}
