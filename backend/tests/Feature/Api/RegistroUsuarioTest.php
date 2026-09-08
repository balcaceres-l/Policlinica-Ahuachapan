<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** HU-03 — Registro de cuentas de usuario. */
class RegistroUsuarioTest extends TestCase
{
    use RefreshDatabase;

    /** @return array<string, string> */
    private function payload(array $sobrescribir = []): array
    {
        return array_merge([
            'nombre_completo' => 'Dra. Ana Lucía Menjívar',
            'usuario' => 'amenjivar@policlinica.com',
            'cargo' => 'Clínica de Úlceras',
            'rol' => 'MEDICO',
            'telefono' => '2443-1024',
            'password' => 'claveSegura123',
        ], $sobrescribir);
    }

    private function actuarComoAdministrador(): User
    {
        $admin = User::factory()->create(['rol' => 'ADMINISTRADOR', 'estado' => 'ACTIVO']);
        Sanctum::actingAs($admin);

        return $admin;
    }

    public function test_administrador_puede_registrar_una_cuenta_con_rol(): void
    {
        $this->actuarComoAdministrador();

        $this->postJson('/api/usuarios', $this->payload())
            ->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.nombreCompleto', 'Dra. Ana Lucía Menjívar')
            ->assertJsonPath('data.usuario', 'amenjivar@policlinica.com')
            ->assertJsonPath('data.rol', 'MEDICO');

        $this->assertDatabaseHas('users', [
            'usuario' => 'amenjivar@policlinica.com',
            'rol' => 'MEDICO',
        ]);
    }

    public function test_la_cuenta_nueva_queda_activa_por_defecto(): void
    {
        $this->actuarComoAdministrador();

        $this->postJson('/api/usuarios', $this->payload())
            ->assertCreated()
            ->assertJsonPath('data.estado', 'ACTIVO');
    }

    public function test_no_permite_registrar_un_usuario_duplicado(): void
    {
        $this->actuarComoAdministrador();
        User::factory()->create(['usuario' => 'amenjivar@policlinica.com']);

        $this->postJson('/api/usuarios', $this->payload())
            ->assertStatus(422)
            ->assertJsonPath('success', false);
    }

    public function test_rechaza_un_rol_fuera_del_catalogo(): void
    {
        $this->actuarComoAdministrador();

        $this->postJson('/api/usuarios', $this->payload(['rol' => 'LABORATORIO']))
            ->assertStatus(422);
    }

    public function test_rechaza_una_contrasena_debil(): void
    {
        $this->actuarComoAdministrador();

        $this->postJson('/api/usuarios', $this->payload(['password' => 'abc']))
            ->assertStatus(422);
    }

    public function test_rechaza_un_usuario_que_no_es_correo(): void
    {
        $this->actuarComoAdministrador();

        $this->postJson('/api/usuarios', $this->payload(['usuario' => 'sin-arroba']))
            ->assertStatus(422);
    }

    public function test_recepcionista_y_medico_no_pueden_registrar_cuentas(): void
    {
        foreach (['RECEPCIONISTA', 'MEDICO'] as $rol) {
            Sanctum::actingAs(User::factory()->create(['rol' => $rol, 'estado' => 'ACTIVO']));

            $this->postJson('/api/usuarios', $this->payload())->assertForbidden();

            $this->app['auth']->forgetGuards();
        }

        $this->assertDatabaseMissing('users', ['usuario' => 'amenjivar@policlinica.com']);
    }

    public function test_requiere_autenticacion(): void
    {
        $this->postJson('/api/usuarios', $this->payload())->assertUnauthorized();
    }

    public function test_la_respuesta_no_incluye_la_contrasena(): void
    {
        $this->actuarComoAdministrador();

        $respuesta = $this->postJson('/api/usuarios', $this->payload())->assertCreated();

        $this->assertStringNotContainsString('password', $respuesta->getContent());
    }
}
