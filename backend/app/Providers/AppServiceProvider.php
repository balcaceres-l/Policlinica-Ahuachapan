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
        //Minimo razonable utilizado para la contraseña
        Password::defaults(fn() => $this->app->isProduction()
            ? Password::min(10)->letters()->mixedCase()->numbers()->symbols()->uncompromised()
            : Password::min(8)->letters()->numbers());


        Model::preventLazyLoading(! $this->app->isProduction());
        Model::preventSilentlyDiscardingAttributes(! $this->app->isProduction());

        // HTTPS obligatorio
        if ($this->app->isProduction()) {
            URL::forceScheme('https');
        }


        RateLimiter::for('login', fn(Request $request) => [
            Limit::perMinute(5)->by($request->input('usuario') . '|' . $request->ip()),
            Limit::perMinute(20)->by($request->ip()),
        ]);
        RateLimiter::for('api', fn(Request $request) => Limit::perMinute(120)
            ->by($request->user()?->id ?: $request->ip()));
    }
}
