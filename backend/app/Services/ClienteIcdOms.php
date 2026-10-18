<?php

namespace App\Services;

use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Cliente de la API de la OMS (https://icd.who.int/icdapi). El token OAuth2 se
 * pide con las credenciales del servidor, se guarda en caché mientras es válido
 * y nunca sale del backend. En el servidor de pruebas (`api_secured = false`) no
 * se usa token.
 */
class ClienteIcdOms
{
    private const CLAVE_CACHE_TOKEN = 'oms_icd_token';

    /** Margen para no usar un token a segundos de vencer. */
    private const MARGEN_SEGUNDOS = 120;

    public function apiUrl(): string
    {
        return rtrim((string) config('services.oms_icd.api_url'), '/');
    }

    /**
     * Reenvía una petición a la API de la OMS con el token del servidor.
     *
     * @param  array<string, mixed>  $query
     * @param  array<string, mixed>  $formulario
     */
    public function reenviar(string $metodo, string $ruta, array $query, array $formulario, string $idioma, string $versionApi): Response
    {
        $url = $this->apiUrl().'/'.ltrim($ruta, '/');

        $enviar = fn () => $metodo === 'POST'
            ? $this->peticion($idioma, $versionApi)->asForm()->post($url.($query ? '?'.http_build_query($query) : ''), $formulario)
            : $this->peticion($idioma, $versionApi)->get($url, $query);

        $respuesta = $enviar();

        // Token revocado o vencido antes de tiempo: se pide otro una sola vez.
        if ($respuesta->status() === 401 && $this->usaToken()) {
            Cache::forget(self::CLAVE_CACHE_TOKEN);
            $respuesta = $enviar();
        }

        return $respuesta;
    }

    /** Entidad de la CIE-11 por su URI, en el idioma pedido. */
    public function entidad(string $uri, string $idioma = 'es'): array
    {
        $ruta = parse_url($uri, PHP_URL_PATH);
        $respuesta = $this->reenviar('GET', (string) $ruta, [], [], $idioma, 'v2');

        if (! $respuesta->successful()) {
            throw new RuntimeException("La OMS no devolvió la entidad {$uri} ({$respuesta->status()}).");
        }

        return $respuesta->json();
    }

    private function peticion(string $idioma, string $versionApi)
    {
        $peticion = Http::withHeaders([
            'Accept' => 'application/json',
            'Accept-Language' => $idioma,
            'API-Version' => $versionApi,
        ])->timeout(20);

        return $this->usaToken() ? $peticion->withToken($this->token()) : $peticion;
    }

    private function usaToken(): bool
    {
        return (bool) config('services.oms_icd.api_secured');
    }

    private function token(): string
    {
        $guardado = Cache::get(self::CLAVE_CACHE_TOKEN);
        if (is_string($guardado) && $guardado !== '') {
            return $guardado;
        }

        $config = config('services.oms_icd');
        if (empty($config['client_id']) || empty($config['client_secret'])) {
            throw new RuntimeException('Faltan ICD_CLIENT_ID e ICD_CLIENT_SECRET en el .env del backend.');
        }

        $respuesta = Http::asForm()->timeout(20)->post($config['token_url'], [
            'client_id' => $config['client_id'],
            'client_secret' => $config['client_secret'],
            'scope' => 'icdapi_access',
            'grant_type' => 'client_credentials',
        ]);

        $token = $respuesta->json('access_token');
        if (! $respuesta->successful() || ! is_string($token)) {
            throw new RuntimeException('La OMS rechazó las credenciales de la API.');
        }

        $segundos = max(60, (int) $respuesta->json('expires_in', 3600) - self::MARGEN_SEGUNDOS);
        Cache::put(self::CLAVE_CACHE_TOKEN, $token, $segundos);

        return $token;
    }
}
