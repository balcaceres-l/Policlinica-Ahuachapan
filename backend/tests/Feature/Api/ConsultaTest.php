<?php

namespace Tests\Feature\Api;

use App\Models\cita;
use App\Models\consulta;
use App\Models\especialidad;
use App\Models\paciente;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** HU-39 — selección de especialidad al atender la consulta. */
class ConsultaTest extends TestCase
{
    use RefreshDatabase;

    private User $medico;

    private paciente $paciente;

    private especialidad $ginecologia;

    private especialidad $interna;

    protected function setUp(): void
    {
        parent::setUp();

        $admin = User::factory()->create(['rol' => 'ADMINISTRADOR', 'estado' => 'ACTIVO']);
        $this->medico = User::factory()->create(['rol' => 'MEDICO', 'estado' => 'ACTIVO']);

        $this->ginecologia = especialidad::create(['nombre' => 'Ginecología', 'estado' => 'ACTIVA']);
        $this->interna = especialidad::create(['nombre' => 'Medicina Interna', 'estado' => 'ACTIVA']);

        $this->paciente = paciente::create([
            'numero_expediente' => 'PT01-2026',
            'nombre_completo' => 'Paciente de Prueba',
            'fecha_nacimiento' => '1990-05-14',
            'id_registrado_por' => $admin->id,
        ]);
    }

    private function crearCita(?User $medico = null): cita
    {
        return cita::create([
            'id_paciente' => $this->paciente->id_paciente,
            'id_medico' => ($medico ?? $this->medico)->id,
            'fecha' => '2026-09-21',
            'hora_inicio' => '15:00',
            'hora_fin' => '15:30',
            'id_creado_por' => $this->medico->id,
        ]);
    }

