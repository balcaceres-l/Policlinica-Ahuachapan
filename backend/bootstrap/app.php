<?php

use App\Http\Middleware\EnsureUserHasRole;
use App\Http\Middleware\ForceJsonResponse;
use App\Http\Middleware\SecurityHeaders;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'role' => EnsureUserHasRole::class,
        ]);

        $middleware->api(prepend: [
            ForceJsonResponse::class,
            SecurityHeaders::class,
        ]);

        // En cPanel el proxy corre en la misma máquina; no se confía en otros.
        $middleware->trustProxies(at: ['127.0.0.1', '::1']);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson()
        );

        $exceptions->render(function (Throwable $e, Request $request) {
            if (! $request->is('api/*') && ! $request->expectsJson()) {
                return null;
            }

            [$status, $message] = match (true) {
                $e instanceof ValidationException => [422, 'Los datos enviados no son válidos.'],
                $e instanceof AuthenticationException => [401, 'No has iniciado sesión.'],
                $e instanceof AuthorizationException => [403, 'No tienes permisos para realizar esta acción.'],
                $e instanceof ModelNotFoundException,
                $e instanceof NotFoundHttpException => [404, 'El recurso solicitado no existe.'],
                $e instanceof TooManyRequestsHttpException => [429, 'Demasiados intentos. Espera un momento.'],
                $e instanceof HttpExceptionInterface => [$e->getStatusCode(), $e->getMessage()],
                default => [500, 'Ocurrió un error inesperado.'],
            };

            return response()->json([
                'success' => false,
                'message' => $message,
                'errors' => $e instanceof ValidationException ? $e->errors() : null,
                // Con APP_DEBUG=false en producción esto siempre viaja como null.
                'debug' => config('app.debug') && $status === 500
                    ? ['exception' => $e::class, 'mensaje' => $e->getMessage()]
                    : null,
            ], $status);
        });
    })->create();
