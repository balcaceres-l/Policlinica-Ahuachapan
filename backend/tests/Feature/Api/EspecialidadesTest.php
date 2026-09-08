<?php

namespace Tests\Feature\Api;

use App\Models\Especialidad;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** HU-07 registro, HU-08 asignación a médicos y HU-09 catálogo de recepción. */
class EspecialidadesTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['rol' => 'ADMINISTRADOR', 'estado' => 'ACTIVO']);
    }

    private function medico(array $atributos = []): User
    {
        return User::factory()->create(array_merge([
            'rol' => 'MEDICO',
            'estado' => 'ACTIVO',
        ], $atributos));
    }

    // ---- HU-07 ----

    public function test_administrador_puede_registrar_una_especialidad(): void
    {
        Sanctum::actingAs($this->admin);

        $this->postJson('/api/especialidades', [
            'nombre' => 'Cardiología',
            'descripcion' => 'Atención cardiovascular.',
        ])
            ->assertCreated()
            ->assertJsonPath('data.nombre', 'Cardiología')
            ->assertJsonPath('data.estado', 'ACTIVA')
            ->assertJsonPath('data.cantidadMedicos', 0);
    }

    public function test_la_descripcion_es_opcional(): void
    {
        Sanctum::actingAs($this->admin);

        $this->postJson('/api/especialidades', ['nombre' => 'Nutrición'])
            ->assertCreated()
            ->assertJsonPath('data.descripcion', '');
    }

    public function test_exige_un_nombre_de_al_menos_tres_caracteres(): void
    {
        Sanctum::actingAs($this->admin);

        $this->postJson('/api/especialidades', ['nombre' => 'AB'])->assertStatus(422);
    }

    public function test_puede_editar_una_especialidad_conservando_su_nombre(): void
    {
        Sanctum::actingAs($this->admin);
        $especialidad = Especialidad::create(['nombre' => 'Pediatría', 'estado' => 'ACTIVA']);

        $this->putJson("/api/especialidades/{$especialidad->id}", [
            'nombre' => 'Pediatría',
            'descripcion' => 'Atención de 0 a 12 años.',
        ])
            ->assertOk()
            ->assertJsonPath('data.descripcion', 'Atención de 0 a 12 años.');
    }

    public function test_recepcionista_y_medico_no_pueden_registrar_especialidades(): void
    {
        foreach (['RECEPCIONISTA', 'MEDICO'] as $rol) {
            Sanctum::actingAs(User::factory()->create(['rol' => $rol, 'estado' => 'ACTIVO']));

            $this->postJson('/api/especialidades', ['nombre' => 'Intrusa'])->assertForbidden();

            $this->app['auth']->forgetGuards();
        }
    }

    // ---- HU-08 ----

    public function test_un_medico_puede_tener_varias_especialidades(): void
    {
        Sanctum::actingAs($this->admin);
        $medico = $this->medico();
        $ginecologia = Especialidad::create(['nombre' => 'Ginecología', 'estado' => 'ACTIVA']);
        $interna = Especialidad::create(['nombre' => 'Medicina Interna', 'estado' => 'ACTIVA']);

        foreach ([$ginecologia, $interna] as $especialidad) {
            $this->postJson("/api/medicos/{$medico->id}/especialidades", [
                'especialidadId' => $especialidad->id,
            ])->assertCreated();
        }

        $this->getJson("/api/medicos/{$medico->id}/especialidades")
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_no_duplica_una_asignacion_existente(): void
    {
        Sanctum::actingAs($this->admin);
        $medico = $this->medico();
        $especialidad = Especialidad::create(['nombre' => 'Dermatología', 'estado' => 'ACTIVA']);

        $this->postJson("/api/medicos/{$medico->id}/especialidades", [
            'especialidadId' => $especialidad->id,
        ])->assertCreated();

        $this->postJson("/api/medicos/{$medico->id}/especialidades", [
            'especialidadId' => $especialidad->id,
        ])->assertStatus(409);

        $this->assertDatabaseCount('especialidad_user', 1);
    }

    public function test_no_asigna_especialidades_a_un_usuario_que_no_es_medico(): void
    {
        Sanctum::actingAs($this->admin);
        $recepcionista = User::factory()->create(['rol' => 'RECEPCIONISTA', 'estado' => 'ACTIVO']);
        $especialidad = Especialidad::create(['nombre' => 'Cirugía General', 'estado' => 'ACTIVA']);

        $this->postJson("/api/medicos/{$recepcionista->id}/especialidades", [
            'especialidadId' => $especialidad->id,
        ])->assertStatus(422);
    }

    public function test_no_asigna_una_especialidad_inactiva(): void
    {
        Sanctum::actingAs($this->admin);
        $medico = $this->medico();
        $especialidad = Especialidad::create(['nombre' => 'Clínica de Úlceras', 'estado' => 'INACTIVA']);

        $this->postJson("/api/medicos/{$medico->id}/especialidades", [
            'especialidadId' => $especialidad->id,
        ])->assertStatus(422);
    }

    public function test_retirar_una_especialidad_no_asignada_devuelve_404(): void
    {
        Sanctum::actingAs($this->admin);
        $medico = $this->medico();
        $especialidad = Especialidad::create(['nombre' => 'Pediatría', 'estado' => 'ACTIVA']);

        $this->deleteJson("/api/medicos/{$medico->id}/especialidades/{$especialidad->id}")
            ->assertStatus(404);
    }

    // ---- HU-09 ----

    public function test_el_catalogo_lista_las_especialidades_activas_con_sus_medicos(): void
    {
        $medico = $this->medico(['nombre_completo' => 'Dra. Elena Ramirez']);
        $especialidad = Especialidad::create(['nombre' => 'Ginecología', 'estado' => 'ACTIVA']);
        $especialidad->medicos()->attach($medico->id);
        Especialidad::create(['nombre' => 'Servicio archivado', 'estado' => 'INACTIVA']);

        Sanctum::actingAs(User::factory()->create(['rol' => 'RECEPCIONISTA', 'estado' => 'ACTIVO']));

        $this->getJson('/api/catalogo/especialidades')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.nombre', 'Ginecología')
            ->assertJsonPath('data.0.medicos.0.nombreCompleto', 'Dra. Elena Ramirez');
    }

    public function test_el_catalogo_omite_a_los_medicos_inactivos(): void
    {
        $activo = $this->medico(['nombre_completo' => 'Dr. Activo']);
        $inactivo = $this->medico(['nombre_completo' => 'Dr. Inactivo', 'estado' => 'INACTIVO']);
        $especialidad = Especialidad::create(['nombre' => 'Pediatría', 'estado' => 'ACTIVA']);
        $especialidad->medicos()->attach([$activo->id, $inactivo->id]);

        Sanctum::actingAs(User::factory()->create(['rol' => 'RECEPCIONISTA', 'estado' => 'ACTIVO']));

        $this->getJson('/api/catalogo/especialidades')
            ->assertOk()
            ->assertJsonCount(1, 'data.0.medicos')
            ->assertJsonPath('data.0.medicos.0.nombreCompleto', 'Dr. Activo')
            ->assertJsonPath('data.0.cantidadMedicos', 1);
    }

    /**
     * El catálogo es de administración y recepción. El médico consulta sus
     * propias especialidades por /medicos/{id}/especialidades.
     */
    public function test_el_medico_no_accede_al_catalogo_de_recepcion(): void
    {
        Especialidad::create(['nombre' => 'Pediatría', 'estado' => 'ACTIVA']);
        Sanctum::actingAs($this->medico());

        $this->getJson('/api/catalogo/especialidades')->assertForbidden();
    }

    public function test_el_catalogo_requiere_autenticacion(): void
    {
        $this->getJson('/api/catalogo/especialidades')->assertUnauthorized();
    }
}