    public function test_lista_las_especialidades_del_medico_autenticado(): void
    {
        $this->medico->especialidades()->sync([$this->ginecologia->id, $this->interna->id]);
        Sanctum::actingAs($this->medico);

        $this->getJson('/api/consultas/especialidades-disponibles')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_omite_las_especialidades_inactivas(): void
    {
        $this->interna->update(['estado' => 'INACTIVA']);
        $this->medico->especialidades()->sync([$this->ginecologia->id, $this->interna->id]);
        Sanctum::actingAs($this->medico);

        $this->getJson('/api/consultas/especialidades-disponibles')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.nombre', 'Ginecología');
    }

    /** RB-05: con una sola especialidad no hace falta preguntar. */
    public function test_con_una_sola_especialidad_se_selecciona_sola(): void
    {
        $this->medico->especialidades()->sync([$this->ginecologia->id]);
        Sanctum::actingAs($this->medico);
        $cita = $this->crearCita();

        $this->postJson("/api/citas/{$cita->id_cita}/consulta")
            ->assertCreated()
            ->assertJsonPath('data.especialidad_atencion_id', $this->ginecologia->id)
            ->assertJsonPath('data.especialidadNombre', 'Ginecología');
    }

    public function test_con_varias_especialidades_exige_elegir_una(): void
    {
        $this->medico->especialidades()->sync([$this->ginecologia->id, $this->interna->id]);
        Sanctum::actingAs($this->medico);
        $cita = $this->crearCita();

        $this->postJson("/api/citas/{$cita->id_cita}/consulta")->assertStatus(422);

        $this->assertDatabaseCount('consulta', 0);
    }

    public function test_el_medico_elige_con_cual_de_sus_especialidades_atiende(): void
    {
        $this->medico->especialidades()->sync([$this->ginecologia->id, $this->interna->id]);
        Sanctum::actingAs($this->medico);
        $cita = $this->crearCita();

        $this->postJson("/api/citas/{$cita->id_cita}/consulta", [
            'especialidad_atencion_id' => $this->interna->id,
        ])
            ->assertCreated()
            ->assertJsonPath('data.especialidadNombre', 'Medicina Interna');
    }

    public function test_rechaza_una_especialidad_que_no_tiene_asignada(): void
    {
        $this->medico->especialidades()->sync([$this->ginecologia->id]);
        Sanctum::actingAs($this->medico);
        $cita = $this->crearCita();

        $this->postJson("/api/citas/{$cita->id_cita}/consulta", [
            'especialidad_atencion_id' => $this->interna->id,
        ])->assertStatus(422);
    }

    public function test_abrir_la_consulta_pone_la_cita_en_atencion(): void
    {
        $this->medico->especialidades()->sync([$this->ginecologia->id]);
        Sanctum::actingAs($this->medico);
        $cita = $this->crearCita();

        $this->postJson("/api/citas/{$cita->id_cita}/consulta")
            ->assertCreated()
            ->assertJsonPath('data.abierta', true);

        $this->assertSame('EN_ATENCION', $cita->refresh()->estado);
    }

    /** INC-12: una cita, una consulta. */
    public function test_una_cita_no_admite_dos_consultas(): void
    {
        $this->medico->especialidades()->sync([$this->ginecologia->id]);
        Sanctum::actingAs($this->medico);
        $cita = $this->crearCita();

        $this->postJson("/api/citas/{$cita->id_cita}/consulta")->assertCreated();
        $this->postJson("/api/citas/{$cita->id_cita}/consulta")->assertStatus(409);
    }

    public function test_el_medico_no_atiende_citas_de_otro(): void
    {
        $otro = User::factory()->create(['rol' => 'MEDICO', 'estado' => 'ACTIVO']);
        $this->medico->especialidades()->sync([$this->ginecologia->id]);
        Sanctum::actingAs($this->medico);

        $this->postJson("/api/citas/{$this->crearCita($otro)->id_cita}/consulta")
            ->assertForbidden();
    }

    public function test_no_se_atiende_una_cita_cancelada(): void
    {
        $this->medico->especialidades()->sync([$this->ginecologia->id]);
        Sanctum::actingAs($this->medico);
        $cita = $this->crearCita();
        $cita->update(['estado' => 'CANCELADA']);

        $this->postJson("/api/citas/{$cita->id_cita}/consulta")->assertStatus(422);
    }

    public function test_finalizar_cierra_la_consulta_y_marca_la_cita_atendida(): void
    {
        $this->medico->especialidades()->sync([$this->ginecologia->id]);
        Sanctum::actingAs($this->medico);
        $cita = $this->crearCita();
        $id = $this->postJson("/api/citas/{$cita->id_cita}/consulta")->json('data.id');

        $this->patchJson("/api/consultas/{$id}/finalizar", [
            'notas_adicionales' => 'Paciente estable.',
        ])
            ->assertOk()
            ->assertJsonPath('data.abierta', false)
            ->assertJsonPath('data.notas_adicionales', 'Paciente estable.');

        $this->assertSame('ATENDIDA', $cita->refresh()->estado);
    }

    public function test_no_se_finaliza_dos_veces(): void
    {
        $this->medico->especialidades()->sync([$this->ginecologia->id]);
        Sanctum::actingAs($this->medico);
        $cita = $this->crearCita();
        $id = $this->postJson("/api/citas/{$cita->id_cita}/consulta")->json('data.id');

        $this->patchJson("/api/consultas/{$id}/finalizar")->assertOk();
        $this->patchJson("/api/consultas/{$id}/finalizar")->assertStatus(422);
    }

    public function test_solo_el_medico_que_abrio_puede_cerrarla(): void
    {
        $this->medico->especialidades()->sync([$this->ginecologia->id]);
        Sanctum::actingAs($this->medico);
        $cita = $this->crearCita();
        $id = $this->postJson("/api/citas/{$cita->id_cita}/consulta")->json('data.id');

        $this->app['auth']->forgetGuards();
        Sanctum::actingAs(User::factory()->create(['rol' => 'MEDICO', 'estado' => 'ACTIVO']));

        $this->patchJson("/api/consultas/{$id}/finalizar")->assertForbidden();
    }

    public function test_la_recepcionista_no_abre_consultas(): void
    {
        Sanctum::actingAs(User::factory()->create(['rol' => 'RECEPCIONISTA', 'estado' => 'ACTIVO']));

        $this->postJson("/api/citas/{$this->crearCita()->id_cita}/consulta")->assertForbidden();
    }

    public function test_una_consulta_abierta_reporta_los_minutos_transcurridos(): void
    {
        $this->medico->especialidades()->sync([$this->ginecologia->id]);
        Sanctum::actingAs($this->medico);
        $cita = $this->crearCita();
        $id = $this->postJson("/api/citas/{$cita->id_cita}/consulta")->json('data.id');

        consulta::find($id)->update(['fecha_hora_inicio' => now()->subMinutes(40)]);

        $this->getJson("/api/consultas/{$id}")
            ->assertOk()
            ->assertJsonPath('data.minutos_transcurridos', 40);
    }
}
