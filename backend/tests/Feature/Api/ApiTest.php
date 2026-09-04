<?php

namespace Tests\Feature\Api;

use App\Models\Especialidad;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_usuario_activo_puede_iniciar_sesion(): void
    {
        User::factory()->create([
            'usuario' => 'admin@policlinica.com',
            'rol' => 'ADMINISTRADOR',
            'password' => Hash::make('secreto123'),
        ]);

        $this->postJson('/api/auth/login', [
            'usuario' => 'admin@policlinica.com',
            'password' => 'secreto123',
        ])->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.usuario.rol', 'ADMINISTRADOR')
            ->assertJsonStructure(['data' => ['token', 'usuario']]);
    }

    public function test_rutas_de_administracion_requieren_autenticacion(): void
    {
        $this->getJson('/api/usuarios')->assertUnauthorized();
    }

    public function test_administrador_puede_listar_usuarios_con_formato_del_frontend(): void
    {
        $admin = User::factory()->create(['rol' => 'ADMINISTRADOR']);
        User::factory()->create([
            'nombre_completo' => 'Dra. Elena Ramírez',
            'usuario' => 'elena@policlinica.com',
            'rol' => 'MEDICO',
        ]);
        Sanctum::actingAs($admin);

        $this->getJson('/api/usuarios?rol=MEDICO')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.nombreCompleto', 'Dra. Elena Ramírez')
            ->assertJsonPath('data.0.usuario', 'elena@policlinica.com');
    }

    public function test_no_permite_registrar_especialidades_duplicadas(): void
    {
        $admin = User::factory()->create(['rol' => 'ADMINISTRADOR']);
        Especialidad::create([
            'nombre' => 'Cardiología',
            'descripcion' => 'Atención cardiovascular.',
            'estado' => 'ACTIVA',
        ]);
        Sanctum::actingAs($admin);

        $this->postJson('/api/especialidades', [
            'nombre' => 'Cardiología',
            'descripcion' => 'Duplicada.',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('nombre');
    }

    public function test_administrador_puede_asignar_y_quitar_especialidad_a_medico(): void
    {
        $admin = User::factory()->create(['rol' => 'ADMINISTRADOR']);
        $medico = User::factory()->create(['rol' => 'MEDICO', 'estado' => 'ACTIVO']);
        $especialidad = Especialidad::create([
            'nombre' => 'Cardiología',
            'descripcion' => null,
            'estado' => 'ACTIVA',
        ]);
        Sanctum::actingAs($admin);

        $this->postJson("/api/medicos/{$medico->id}/especialidades", [
            'especialidadId' => $especialidad->id,
        ])->assertCreated();

        $this->assertDatabaseHas('especialidad_user', [
            'user_id' => $medico->id,
            'especialidad_id' => $especialidad->id,
        ]);

        $this->deleteJson("/api/medicos/{$medico->id}/especialidades/{$especialidad->id}")
            ->assertOk();

        $this->assertDatabaseMissing('especialidad_user', [
            'user_id' => $medico->id,
            'especialidad_id' => $especialidad->id,
        ]);
    }

    public function test_catalogo_solo_incluye_especialidades_activas(): void
    {
        $recepcionista = User::factory()->create(['rol' => 'RECEPCIONISTA']);
        Especialidad::create(['nombre' => 'Pediatría', 'estado' => 'ACTIVA']);
        Especialidad::create(['nombre' => 'Servicio archivado', 'estado' => 'INACTIVA']);
        Sanctum::actingAs($recepcionista);

        $this->getJson('/api/catalogo/especialidades')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.nombre', 'Pediatría');
    }
}
