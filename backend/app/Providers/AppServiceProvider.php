<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // uncompromised() consulta HaveIBeenPwned en internet, por eso solo en producción.
        // La política de complejidad (10 caracteres, mayúsculas, minúsculas, números y símbolos)
        // se aplica tanto en desarrollo como en producción para evitar discrepancias.
        Password::defaults(fn () => Password::min(10)
            ->letters()
            ->mixedCase()
            ->numbers()
            ->symbols()
            ->when(app()->isProduction(), fn ($rule) => $rule->uncompromised()));

        Model::preventLazyLoading(! app()->isProduction());
        Model::preventSilentlyDiscardingAttributes(! app()->isProduction());

        if (app()->isProduction()) {
            URL::forceScheme('https');
        }

        // Se limita por usuario e IP a la vez para que varios intentos desde
        // una red compartida no bloqueen al resto de la policlínica.
        RateLimiter::for('login', fn (Request $request) => [
            Limit::perMinute(5)->by($request->input('usuario').'|'.$request->ip()),
            Limit::perMinute(20)->by($request->ip()),
        ]);

        RateLimiter::for('api', fn (Request $request) => Limit::perMinute(120)
            ->by($request->user()?->id ?: $request->ip()));
    }
}
