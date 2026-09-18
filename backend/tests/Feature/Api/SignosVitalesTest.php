<?php

namespace Tests\Feature\Api;

use App\Models\cita;
use App\Models\consulta;
use App\Models\especialidad;
use App\Models\paciente;
use App\Models\signos_vitales;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** HU-18 — registro de signos vitales en la consulta. */
class SignosVitalesTest extends TestCase
{
    use RefreshDatabase;

    private User $medico;

    private consulta $consulta;

    private paciente $paciente;

    protected function setUp(): void
    {
        parent::setUp();

        $admin = User::factory()->create(['rol' => 'ADMINISTRADOR', 'estado' => 'ACTIVO']);
        $this->medico = User::factory()->create(['rol' => 'MEDICO', 'estado' => 'ACTIVO']);

        $ginecologia = especialidad::create(['nombre' => 'Ginecología', 'estado' => 'ACTIVA']);
        $this->medico->especialidades()->sync([$ginecologia->id]);

        $this->paciente = paciente::create([
            'numero_expediente' => 'PT01-2026',
            'nombre_completo' => 'Paciente de Prueba',
            'fecha_nacimiento' => '1990-05-14',
            'id_registrado_por' => $admin->id,
        ]);

        $cita = cita::create([
            'id_paciente' => $this->paciente->id_paciente,
            'id_medico' => $this->medico->id,
            'fecha' => '2026-09-21',
            'hora_inicio' => '15:00',
            'hora_fin' => '15:30',
            'id_creado_por' => $admin->id,
        ]);

        $this->consulta = consulta::create([
            'id_cita' => $cita->id_cita,
            'id_medico' => $this->medico->id,
            'id_especialidad_atencion' => $ginecologia->id,
            'fecha_hora_inicio' => now(),
        ]);
    }

    private function ruta(): string
    {
        return "/api/consultas/{$this->consulta->id_consulta}/signos-vitales";
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

    public function test_el_medico_registra_los_signos_vitales(): void
    {
        Sanctum::actingAs($this->medico);

        $this->putJson($this->ruta(), $this->datos())
            ->assertCreated()
            ->assertJsonPath('data.presion_sistolica', 120)
            ->assertJsonPath('data.temperatura_c', 36.6)
            ->assertJsonPath('data.observaciones', 'Paciente estable.');

        $this->assertDatabaseCount('signos_vitales', 1);
    }

    public function test_calcula_el_imc_a_partir_del_peso_y_la_talla(): void
    {
        Sanctum::actingAs($this->medico);

        // 70 kg / 1.70 m² = 24.2
        $this->putJson($this->ruta(), $this->datos())
            ->assertCreated()
            ->assertJsonPath('data.imc', 24.2);
    }

    public function test_sin_peso_o_talla_el_imc_queda_vacio(): void
    {
        Sanctum::actingAs($this->medico);

        $this->putJson($this->ruta(), $this->datos(['talla_cm' => null]))
            ->assertCreated()
            ->assertJsonPath('data.imc', null);
    }

    /** Criterio 49: quedan asociados a la consulta y al expediente. */
    public function test_quedan_asociados_a_la_consulta_y_al_paciente(): void
    {
        Sanctum::actingAs($this->medico);
        $this->putJson($this->ruta(), $this->datos())->assertCreated();

        $signos = signos_vitales::first();

        $this->assertSame($this->consulta->id_consulta, $signos->id_consulta);
        $this->assertSame(
            $this->paciente->id_paciente,
            $signos->consulta->cita->id_paciente,
        );
    }

    public function test_todos_los_campos_son_opcionales(): void
    {
        Sanctum::actingAs($this->medico);

        $this->putJson($this->ruta(), ['peso_kg' => 68])
            ->assertCreated()
            ->assertJsonPath('data.peso_kg', 68)
            ->assertJsonPath('data.presion_sistolica', null);
    }

    public function test_corregir_actualiza_en_vez_de_duplicar(): void
    {
        Sanctum::actingAs($this->medico);
        $this->putJson($this->ruta(), $this->datos())->assertCreated();

        $this->putJson($this->ruta(), $this->datos(['presion_sistolica' => 130]))
            ->assertOk()
            ->assertJsonPath('data.presion_sistolica', 130);

        $this->assertDatabaseCount('signos_vitales', 1);
    }

    public function test_recupera_los_signos_de_una_consulta(): void
    {
        Sanctum::actingAs($this->medico);
        $this->putJson($this->ruta(), $this->datos())->assertCreated();

        $this->getJson($this->ruta())
            ->assertOk()
            ->assertJsonPath('data.frecuencia_cardiaca', 72);
    }

    public function test_una_consulta_sin_signos_devuelve_nulo(): void
    {
        Sanctum::actingAs($this->medico);

        $this->getJson($this->ruta())->assertOk()->assertJsonPath('data', null);
    }

    public function test_rechaza_valores_fuera_de_rango(): void
    {
        Sanctum::actingAs($this->medico);

        $this->putJson($this->ruta(), $this->datos(['temperatura_c' => 80]))->assertStatus(422);
        $this->putJson($this->ruta(), $this->datos(['saturacion_oxigeno' => 150]))->assertStatus(422);
    }

    public function test_la_diastolica_no_puede_superar_a_la_sistolica(): void
    {
        Sanctum::actingAs($this->medico);

        $this->putJson($this->ruta(), $this->datos([
            'presion_sistolica' => 80,
            'presion_diastolica' => 120,
        ]))->assertStatus(422);
    }

    public function test_no_se_registran_signos_en_una_consulta_cerrada(): void
    {
        Sanctum::actingAs($this->medico);
        $this->consulta->update(['fecha_hora_fin' => now()]);

        $this->putJson($this->ruta(), $this->datos())->assertStatus(422);
    }

    public function test_un_medico_no_toca_la_consulta_de_otro(): void
    {
        Sanctum::actingAs(User::factory()->create(['rol' => 'MEDICO', 'estado' => 'ACTIVO']));

        $this->putJson($this->ruta(), $this->datos())->assertForbidden();
        $this->getJson($this->ruta())->assertForbidden();
    }

    public function test_la_recepcionista_no_registra_signos(): void
    {
        Sanctum::actingAs(User::factory()->create(['rol' => 'RECEPCIONISTA', 'estado' => 'ACTIVO']));

        $this->putJson($this->ruta(), $this->datos())->assertForbidden();
    }

    public function test_guarda_quien_los_registro(): void
    {
        Sanctum::actingAs($this->medico);

        $this->putJson($this->ruta(), $this->datos())
            ->assertCreated()
            ->assertJsonPath('data.registrado_por_id', $this->medico->id);
    }
}
