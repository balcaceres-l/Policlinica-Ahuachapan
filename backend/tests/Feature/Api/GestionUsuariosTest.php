<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** HU-04 edición de perfil y HU-05 activación de cuentas. */
class GestionUsuariosTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'usuario' => 'admin@policlinica.com',
            'rol' => 'ADMINISTRADOR',
            'estado' => 'ACTIVO',
            'password' => Hash::make('claveAdmin123'),
        ]);
    }

    /** @return array<string, string> */
    private function datosDe(User $usuario, array $sobrescribir = []): array
    {
        return array_merge([
            'nombre_completo' => $usuario->nombre_completo,
            'usuario' => $usuario->usuario,
            'cargo' => $usuario->cargo,
            'rol' => $usuario->rol,
            'telefono' => $usuario->telefono,
        ], $sobrescribir);
    }

    public function test_administrador_puede_editar_los_datos_de_un_usuario(): void
    {
        Sanctum::actingAs($this->admin);
        $medico = User::factory()->create(['rol' => 'MEDICO', 'cargo' => 'Pediatría']);

        $this->putJson("/api/usuarios/{$medico->id}", $this->datosDe($medico, [
            'nombre_completo' => 'Dra. Carla Sofía Peña',
            'cargo' => 'Dermatología',
            'telefono' => '2443-1022',
        ]))
            ->assertOk()
            ->assertJsonPath('data.nombreCompleto', 'Dra. Carla Sofía Peña')
            ->assertJsonPath('data.cargo', 'Dermatología');

        $this->assertSame('Dermatología', $medico->refresh()->cargo);
    }

    public function test_editar_permite_conservar_el_mismo_usuario(): void
    {
        Sanctum::actingAs($this->admin);
        $medico = User::factory()->create(['usuario' => 'medico@policlinica.com']);

        $this->putJson("/api/usuarios/{$medico->id}", $this->datosDe($medico, [
            'cargo' => 'Medicina Interna',
        ]))->assertOk();
    }

    public function test_no_permite_reutilizar_el_usuario_de_otra_cuenta(): void
    {
        Sanctum::actingAs($this->admin);
        User::factory()->create(['usuario' => 'ocupado@policlinica.com']);
        $medico = User::factory()->create(['usuario' => 'libre@policlinica.com']);

        $this->putJson("/api/usuarios/{$medico->id}", $this->datosDe($medico, [
            'usuario' => 'ocupado@policlinica.com',
        ]))->assertStatus(422);
    }

    public function test_administrador_puede_cambiar_el_rol_de_un_usuario(): void
    {
        Sanctum::actingAs($this->admin);
        $usuario = User::factory()->create(['rol' => 'RECEPCIONISTA']);

        $this->patchJson("/api/usuarios/{$usuario->id}/estado", ['estado' => 'ACTIVO'])->assertOk();

        $this->putJson("/api/usuarios/{$usuario->id}", $this->datosDe($usuario, [
            'rol' => 'MEDICO',
        ]))->assertOk()->assertJsonPath('data.rol', 'MEDICO');
    }

    public function test_desactivar_una_cuenta_le_impide_volver_a_entrar(): void
    {
        Sanctum::actingAs($this->admin);
        $medico = User::factory()->create([
            'usuario' => 'medico@policlinica.com',
            'estado' => 'ACTIVO',
            'password' => Hash::make('claveMedico123'),
        ]);

        $this->patchJson("/api/usuarios/{$medico->id}/estado", ['estado' => 'INACTIVO'])
            ->assertOk()
            ->assertJsonPath('data.estado', 'INACTIVO');

        $this->app['auth']->forgetGuards();

        $this->postJson('/api/auth/login', [
            'usuario' => 'medico@policlinica.com',
            'password' => 'claveMedico123',
        ])->assertStatus(403);
    }

    public function test_reactivar_una_cuenta_le_devuelve_el_acceso(): void
    {
        Sanctum::actingAs($this->admin);
        $medico = User::factory()->create([
            'usuario' => 'medico@policlinica.com',
            'estado' => 'INACTIVO',
            'password' => Hash::make('claveMedico123'),
        ]);

        $this->patchJson("/api/usuarios/{$medico->id}/estado", ['estado' => 'ACTIVO'])->assertOk();

        $this->app['auth']->forgetGuards();

        $this->postJson('/api/auth/login', [
            'usuario' => 'medico@policlinica.com',
            'password' => 'claveMedico123',
        ])->assertOk();
    }

    public function test_desactivar_corta_la_sesion_abierta_del_usuario(): void
    {
        $medico = User::factory()->create([
            'usuario' => 'medico@policlinica.com',
            'estado' => 'ACTIVO',
            'password' => Hash::make('claveMedico123'),
        ]);

        $token = $this->postJson('/api/auth/login', [
            'usuario' => 'medico@policlinica.com',
            'password' => 'claveMedico123',
        ])->json('data.token');

        $this->app['auth']->forgetGuards();
        Sanctum::actingAs($this->admin);
        $this->patchJson("/api/usuarios/{$medico->id}/estado", ['estado' => 'INACTIVO'])->assertOk();

        $this->app['auth']->forgetGuards();
        $this->getJson('/api/auth/me', ['Authorization' => "Bearer {$token}"])->assertUnauthorized();
    }

    public function test_un_administrador_no_puede_desactivarse_a_si_mismo(): void
    {
        Sanctum::actingAs($this->admin);

        $this->patchJson("/api/usuarios/{$this->admin->id}/estado", ['estado' => 'INACTIVO'])
            ->assertStatus(422);

        $this->assertSame('ACTIVO', $this->admin->refresh()->estado);
    }

    public function test_rechaza_un_estado_fuera_del_catalogo(): void
    {
        Sanctum::actingAs($this->admin);
        $usuario = User::factory()->create();

        $this->patchJson("/api/usuarios/{$usuario->id}/estado", ['estado' => 'SUSPENDIDO'])
            ->assertStatus(422);
    }

    public function test_recepcionista_y_medico_no_pueden_editar_ni_activar(): void
    {
        $objetivo = User::factory()->create(['rol' => 'MEDICO']);

        foreach (['RECEPCIONISTA', 'MEDICO'] as $rol) {
            Sanctum::actingAs(User::factory()->create(['rol' => $rol, 'estado' => 'ACTIVO']));

            $this->putJson("/api/usuarios/{$objetivo->id}", $this->datosDe($objetivo))
                ->assertForbidden();
            $this->patchJson("/api/usuarios/{$objetivo->id}/estado", ['estado' => 'INACTIVO'])
                ->assertForbidden();

            $this->app['auth']->forgetGuards();
        }
    }
}
