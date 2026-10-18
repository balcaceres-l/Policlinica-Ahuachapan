<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\ClienteIcdOms;
use App\Services\PaseProxyIcd;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\RateLimiter;
use RuntimeException;

/**
 * HU-44 — proxy entre la herramienta de búsqueda de la OMS (ECT) y la API de la
 * CIE-11. El navegador se autentica con un pase propio de corta duración
 * (PaseProxyIcd); el token de la OMS lo agrega el backend y nunca sale de aquí.
 */
class Cie11ProxyController extends Controller
{
    use RespondsWithJson;

    public function __construct(
        private readonly ClienteIcdOms $oms,
        private readonly PaseProxyIcd $pases,
    ) {}

    public function reenviar(Request $request, string $ruta): Response|JsonResponse
    {
        // Textos de la interfaz de la herramienta (ej. codingtool/es.json): la ECT los
        // pide sin pase. Son públicos, se sirven desde caché y con límite por IP.
        if (preg_match('#^languageresources/[a-z]+/[a-z]{2}(-[a-zA-Z]{2})?\.json$#', $ruta)) {
            return $this->textosDeInterfaz($request, $ruta);
        }

        $usuario = $this->usuarioDelPase($request);
        if (! $usuario) {
            return $this->failure('Pase de búsqueda inválido o vencido.', 401);
        }

        $clave = "proxy-cie11:{$usuario->id}";
        $limite = max(1, (int) config('services.oms_icd.limite_por_minuto'));
        if (RateLimiter::tooManyAttempts($clave, $limite)) {
            return $this->failure('Demasiadas búsquedas seguidas. Espera unos segundos.', 429);
        }
        RateLimiter::hit($clave, 60);

        // La ECT intenta mandar a la OMS lo buscado y lo elegido: no se reenvía.
        if (str_starts_with($ruta, 'analytics/')) {
            return response()->noContent();
        }

        if (str_contains($ruta, '..') || ! preg_match('#^icd/(release/11/|entity)#', $ruta)) {
            return $this->failure('Ruta no permitida.', 404);
        }

        try {
            $respuesta = $this->oms->reenviar(
                $request->method(),
                $ruta,
                $request->query(),
                $request->isMethod('POST') ? $request->post() : [],
                'es',
                $request->header('API-Version', 'v2'),
            );
        } catch (ConnectionException) {
            return $this->failure('No se pudo conectar con la OMS. Puedes escribir el diagnóstico como texto libre.', 502);
        } catch (RuntimeException $e) {
            report($e);

            return $this->failure('El buscador de la OMS no está disponible. Puedes escribir el diagnóstico como texto libre.', 503);
        }

        return response($respuesta->body(), $respuesta->status())
            ->header('Content-Type', $respuesta->header('Content-Type') ?: 'application/json');
    }

    private function textosDeInterfaz(Request $request, string $ruta): Response|JsonResponse
    {
        if (! $request->isMethod('GET')) {
            return $this->failure('Ruta no permitida.', 404);
        }

        $clave = 'proxy-cie11-textos:'.$request->ip();
        if (RateLimiter::tooManyAttempts($clave, 30)) {
            return $this->failure('Demasiadas peticiones.', 429);
        }
        RateLimiter::hit($clave, 60);

        try {
            $cuerpo = Cache::remember('cie11_textos:'.$ruta, now()->addDay(), function () use ($ruta) {
                $respuesta = $this->oms->reenviar('GET', $ruta, [], [], 'es', 'v2');

                return $respuesta->successful() ? $respuesta->body() : throw new RuntimeException("La OMS no devolvió {$ruta}.");
            });
        } catch (ConnectionException|RuntimeException $e) {
            report($e);

            return $this->failure('El buscador de la OMS no está disponible.', 503);
        }

        return response($cuerpo, 200)->header('Content-Type', 'application/json');
    }

    private function usuarioDelPase(Request $request): ?User
    {
        $id = $this->pases->validar($request->bearerToken());
        $usuario = $id ? User::find($id) : null;

        return $usuario && $usuario->estado === 'ACTIVO' && $usuario->rol === 'MEDICO' ? $usuario : null;
    }
}
