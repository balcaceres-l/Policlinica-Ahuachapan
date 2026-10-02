<?php

namespace App\Casts;

use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

/**
 * Cast para cifrar datos sensibles en reposo (AES-256) de forma segura.
 * Al leer, si un registro previo estaba en texto plano (sin cifrar),
 * lo retorna directamente sin lanzar DecryptException.
 * Al guardar o actualizar, siempre lo almacena cifrado.
 */
class SafeEncrypted implements CastsAttributes
{
    public function get(Model $model, string $key, mixed $value, array $attributes): mixed
    {
        if ($value === null || $value === '') {
            return $value;
        }

        try {
            return Crypt::decryptString($value);
        } catch (DecryptException) {
            // El valor en la base de datos no está cifrado aún (registro previo/seed)
            return $value;
        }
    }

    public function set(Model $model, string $key, mixed $value, array $attributes): mixed
    {
        if ($value === null || $value === '') {
            return $value;
        }

        // Si ya está cifrado con nuestra clave, no re-cifrar
        try {
            Crypt::decryptString((string) $value);
            return $value;
        } catch (DecryptException) {
            return Crypt::encryptString((string) $value);
        }
    }
}
