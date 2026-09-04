<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * HU-01 — Inicio de sesión.
 * Cubre RF-01, RF-03, RB-01, RB-32 y RNF-06.
 */
class AuthTest extends TestCase
{
    use RefreshDatabase;

    private function crearUsuario(array $atributos = []): User
    {
        return User::factory()->create(array_merge([
            'usuario' => 'admin@policlinica.com',
            'rol' => 'ADMINISTRADOR',
            'estado' => 'ACTIVO',
            'password' => Hash::make('secreto123'),
        ], $atributos));
    }

    /** RB-32: el mensaje no debe distinguir usuario inexistente de contraseña incorrecta. */
    public function test_usuario_inexistente_y_password_incorrecta_dan_el_mismo_mensaje(): void
    {
        $this->crearUsuario();

        $inexistente = $this->postJson('/api/auth/login', [
            'usuario' => 'nadie@policlinica.com',
            'password' => 'secreto123',
        ])->assertStatus(401);

        $passwordMala = $this->postJson('/api/auth/login', [
            'usuario' => 'admin@policlinica.com',
            'password' => 'incorrecta',
        ])->assertStatus(401);

        $this->assertSame(
            $inexistente->json('message'),
            $passwordMala->json('message'),
        );
    }

    /** RB-01: solo usuarios activos pueden iniciar sesión. */
    public function test_usuario_inactivo_no_puede_iniciar_sesion(): void
    {
        $this->crearUsuario(['estado' => 'INACTIVO']);

        $this->postJson('/api/auth/login', [
            'usuario' => 'admin@policlinica.com',
            'password' => 'secreto123',
        ])->assertStatus(403)
            ->assertJsonPath('success', false);
    }

    public function test_campos_faltantes_devuelven_error_de_validacion(): void
    {
        $this->postJson('/api/auth/login', [])->assertStatus(422);
    }

    /** RNF-06: el hash jamás debe viajar al cliente. */
    public function test_la_respuesta_nunca_incluye_el_hash_de_password(): void
    {
        $this->crearUsuario();

        $respuesta = $this->postJson('/api/auth/login', [
            'usuario' => 'admin@policlinica.com',
            'password' => 'secreto123',
        ])->assertOk();

        $this->assertStringNotContainsString('password', $respuesta->getContent());
    }

    /** RF-03: la respuesta trae el rol que el frontend usa para enrutar. */
    public function test_la_respuesta_incluye_el_rol_para_enrutar(): void
    {
        $this->crearUsuario(['rol' => 'MEDICO']);

        $this->postJson('/api/auth/login', [
            'usuario' => 'admin@policlinica.com',
            'password' => 'secreto123',
        ])->assertOk()
            ->assertJsonPath('data.usuario.rol', 'MEDICO');
    }

    public function test_me_requiere_autenticacion_y_logout_revoca_el_token(): void
    {
        $this->crearUsuario();

        $token = $this->postJson('/api/auth/login', [
            'usuario' => 'admin@policlinica.com',
            'password' => 'secreto123',
        ])->json('data.token');

        $cabecera = ['Authorization' => "Bearer {$token}"];

        $this->getJson('/api/auth/me', $cabecera)->assertOk();
        $this->postJson('/api/auth/logout', [], $cabecera)->assertOk();

        // El guard cachea el usuario ya resuelto dentro del mismo test;
        // sin esto la siguiente petición no revalidaría el token revocado.
        $this->app['auth']->forgetGuards();

        $this->getJson('/api/auth/me', $cabecera)->assertUnauthorized();
    }

    /** El login previo ya no debe cerrar las demás sesiones del usuario. */
    public function test_iniciar_sesion_no_revoca_los_tokens_anteriores(): void
    {
        $this->crearUsuario();

        $primero = $this->postJson('/api/auth/login', [
            'usuario' => 'admin@policlinica.com',
            'password' => 'secreto123',
        ])->json('data.token');

        $this->postJson('/api/auth/login', [
            'usuario' => 'admin@policlinica.com',
            'password' => 'secreto123',
        ])->assertOk();

        $this->getJson('/api/auth/me', ['Authorization' => "Bearer {$primero}"])->assertOk();
    }
}
