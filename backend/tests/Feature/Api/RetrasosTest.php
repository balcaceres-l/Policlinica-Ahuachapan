<?php

namespace Tests\Feature\Api;

use App\Models\cita;
use App\Models\horario_medico;
use App\Models\paciente;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** HU-37 atraso del médico y HU-38 retraso del paciente. */
class RetrasosTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $recepcion;

    private User $medico;

    private paciente $paciente;

    private const LUNES = '2026-09-21';

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['rol' => 'ADMINISTRADOR', 'estado' => 'ACTIVO']);
        $this->recepcion = User::factory()->create(['rol' => 'RECEPCIONISTA', 'estado' => 'ACTIVO']);
        $this->medico = User::factory()->create(['rol' => 'MEDICO', 'estado' => 'ACTIVO']);

        $this->paciente = paciente::create([
            'numero_expediente' => 'PT01-2026',
            'nombre_completo' => 'Paciente de Prueba',
            'fecha_nacimiento' => '1990-05-14',
            'id_registrado_por' => $this->admin->id,
        ]);

        horario_medico::create([
            'id_medico' => $this->medico->id,
            'dia_semana' => 'LUNES',
            'hora_inicio' => '15:00',
            'hora_fin' => '18:30',
        ]);
    }

    /** SQLite devuelve 'H:i' y MariaDB 'H:i:s'; se compara siempre en 'H:i'. */
    private function hora(cita $c, string $campo): string
    {
        return substr((string) $c->refresh()->{$campo}, 0, 5);
    }

    private function crearCita(string $inicio, string $fin, array $extra = []): cita
    {
        return cita::create(array_merge([
            'id_paciente' => $this->paciente->id_paciente,
            'id_medico' => $this->medico->id,
            'fecha' => self::LUNES,
            'hora_inicio' => $inicio,
            'hora_fin' => $fin,
            'id_creado_por' => $this->recepcion->id,
        ], $extra));
    }

    // ---- HU-37 ----

    public function test_desplaza_las_citas_pendientes_conservando_su_duracion(): void
    {
        Sanctum::actingAs($this->recepcion);
        $primera = $this->crearCita('15:00', '15:30');
        $segunda = $this->crearCita('16:00', '16:45');

        $this->patchJson("/api/medicos/{$this->medico->id}/agenda/desplazar", [
            'fecha' => self::LUNES,
            'minutos' => 30,
        ])->assertOk();

        $this->assertSame('15:30', $this->hora($primera, 'hora_inicio'));
        $this->assertSame('16:00', $this->hora($primera, 'hora_fin'));

        // La segunda dura 45 minutos y los conserva.
        $this->assertSame('16:30', $this->hora($segunda, 'hora_inicio'));
        $this->assertSame('17:15', $this->hora($segunda, 'hora_fin'));
    }

    public function test_no_toca_las_citas_ya_atendidas_ni_canceladas(): void
    {
        Sanctum::actingAs($this->recepcion);
        $atendida = $this->crearCita('15:00', '15:30', ['estado' => 'ATENDIDA']);
        $cancelada = $this->crearCita('16:00', '16:30', ['estado' => 'CANCELADA']);

        $this->patchJson("/api/medicos/{$this->medico->id}/agenda/desplazar", [
            'fecha' => self::LUNES,
            'minutos' => 30,
        ])->assertOk();

        $this->assertSame('15:00', $this->hora($atendida, 'hora_inicio'));
        $this->assertSame('16:00', $this->hora($cancelada, 'hora_inicio'));
    }

    public function test_puede_desplazar_solo_a_partir_de_una_hora(): void
    {
        Sanctum::actingAs($this->recepcion);
        $temprana = $this->crearCita('15:00', '15:30');
        $tardia = $this->crearCita('17:00', '17:30');

        $this->patchJson("/api/medicos/{$this->medico->id}/agenda/desplazar", [
            'fecha' => self::LUNES,
            'minutos' => 30,
            'desde_hora' => '16:00',
        ])->assertOk();

        $this->assertSame('15:00', $this->hora($temprana, 'hora_inicio'));
        $this->assertSame('17:30', $this->hora($tardia, 'hora_inicio'));
    }

    public function test_senala_las_citas_que_quedan_fuera_de_la_jornada(): void
    {
        Sanctum::actingAs($this->recepcion);
        $ultima = $this->crearCita('18:00', '18:30');

        $this->patchJson("/api/medicos/{$this->medico->id}/agenda/desplazar", [
            'fecha' => self::LUNES,
            'minutos' => 60,
        ])->assertOk()
            ->assertJsonCount(1, 'data.fueraDeHorario')
            ->assertJsonPath('data.fueraDeHorario.0', $ultima->id_cita);

        // Se desplaza igual: el médico ya va tarde.
        $this->assertSame('19:00', $this->hora($ultima, 'hora_inicio'));
    }

    public function test_el_medico_no_desplaza_la_agenda_de_otro(): void
    {
        $otro = User::factory()->create(['rol' => 'MEDICO', 'estado' => 'ACTIVO']);
        Sanctum::actingAs($otro);

        $this->patchJson("/api/medicos/{$this->medico->id}/agenda/desplazar", [
            'fecha' => self::LUNES,
            'minutos' => 30,
        ])->assertForbidden();
    }

    public function test_rechaza_un_desplazamiento_sin_minutos(): void
    {
        Sanctum::actingAs($this->recepcion);

        $this->patchJson("/api/medicos/{$this->medico->id}/agenda/desplazar", [
            'fecha' => self::LUNES,
        ])->assertStatus(422);
    }

    // ---- HU-38 ----

    public function test_una_cita_futura_no_figura_como_retrasada(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-09-21 14:00'));
        Sanctum::actingAs($this->recepcion);
        $this->crearCita('15:00', '15:30');

        $this->getJson('/api/citas?fecha='.self::LUNES)
            ->assertOk()
            ->assertJsonPath('data.0.minutos_retraso', 0)
            ->assertJsonPath('data.0.retrasada', false);

        Carbon::setTestNow();
    }

    public function test_marca_la_cita_como_retrasada_al_pasar_el_umbral(): void
    {
        // Umbral de 10 minutos: a las 15:15 lleva 15 de retraso.
        config(['clinica.retraso_paciente_min' => 10]);
        Carbon::setTestNow(Carbon::parse('2026-09-21 15:15'));
        Sanctum::actingAs($this->recepcion);
        $this->crearCita('15:00', '15:30');

        $this->getJson('/api/citas?fecha='.self::LUNES)
            ->assertOk()
            ->assertJsonPath('data.0.minutos_retraso', 15)
            ->assertJsonPath('data.0.retrasada', true);

        Carbon::setTestNow();
    }

    public function test_dentro_de_la_tolerancia_aun_no_esta_retrasada(): void
    {
        config(['clinica.retraso_paciente_min' => 10]);
        Carbon::setTestNow(Carbon::parse('2026-09-21 15:05'));
        Sanctum::actingAs($this->recepcion);
        $this->crearCita('15:00', '15:30');

        $this->getJson('/api/citas?fecha='.self::LUNES)
            ->assertOk()
            ->assertJsonPath('data.0.minutos_retraso', 5)
            ->assertJsonPath('data.0.retrasada', false);

        Carbon::setTestNow();
    }

    public function test_un_paciente_que_ya_llego_deja_de_contar_retraso(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-09-21 15:30'));
        Sanctum::actingAs($this->recepcion);
        $this->crearCita('15:00', '15:30', ['estado' => 'EN_ESPERA']);

        $this->getJson('/api/citas?fecha='.self::LUNES)
            ->assertOk()
            ->assertJsonPath('data.0.minutos_retraso', 0)
            ->assertJsonPath('data.0.retrasada', false);

        Carbon::setTestNow();
    }

    public function test_la_cita_retrasada_se_reprograma_el_mismo_dia_a_otra_hora(): void
    {
        Sanctum::actingAs($this->recepcion);
        $cita = $this->crearCita('15:00', '15:30');

        $this->patchJson("/api/citas/{$cita->id_cita}/reprogramar", [
            'fecha' => self::LUNES,
            'hora_inicio' => '17:00',
            'hora_fin' => '17:30',
        ])->assertOk()->assertJsonPath('data.hora_inicio', '17:00');
    }

    public function test_la_cita_retrasada_se_reprograma_para_otro_dia(): void
    {
        Sanctum::actingAs($this->recepcion);
        $cita = $this->crearCita('15:00', '15:30');

        // El lunes siguiente.
        $this->patchJson("/api/citas/{$cita->id_cita}/reprogramar", [
            'fecha' => '2026-09-28',
            'hora_inicio' => '15:00',
            'hora_fin' => '15:30',
        ])->assertOk()->assertJsonPath('data.fecha', '2026-09-28');
    }
}
