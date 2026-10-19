<?php

namespace Tests\Feature\Api;

use App\Models\bloqueo_agenda;
use App\Models\cita;
use App\Models\horario_medico;
use App\Models\paciente;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * El médico edita su propio horario y bloquea su propia agenda, siempre que no
 * deje citas agendadas fuera; esas las gestiona recepción.
 */
class AgendaPropiaMedicoTest extends TestCase
{
    use RefreshDatabase;

    private User $medico;

    private User $otroMedico;

    private paciente $paciente;

    private horario_medico $tarde;

    private string $proximoLunes;

    protected function setUp(): void
    {
        parent::setUp();

        $admin = User::factory()->create(['rol' => 'ADMINISTRADOR', 'estado' => 'ACTIVO']);
        $this->medico = User::factory()->create(['rol' => 'MEDICO', 'estado' => 'ACTIVO']);
        $this->otroMedico = User::factory()->create(['rol' => 'MEDICO', 'estado' => 'ACTIVO']);

        $this->paciente = paciente::create([
            'numero_expediente' => 'PT01-2026',
            'nombre_completo' => 'Paciente de Prueba',
            'fecha_nacimiento' => '1990-05-14',
            'id_registrado_por' => $admin->id,
        ]);

        $this->tarde = horario_medico::create([
            'id_medico' => $this->medico->id,
            'dia_semana' => 'LUNES',
            'hora_inicio' => '15:00',
            'hora_fin' => '18:30',
        ]);

        $this->proximoLunes = now()->next('Monday')->toDateString();
    }

    private function citaElProximoLunes(string $inicio = '16:00', string $fin = '16:30', string $tipo = 'REGULAR'): cita
    {
        return cita::create([
            'id_paciente' => $this->paciente->id_paciente,
            'id_medico' => $this->medico->id,
            'fecha' => $this->proximoLunes,
            'hora_inicio' => $inicio,
            'hora_fin' => $fin,
            'tipo_cita' => $tipo,
            'id_creado_por' => $this->medico->id,
        ]);
    }

    // ---- Horario ----

    public function test_el_medico_cambia_su_horario_si_no_deja_citas_fuera(): void
    {
        $this->citaElProximoLunes('16:00', '16:30');
        Sanctum::actingAs($this->medico);

        $this->putJson("/api/medicos/{$this->medico->id}/horarios", ['horarios' => [
            ['dia_semana' => 'LUNES', 'hora_inicio' => '15:00', 'hora_fin' => '17:00'],
            ['dia_semana' => 'SABADO', 'hora_inicio' => '08:00', 'hora_fin' => '12:00'],
        ]])->assertOk()->assertJsonCount(2, 'data');
    }

    public function test_el_medico_no_cambia_su_horario_si_deja_citas_agendadas_fuera(): void
    {
        $this->citaElProximoLunes('17:30', '18:00');
        Sanctum::actingAs($this->medico);

        $this->putJson("/api/medicos/{$this->medico->id}/horarios", ['horarios' => [
            ['dia_semana' => 'LUNES', 'hora_inicio' => '15:00', 'hora_fin' => '17:00'],
        ]])
            ->assertStatus(422)
            ->assertJsonPath('message', fn (string $m) => str_contains($m, 'recepción'));

        $this->assertSame('18:30', substr((string) $this->tarde->refresh()->hora_fin, 0, 5));
    }

    public function test_el_medico_no_elimina_un_tramo_con_citas_agendadas(): void
    {
        $this->citaElProximoLunes();
        Sanctum::actingAs($this->medico);

        $this->deleteJson("/api/horarios/{$this->tarde->id_horario}")->assertStatus(422);
        $this->assertDatabaseHas('horario_medico', ['id_horario' => $this->tarde->id_horario]);
    }

    public function test_las_citas_canceladas_o_de_emergencia_no_impiden_el_cambio(): void
    {
        $this->citaElProximoLunes('16:00', '16:30', 'EMERGENCIA');
        $this->citaElProximoLunes('17:00', '17:30')->update(['estado' => 'CANCELADA']);
        Sanctum::actingAs($this->medico);

        $this->deleteJson("/api/horarios/{$this->tarde->id_horario}")->assertOk();
    }

    public function test_el_medico_no_toca_el_horario_de_otro(): void
    {
        Sanctum::actingAs($this->medico);

        $this->putJson("/api/medicos/{$this->otroMedico->id}/horarios", ['horarios' => []])
            ->assertForbidden();
    }

