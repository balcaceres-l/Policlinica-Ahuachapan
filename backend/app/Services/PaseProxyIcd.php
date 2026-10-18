<?php

namespace App\Services;

use App\Models\User;

/**
 * Pase de corta duración para que el navegador use el proxy de la CIE-11.
 *
 * La herramienta de la OMS lee el vencimiento del token como JWT (campo `exp`),
 * así que el pase es un JWT HS256 firmado con una clave derivada de APP_KEY.
 * Solo sirve contra nuestro proxy: no abre la API de la OMS ni el resto del sistema.
 */
class PaseProxyIcd
{
    private const AUDIENCIA = 'proxy-cie11';

    public function emitir(User $usuario): array
    {
        $vence = now()->addMinutes(max(1, (int) config('services.oms_icd.minutos_pase_proxy')))->getTimestamp();

        $cabecera = $this->base64(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
        $contenido = $this->base64(json_encode([
            'sub' => $usuario->id,
            'aud' => self::AUDIENCIA,
            'iat' => now()->getTimestamp(),
            'exp' => $vence,
        ]));

        return [
            'token' => "{$cabecera}.{$contenido}.".$this->firmar("{$cabecera}.{$contenido}"),
            'vence' => $vence,
        ];
    }

    /** Devuelve el id del usuario si el pase es auténtico y vigente; si no, null. */
    public function validar(?string $pase): ?string
    {
        $partes = explode('.', (string) $pase);
        if (count($partes) !== 3) {
            return null;
        }

        [$cabecera, $contenido, $firma] = $partes;
        if (! hash_equals($this->firmar("{$cabecera}.{$contenido}"), $firma)) {
            return null;
        }

        $datos = json_decode($this->desdeBase64($contenido), true);
        if (! is_array($datos) || ($datos['aud'] ?? null) !== self::AUDIENCIA || ($datos['exp'] ?? 0) <= now()->getTimestamp()) {
            return null;
        }

        return is_string($datos['sub'] ?? null) ? $datos['sub'] : null;
    }

    private function firmar(string $datos): string
    {
        $clave = hash_hmac('sha256', self::AUDIENCIA, (string) config('app.key'), true);

        return $this->base64(hash_hmac('sha256', $datos, $clave, true));
    }

    private function base64(string $datos): string
    {
        return rtrim(strtr(base64_encode($datos), '+/', '-_'), '=');
    }

    private function desdeBase64(string $datos): string
    {
        return (string) base64_decode(strtr($datos, '-_', '+/'), true);
    }
}
