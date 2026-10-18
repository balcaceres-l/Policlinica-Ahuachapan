<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Controllers\Controller;
use App\Services\ClienteIcdOms;
use App\Services\PaseProxyIcd;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use RuntimeException;

/** HU-44 — CIE-11 de la OMS: pase para el buscador, configuración y jerarquía. */
class Cie11Controller extends Controller
{
    use RespondsWithJson;

    public function __construct(private readonly ClienteIcdOms $oms) {}

    /**
     * Pase de corta duración para que la herramienta de búsqueda use el proxy.
     * No es el token de la OMS: ese se queda en el servidor.
     */
    public function pase(Request $request, PaseProxyIcd $pases): JsonResponse
    {
        return $this->success($pases->emitir($request->user()));
    }

    /**
     * Versión de la CIE-11 con la que trabaja el buscador. Se fija para que cada
     * diagnóstico guardado sepa de qué versión salió.
     */
    public function configuracion(): JsonResponse
    {
        try {
            $release = Cache::remember('cie11_release_vigente', now()->addDay(), function () {
                $mms = $this->oms->entidad($this->oms->apiUrl().'/icd/release/11/mms');
                preg_match('#/release/11/([^/]+)/mms#', (string) ($mms['latestRelease'] ?? ''), $m);

                return $m[1] ?? throw new RuntimeException('La OMS no indicó la versión vigente de la CIE-11.');
            });
        } catch (ConnectionException|RuntimeException $e) {
            report($e);

            return $this->failure('No se pudo consultar la versión vigente de la CIE-11 en la OMS.', 503);
        }

        return $this->success(['release' => $release, 'idioma' => 'es', 'linearizacion' => 'mms']);
    }

    /**
     * Bloque y capítulo de una categoría guardada, consultados en español a la OMS
     * con la URI de linearización. El resultado se guarda en caché: la jerarquía de
     * una versión publicada no cambia.
     */
    public function jerarquia(Request $request): JsonResponse
    {
        $validado = $request->validate([
            'uri' => ['required', 'string', 'max:255', 'regex:#^https?://id\.who\.int/icd/release/11/[^/]+/mms/#'],
        ], [
            'uri.regex' => 'La URI debe ser de la CIE-11 (linearización MMS) de la OMS.',
        ]);

        try {
            $jerarquia = Cache::remember('cie11_jerarquia:'.sha1($validado['uri']), now()->addDays(30), fn () => $this->recorrer($validado['uri']));
        } catch (ConnectionException|RuntimeException $e) {
            report($e);

            return $this->failure('No se pudo consultar la jerarquía en la OMS.', 503);
        }

        return $this->success($jerarquia);
    }

    private function recorrer(string $uri): array
    {
        $categoria = $this->oms->entidad($uri);
        $resultado = ['categoria' => $this->resumen($categoria, $uri), 'bloques' => [], 'capitulo' => null];

        $padre = $categoria['parent'][0] ?? null;
        for ($nivel = 0; $padre && $nivel < 10; $nivel++) {
            $entidad = $this->oms->entidad($padre);
            $tipo = $entidad['classKind'] ?? null;

            if ($tipo === 'block') {
                $resultado['bloques'][] = $this->resumen($entidad, $padre);
            } elseif ($tipo === 'chapter') {
                $resultado['capitulo'] = $this->resumen($entidad, $padre);
                break;
            }

            $padre = $entidad['parent'][0] ?? null;
        }

        // Del capítulo hacia la categoría; `bloque` es el más cercano a la categoría.
        $resultado['bloques'] = array_reverse($resultado['bloques']);
        $resultado['bloque'] = $resultado['bloques'] ? end($resultado['bloques']) : null;

        return $resultado;
    }

    private function resumen(array $entidad, string $uri): array
    {
        return [
            'codigo' => ($entidad['code'] ?? '') !== '' ? $entidad['code'] : null,
            'titulo' => $entidad['title']['@value'] ?? null,
            'tipo' => $entidad['classKind'] ?? null,
            'block_id' => $entidad['blockId'] ?? null,
            'uri' => $entidad['@id'] ?? $uri,
        ];
    }
}
