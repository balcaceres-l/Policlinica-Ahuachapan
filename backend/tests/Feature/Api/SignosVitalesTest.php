<?php

namespace Tests\Feature\Api;

use App\Models\cita;
use App\Models\paciente;
use App\Models\signos_vitales;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** HU-18 — registro de signos vitales sobre la cita. */
class SignosVitalesTest extends TestCase
{
    use RefreshDatabase;

    private User $medico;

    private User $recepcion;

    private cita $cita;

    private paciente $paciente;

    protected function setUp(): void
    {
        parent::setUp();

        $admin = User::factory()->create(['rol' => 'ADMINISTRADOR', 'estado' => 'ACTIVO']);
        $this->medico = User::factory()->create(['rol' => 'MEDICO', 'estado' => 'ACTIVO']);
        $this->recepcion = User::factory()->create(['rol' => 'RECEPCIONISTA', 'estado' => 'ACTIVO']);

        $this->paciente = paciente::create([
            'numero_expediente' => 'PT01-2026',
            'nombre_completo' => 'Paciente de Prueba',
            'fecha_nacimiento' => '1990-05-14',
            'id_registrado_por' => $admin->id,
        ]);

        $this->cita = cita::create([
            'id_paciente' => $this->paciente->id_paciente,
            'id_medico' => $this->medico->id,
            'fecha' => '2026-09-21',
            'hora_inicio' => '15:00',
            'hora_fin' => '15:30',
            'id_creado_por' => $this->recepcion->id,
        ]);
    }

    private function ruta(): string
    {
        return "/api/citas/{$this->cita->id_cita}/signos-vitales";
    }

    /** @return array<string, mixed> */
    private function datos(array $sobrescribir = []): array
    {
        return array_merge([
            'presion_sistolica' => 120,
            'presion_diastolica' => 80,
            'frecuencia_cardiaca' => 72,
            'frecuencia_respiratoria' => 16,
            'temperatura_c' => 36.6,
            'peso_kg' => 70,
            'talla_cm' => 170,
            'saturacion_oxigeno' => 98,
            'observaciones' => 'Paciente estable.',
        ], $sobrescribir);
    }

    /** La recepcionista los toma en el triaje, antes de que exista la consulta. */
    public function test_la_recepcionista_registra_los_signos_en_el_triaje(): void
    {
        Sanctum::actingAs($this->recepcion);

        $this->putJson($this->ruta(), $this->datos())
            ->assertCreated()
            ->assertJsonPath('data.presion_sistolica', 120)
            ->assertJsonPath('data.registrado_por_id', $this->recepcion->id);

        $this->assertDatabaseCount('signos_vitales', 1);
    }

    /** Si recepción no los tomó, el médico puede hacerlo al atender. */
    public function test_el_medico_tambien_puede_registrarlos(): void
    {
        Sanctum::actingAs($this->medico);

        $this->putJson($this->ruta(), $this->datos())
            ->assertCreated()
            ->assertJsonPath('data.registrado_por_id', $this->medico->id);
    }

    public function test_el_medico_corrige_lo_que_registro_recepcion(): void
    {
        Sanctum::actingAs($this->recepcion);
        $this->putJson($this->ruta(), $this->datos())->assertCreated();

        $this->app['auth']->forgetGuards();
        Sanctum::actingAs($this->medico);

        $this->putJson($this->ruta(), $this->datos(['temperatura_c' => 38.4]))
            ->assertOk()
            ->assertJsonPath('data.temperatura_c', 38.4)
            ->assertJsonPath('data.registrado_por_id', $this->medico->id);

        $this->assertDatabaseCount('signos_vitales', 1);
    }

    public function test_calcula_el_imc_a_partir_del_peso_y_la_talla(): void
    {
        Sanctum::actingAs($this->recepcion);

        // 70 kg / 1.70 m² = 24.2
        $this->putJson($this->ruta(), $this->datos())
            ->assertCreated()
            ->assertJsonPath('data.imc', 24.2);
    }

    public function test_sin_peso_o_talla_el_imc_queda_vacio(): void
    {
        Sanctum::actingAs($this->recepcion);

        $this->putJson($this->ruta(), $this->datos(['talla_cm' => null]))
            ->assertCreated()
            ->assertJsonPath('data.imc', null);
    }

    /** Criterio 49: quedan asociados a la cita y, por ella, al expediente. */
    public function test_quedan_asociados_a_la_cita_y_al_paciente(): void
    {
        Sanctum::actingAs($this->recepcion);
        $this->putJson($this->ruta(), $this->datos())->assertCreated();

        $signos = signos_vitales::first();

        $this->assertSame($this->cita->id_cita, $signos->id_cita);
        $this->assertSame($this->paciente->id_paciente, $signos->cita->id_paciente);
    }

    public function test_todos_los_campos_son_opcionales(): void
    {
        Sanctum::actingAs($this->recepcion);

        $this->putJson($this->ruta(), ['peso_kg' => 68])
            ->assertCreated()
            ->assertJsonPath('data.peso_kg', 68)
            ->assertJsonPath('data.presion_sistolica', null);
    }

    public function test_recupera_los_signos_de_una_cita(): void
    {
        Sanctum::actingAs($this->recepcion);
        $this->putJson($this->ruta(), $this->datos())->assertCreated();

        $this->getJson($this->ruta())
            ->assertOk()
            ->assertJsonPath('data.frecuencia_cardiaca', 72);
    }

    public function test_una_cita_sin_signos_devuelve_nulo(): void
    {
        Sanctum::actingAs($this->recepcion);

        $this->getJson($this->ruta())->assertOk()->assertJsonPath('data', null);
    }

    public function test_rechaza_valores_fuera_de_rango(): void
    {
        Sanctum::actingAs($this->recepcion);

        $this->putJson($this->ruta(), $this->datos(['temperatura_c' => 80]))->assertStatus(422);
        $this->putJson($this->ruta(), $this->datos(['saturacion_oxigeno' => 150]))->assertStatus(422);
    }

    public function test_la_diastolica_no_puede_superar_a_la_sistolica(): void
    {
        Sanctum::actingAs($this->recepcion);

        $this->putJson($this->ruta(), $this->datos([
            'presion_sistolica' => 80,
            'presion_diastolica' => 120,
        ]))->assertStatus(422);
    }

    public function test_no_se_registran_signos_en_una_cita_cancelada(): void
    {
        Sanctum::actingAs($this->recepcion);
        $this->cita->update(['estado' => 'CANCELADA']);

        $this->putJson($this->ruta(), $this->datos())->assertStatus(422);
    }

    public function test_un_medico_no_toca_las_citas_de_otro(): void
    {
        Sanctum::actingAs(User::factory()->create(['rol' => 'MEDICO', 'estado' => 'ACTIVO']));

        $this->putJson($this->ruta(), $this->datos())->assertForbidden();
        $this->getJson($this->ruta())->assertForbidden();
    }

    public function test_requiere_autenticacion(): void
    {
        $this->putJson($this->ruta(), $this->datos())->assertUnauthorized();
    }
}
