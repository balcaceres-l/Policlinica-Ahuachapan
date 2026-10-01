<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** GET /medicos — selector de médicos para agenda y asignación. */
class ListadoMedicosTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        User::factory()->create([
            'nombre_completo' => 'Dra. Elena Ramirez',
            'rol' => 'MEDICO',
            'estado' => 'ACTIVO',
        ]);
        User::factory()->create([
            'nombre_completo' => 'Dr. Inactivo',
            'rol' => 'MEDICO',
            'estado' => 'INACTIVO',
        ]);
        User::factory()->create(['rol' => 'RECEPCIONISTA', 'estado' => 'ACTIVO']);
        User::factory()->create(['rol' => 'ADMINISTRADOR', 'estado' => 'ACTIVO']);
    }

    public function test_devuelve_solo_medicos_activos(): void
    {
        Sanctum::actingAs(User::factory()->create(['rol' => 'ADMINISTRADOR', 'estado' => 'ACTIVO']));

        $this->getJson('/api/medicos')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.nombreCompleto', 'Dra. Elena Ramirez')
            ->assertJsonPath('data.0.rol', 'MEDICO');
    }

    public function test_la_recepcionista_puede_consultarlos(): void
    {
        Sanctum::actingAs(User::factory()->create(['rol' => 'RECEPCIONISTA', 'estado' => 'ACTIVO']));

        $this->getJson('/api/medicos')->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_el_medico_no_accede_al_listado(): void
    {
        Sanctum::actingAs(User::factory()->create(['rol' => 'MEDICO', 'estado' => 'ACTIVO']));

        $this->getJson('/api/medicos')->assertForbidden();
    }

    public function test_requiere_autenticacion(): void
    {
        $this->getJson('/api/medicos')->assertUnauthorized();
    }

    public function test_no_expone_la_contrasena(): void
    {
        Sanctum::actingAs(User::factory()->create(['rol' => 'ADMINISTRADOR', 'estado' => 'ACTIVO']));

        $respuesta = $this->getJson('/api/medicos')->assertOk();

        $this->assertStringNotContainsString('password', $respuesta->getContent());
    }
}
