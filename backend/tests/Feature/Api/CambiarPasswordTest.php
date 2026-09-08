<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/** HU-02 — Cambio de contraseña. */
class CambiarPasswordTest extends TestCase
{
    use RefreshDatabase;

    private const ACTUAL = 'claveActual123';

    private const NUEVA = 'claveNueva456';

    private function usuario(array $atributos = []): User
    {
        return User::factory()->create(array_merge([
            'estado' => 'ACTIVO',
            'password' => Hash::make(self::ACTUAL),
        ], $atributos));
    }

    /** @return array<string, string> */
    private function autenticar(User $user): array
    {
        $token = $this->postJson('/api/auth/login', [
            'usuario' => $user->usuario,
            'password' => self::ACTUAL,
        ])->json('data.token');

        return ['Authorization' => "Bearer {$token}"];
    }

    public function test_requiere_autenticacion(): void
    {
        $this->patchJson('/api/auth/change-password', [])->assertUnauthorized();
    }

    public function test_los_tres_roles_pueden_cambiar_su_contrasena(): void
    {
        foreach (['ADMINISTRADOR', 'RECEPCIONISTA', 'MEDICO'] as $rol) {
            $user = $this->usuario(['rol' => $rol]);

            $this->patchJson('/api/auth/change-password', [
                'password_actual' => self::ACTUAL,
                'password' => self::NUEVA,
                'password_confirmation' => self::NUEVA,
            ], $this->autenticar($user))
                ->assertOk()
                ->assertJsonPath('success', true);

            $this->assertTrue(Hash::check(self::NUEVA, $user->refresh()->password));
            $this->app['auth']->forgetGuards();
        }
    }

    public function test_rechaza_una_contrasena_actual_incorrecta(): void
    {
        $user = $this->usuario();

        $this->patchJson('/api/auth/change-password', [
            'password_actual' => 'noEsLaCorrecta1',
            'password' => self::NUEVA,
            'password_confirmation' => self::NUEVA,
        ], $this->autenticar($user))->assertStatus(422);

        $this->assertTrue(Hash::check(self::ACTUAL, $user->refresh()->password));
    }

    public function test_exige_la_confirmacion_de_la_nueva_contrasena(): void
    {
        $user = $this->usuario();

        $this->patchJson('/api/auth/change-password', [
            'password_actual' => self::ACTUAL,
            'password' => self::NUEVA,
            'password_confirmation' => 'otraDistinta789',
        ], $this->autenticar($user))->assertStatus(422);
    }

    public function test_la_nueva_contrasena_no_puede_ser_igual_a_la_actual(): void
    {
        $user = $this->usuario();

        $this->patchJson('/api/auth/change-password', [
            'password_actual' => self::ACTUAL,
            'password' => self::ACTUAL,
            'password_confirmation' => self::ACTUAL,
        ], $this->autenticar($user))->assertStatus(422);
    }

    public function test_rechaza_una_contrasena_demasiado_corta(): void
    {
        $user = $this->usuario();

        $this->patchJson('/api/auth/change-password', [
            'password_actual' => self::ACTUAL,
            'password' => 'abc1',
            'password_confirmation' => 'abc1',
        ], $this->autenticar($user))->assertStatus(422);
    }

    public function test_revoca_las_demas_sesiones_y_conserva_la_actual(): void
    {
        $user = $this->usuario();

        $sesionVieja = $this->autenticar($user);
        $this->app['auth']->forgetGuards();
        $sesionActual = $this->autenticar($user);
        $this->app['auth']->forgetGuards();

        $this->patchJson('/api/auth/change-password', [
            'password_actual' => self::ACTUAL,
            'password' => self::NUEVA,
            'password_confirmation' => self::NUEVA,
        ], $sesionActual)->assertOk();

        $this->app['auth']->forgetGuards();
        $this->getJson('/api/auth/me', $sesionActual)->assertOk();

        $this->app['auth']->forgetGuards();
        $this->getJson('/api/auth/me', $sesionVieja)->assertUnauthorized();
    }

    public function test_editar_un_usuario_no_permite_cambiar_su_contrasena(): void
    {
        $admin = $this->usuario(['rol' => 'ADMINISTRADOR']);
        $objetivo = $this->usuario(['rol' => 'MEDICO']);

        $this->putJson("/api/usuarios/{$objetivo->id}", [
            'nombre_completo' => $objetivo->nombre_completo,
            'usuario' => $objetivo->usuario,
            'cargo' => $objetivo->cargo,
            'rol' => $objetivo->rol,
            'telefono' => $objetivo->telefono,
            'password' => 'inyectada12345',
        ], $this->autenticar($admin))->assertOk();

        $this->assertTrue(Hash::check(self::ACTUAL, $objetivo->refresh()->password));
    }
}
