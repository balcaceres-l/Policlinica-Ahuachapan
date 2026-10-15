<?php

namespace App\Services;

use Illuminate\Http\Client\Pool;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Cliente mínimo de la API de la CIE de la OMS (https://icd.who.int/icdapi).
 * Autenticación OAuth2 por credenciales de cliente; el token dura una hora y
 * se renueva solo cuando la API responde 401.
 */
class ClienteIcdOms
{
    private ?string $token = null;

    public function __construct(
        private readonly string $clientId,
        private readonly string $clientSecret,
        private readonly string $tokenUrl,
        private readonly string $apiUrl,
    ) {}

    public static function desdeConfiguracion(): self
    {
        $config = config('services.oms_icd');

        if (empty($config['client_id']) || empty($config['client_secret'])) {
            throw new RuntimeException(
                'Faltan ICD_CLIENT_ID e ICD_CLIENT_SECRET en el .env. Se obtienen en https://icd.who.int/icdapi ("View API access key").',
            );
        }

        return new self($config['client_id'], $config['client_secret'], $config['token_url'], rtrim($config['api_url'], '/'));
    }

    public function urlRelease(string $release): string
    {
        return "{$this->apiUrl}/icd/release/10/{$release}";
    }

    /** Entidad por su URI. La API devuelve los hijos con `http://`; se piden por HTTPS. */
    public function entidad(string $uri): array
    {
        return $this->obtenerVarias([$uri])[$uri];
    }

    /**
     * Pide varias entidades en paralelo.
     *
     * @param  list<string>  $uris
     * @return array<string, array>
     */
    public function obtenerVarias(array $uris): array
    {
        $respuestas = $this->enviar($uris);

        if (collect($respuestas)->contains(fn ($r) => $r instanceof Response && $r->status() === 401)) {
            $this->token = null;
            $respuestas = $this->enviar($uris);
        }

        $resultado = [];
        foreach ($uris as $uri) {
            $respuesta = $respuestas[$uri] ?? null;
            if (! $respuesta instanceof Response || ! $respuesta->successful()) {
                $estado = $respuesta instanceof Response ? $respuesta->status() : 'sin respuesta';
                throw new RuntimeException("La API de la OMS no respondió bien para {$uri} ({$estado}).");
            }
            $resultado[$uri] = $respuesta->json();
        }

        return $resultado;
    }

    /** @param list<string> $uris */
    private function enviar(array $uris): array
    {
        $token = $this->token();

        return Http::pool(fn (Pool $pool) => array_map(
            fn (string $uri) => $pool->as($uri)
                ->withToken($token)
                ->withHeaders(['Accept' => 'application/json', 'Accept-Language' => 'en', 'API-Version' => 'v2'])
                ->timeout(60)
                ->retry(3, 2000, throw: false)
                ->get($this->aHttps($uri)),
            $uris,
        ));
    }

    private function token(): string
    {
        if ($this->token !== null) {
            return $this->token;
        }

        $respuesta = Http::asForm()->timeout(60)->post($this->tokenUrl, [
            'client_id' => $this->clientId,
            'client_secret' => $this->clientSecret,
            'scope' => 'icdapi_access',
            'grant_type' => 'client_credentials',
        ]);

        if (! $respuesta->successful() || ! $respuesta->json('access_token')) {
            throw new RuntimeException('La OMS rechazó las credenciales de la API (revisa ICD_CLIENT_ID e ICD_CLIENT_SECRET).');
        }

        return $this->token = $respuesta->json('access_token');
    }

    private function aHttps(string $uri): string
    {
        return preg_replace('#^http://#', 'https://', $uri);
    }
}