    public function test_el_administrador_si_puede_dejar_citas_fuera(): void
    {
        $this->citaElProximoLunes('17:30', '18:00');
        Sanctum::actingAs(User::factory()->create(['rol' => 'ADMINISTRADOR', 'estado' => 'ACTIVO']));

        $this->putJson("/api/medicos/{$this->medico->id}/horarios", ['horarios' => [
            ['dia_semana' => 'LUNES', 'hora_inicio' => '15:00', 'hora_fin' => '17:00'],
        ]])->assertOk();
    }

    public function test_la_recepcionista_sigue_sin_configurar_horarios(): void
    {
        Sanctum::actingAs(User::factory()->create(['rol' => 'RECEPCIONISTA', 'estado' => 'ACTIVO']));

        $this->putJson("/api/medicos/{$this->medico->id}/horarios", ['horarios' => []])
            ->assertForbidden();
    }

    // ---- Bloqueos ----

    public function test_el_medico_bloquea_su_agenda_si_no_hay_citas(): void
    {
        Sanctum::actingAs($this->medico);

        $this->postJson('/api/bloqueos', [
            'medico_id' => $this->medico->id,
            'fecha' => $this->proximoLunes,
            'motivo' => 'Congreso médico',
        ])->assertCreated();
    }

    public function test_el_medico_no_bloquea_sobre_citas_agendadas(): void
    {
        $this->citaElProximoLunes('16:00', '16:30');
        Sanctum::actingAs($this->medico);

        $this->postJson('/api/bloqueos', [
            'medico_id' => $this->medico->id,
            'fecha' => $this->proximoLunes,
            'hora_inicio' => '15:30',
            'hora_fin' => '17:00',
            'motivo' => 'Diligencia personal',
        ])
            ->assertStatus(422)
            ->assertJsonPath('message', fn (string $m) => str_contains($m, 'recepción'));

        $this->assertSame(0, bloqueo_agenda::count());
    }

    public function test_el_medico_bloquea_un_lapso_parcial_que_no_toca_citas(): void
    {
        $this->citaElProximoLunes('16:00', '16:30');
        Sanctum::actingAs($this->medico);

        $this->postJson('/api/bloqueos', [
            'medico_id' => $this->medico->id,
            'fecha' => $this->proximoLunes,
            'hora_inicio' => '17:00',
            'hora_fin' => '18:30',
            'motivo' => 'Diligencia personal',
        ])->assertCreated();
    }

    public function test_recepcion_si_bloquea_sobre_citas_agendadas(): void
    {
        $this->citaElProximoLunes('16:00', '16:30');
        Sanctum::actingAs(User::factory()->create(['rol' => 'RECEPCIONISTA', 'estado' => 'ACTIVO']));

        $this->postJson('/api/bloqueos', [
            'medico_id' => $this->medico->id,
            'fecha' => $this->proximoLunes,
            'motivo' => 'Incapacidad',
        ])
            ->assertCreated()
            ->assertJsonCount(1, 'data.citasAfectadas');
    }

    public function test_el_medico_no_bloquea_ni_quita_bloqueos_de_otro(): void
    {
        $ajeno = bloqueo_agenda::create([
            'id_medico' => $this->otroMedico->id,
            'fecha' => $this->proximoLunes,
            'motivo' => 'Vacaciones',
            'id_creado_por' => $this->otroMedico->id,
        ]);
        Sanctum::actingAs($this->medico);

        $this->postJson('/api/bloqueos', [
            'medico_id' => $this->otroMedico->id,
            'fecha' => $this->proximoLunes,
            'motivo' => 'Prueba',
        ])->assertForbidden();

        $this->deleteJson("/api/bloqueos/{$ajeno->id_bloqueo}")->assertForbidden();
    }

    public function test_el_medico_quita_su_propio_bloqueo(): void
    {
        $propio = bloqueo_agenda::create([
            'id_medico' => $this->medico->id,
            'fecha' => $this->proximoLunes,
            'motivo' => 'Vacaciones',
            'id_creado_por' => $this->medico->id,
        ]);
        Sanctum::actingAs($this->medico);

        $this->deleteJson("/api/bloqueos/{$propio->id_bloqueo}")->assertOk();
    }
}
