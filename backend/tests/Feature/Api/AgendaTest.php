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

/** EPIC-04 — horarios, bloqueos y citas. */
class AgendaTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $recepcion;

    private User $medico;

    private paciente $paciente;

    /** Lunes, para que coincida con el horario que se registra abajo. */
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

    /** @return array<string, mixed> */
    private function datosCita(array $sobrescribir = []): array
    {
        return array_merge([
            'paciente_id' => $this->paciente->id_paciente,
            'medico_id' => $this->medico->id,
            'fecha' => self::LUNES,
            'hora_inicio' => '15:00',
            'hora_fin' => '15:30',
        ], $sobrescribir);
    }

    // ---- HU-34 horarios ----

    public function test_el_administrador_configura_el_horario_de_un_medico(): void
    {
        Sanctum::actingAs($this->admin);

        $this->postJson("/api/medicos/{$this->medico->id}/horarios", [
            'dia_semana' => 'MARTES',
            'hora_inicio' => '08:00',
            'hora_fin' => '12:00',
        ])->assertCreated()->assertJsonPath('data.dia_semana', 'MARTES');
    }

    public function test_rechaza_un_tramo_que_se_solapa_con_otro_del_mismo_dia(): void
    {
        Sanctum::actingAs($this->admin);

        $this->postJson("/api/medicos/{$this->medico->id}/horarios", [
            'dia_semana' => 'LUNES',
            'hora_inicio' => '17:00',
            'hora_fin' => '19:00',
        ])->assertStatus(422);
    }

    public function test_el_administrador_guarda_la_semana_completa_y_recibe_el_horario_nuevo(): void
    {
        Sanctum::actingAs($this->admin);

        $this->putJson("/api/medicos/{$this->medico->id}/horarios", ['horarios' => [
            ['dia_semana' => 'SABADO', 'hora_inicio' => '08:00', 'hora_fin' => '12:00'],
            ['dia_semana' => 'MARTES', 'hora_inicio' => '15:00', 'hora_fin' => '18:30'],
        ]])
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.dia_semana', 'MARTES')
            ->assertJsonPath('data.1.dia_semana', 'SABADO');

        $this->assertDatabaseMissing('horario_medico', ['id_medico' => $this->medico->id, 'dia_semana' => 'LUNES']);
    }

    public function test_la_recepcionista_no_configura_horarios(): void
    {
        Sanctum::actingAs($this->recepcion);

        $this->postJson("/api/medicos/{$this->medico->id}/horarios", [
            'dia_semana' => 'MARTES',
            'hora_inicio' => '08:00',
            'hora_fin' => '12:00',
        ])->assertForbidden();
    }

    public function test_el_medico_puede_consultar_su_propio_horario(): void
    {
        Sanctum::actingAs($this->medico);

        $this->getJson("/api/medicos/{$this->medico->id}/horarios")
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(1, 'data');
    }

    public function test_el_medico_no_puede_consultar_el_horario_de_otro_medico(): void
    {
        Sanctum::actingAs($this->medico);
        $otro = User::factory()->create(['rol' => 'MEDICO', 'estado' => 'ACTIVO']);

        $this->getJson("/api/medicos/{$otro->id}/horarios")
            ->assertForbidden();
    }

    // ---- HU-12 disponibilidad ----

    public function test_la_disponibilidad_respeta_el_horario_configurado(): void
    {
        Sanctum::actingAs($this->recepcion);

        // 15:00 a 18:30 en bloques de 30 minutos = 7 bloques.
        $this->getJson("/api/agenda/disponibilidad?medico_id={$this->medico->id}&fecha=".self::LUNES)
            ->assertOk()
            ->assertJsonPath('data.bloqueado', false)
            ->assertJsonCount(7, 'data.bloques');
    }

    public function test_un_dia_sin_horario_no_ofrece_bloques(): void
    {
        Sanctum::actingAs($this->recepcion);

        // Domingo.
        $this->getJson("/api/agenda/disponibilidad?medico_id={$this->medico->id}&fecha=2026-09-20")
            ->assertOk()
            ->assertJsonCount(0, 'data.bloques');
    }

    public function test_una_cita_agendada_deja_de_ofrecerse_como_bloque(): void
    {
        Sanctum::actingAs($this->recepcion);
        $this->postJson('/api/citas', $this->datosCita())->assertCreated();

        $this->getJson("/api/agenda/disponibilidad?medico_id={$this->medico->id}&fecha=".self::LUNES)
            ->assertOk()
            ->assertJsonCount(6, 'data.bloques');
    }

    // ---- HU-11 agendar ----

    public function test_la_recepcionista_agenda_una_cita(): void
    {
        Sanctum::actingAs($this->recepcion);

        $this->postJson('/api/citas', $this->datosCita())
            ->assertCreated()
            ->assertJsonPath('data.tipo_cita', 'REGULAR')
            ->assertJsonPath('data.estado', 'AGENDADA')
            ->assertJsonPath('data.pacienteNombre', 'Paciente de Prueba');
    }

    public function test_no_permite_dos_citas_regulares_en_el_mismo_bloque(): void
    {
        Sanctum::actingAs($this->recepcion);
        $this->postJson('/api/citas', $this->datosCita())->assertCreated();

        $this->postJson('/api/citas', $this->datosCita())->assertStatus(409);

        $this->assertDatabaseCount('cita', 1);
    }

    public function test_rechaza_un_solapamiento_parcial(): void
    {
        Sanctum::actingAs($this->recepcion);
        $this->postJson('/api/citas', $this->datosCita())->assertCreated();

        $this->postJson('/api/citas', $this->datosCita([
            'hora_inicio' => '15:15',
            'hora_fin' => '15:45',
        ]))->assertStatus(409);
    }

    public function test_permite_una_cita_contigua_sin_solape(): void
    {
        Sanctum::actingAs($this->recepcion);
        $this->postJson('/api/citas', $this->datosCita())->assertCreated();

        $this->postJson('/api/citas', $this->datosCita([
            'hora_inicio' => '15:30',
            'hora_fin' => '16:00',
        ]))->assertCreated();
    }

    public function test_rechaza_una_cita_fuera_del_horario_del_medico(): void
    {
        Sanctum::actingAs($this->recepcion);

        $this->postJson('/api/citas', $this->datosCita([
            'hora_inicio' => '09:00',
            'hora_fin' => '09:30',
        ]))->assertStatus(409);
    }

    // ---- HU-36 emergencia y sobrecupo ----

    public function test_la_emergencia_puede_ocupar_un_bloque_ya_tomado(): void
    {
        Sanctum::actingAs($this->recepcion);
        $this->postJson('/api/citas', $this->datosCita())->assertCreated();

        $this->postJson('/api/citas', $this->datosCita(['tipo_cita' => 'EMERGENCIA']))
            ->assertCreated();

        $this->assertDatabaseCount('cita', 2);
    }

    public function test_el_sobrecupo_ignora_el_horario_configurado(): void
    {
        Sanctum::actingAs($this->recepcion);

        $this->postJson('/api/citas', $this->datosCita([
            'tipo_cita' => 'SOBRECUPO',
            'hora_inicio' => '20:00',
            'hora_fin' => '20:30',
        ]))->assertCreated();
    }

    public function test_el_sobrecupo_va_despues_de_la_ultima_cita_y_nunca_encima_de_otra(): void
    {
        Sanctum::actingAs($this->recepcion);
        $this->postJson('/api/citas', $this->datosCita(['hora_inicio' => '15:00', 'hora_fin' => '15:30']))->assertCreated();
        $this->postJson('/api/citas', $this->datosCita(['hora_inicio' => '16:00', 'hora_fin' => '16:30']))->assertCreated();

        // Encima de una cita, o antes de la última, no.
        $this->postJson('/api/citas', $this->datosCita(['tipo_cita' => 'SOBRECUPO', 'hora_inicio' => '15:00', 'hora_fin' => '15:30']))
            ->assertStatus(409);
        $this->postJson('/api/citas', $this->datosCita(['tipo_cita' => 'SOBRECUPO', 'hora_inicio' => '15:30', 'hora_fin' => '16:00']))
            ->assertStatus(409)
            ->assertJsonPath('message', fn ($m) => str_contains($m, '16:30'));

        // Justo al terminar la última, sí, aunque sea fuera del horario del médico.
        $this->postJson('/api/citas', $this->datosCita(['tipo_cita' => 'SOBRECUPO', 'hora_inicio' => '16:30', 'hora_fin' => '17:00']))
            ->assertCreated();
        $this->postJson('/api/citas', $this->datosCita(['tipo_cita' => 'SOBRECUPO', 'hora_inicio' => '19:00', 'hora_fin' => '19:30']))
            ->assertCreated();

        // La disponibilidad dice desde qué hora se puede dar un sobrecupo.
        $this->getJson("/api/agenda/disponibilidad?medico_id={$this->medico->id}&fecha=".self::LUNES)
            ->assertJsonPath('data.ultimaCitaFin', '19:30');
    }

    public function test_una_emergencia_corre_sola_las_citas_que_chocan_con_ella_y_nada_mas(): void
    {
        Sanctum::actingAs($this->recepcion);
        $a = $this->postJson('/api/citas', $this->datosCita(['hora_inicio' => '15:00', 'hora_fin' => '15:30']))->json('data.id');
        $b = $this->postJson('/api/citas', $this->datosCita(['hora_inicio' => '15:30', 'hora_fin' => '16:00']))->json('data.id');
        $libre = $this->postJson('/api/citas', $this->datosCita(['hora_inicio' => '17:00', 'hora_fin' => '17:30']))->json('data.id');

        $r = $this->postJson('/api/citas', $this->datosCita(['tipo_cita' => 'EMERGENCIA', 'hora_inicio' => '15:00', 'hora_fin' => '15:30']))
            ->assertCreated();
        $emergencia = $r->json('data.id');

        // Las que chocaban se corren detrás de la emergencia, en orden; la libre y la emergencia no se tocan.
        $this->assertSame('15:30', substr(cita::find($a)->hora_inicio, 0, 5));
        $this->assertSame('16:00', substr(cita::find($b)->hora_inicio, 0, 5));
        $this->assertSame('17:00', substr(cita::find($libre)->hora_inicio, 0, 5));
        $this->assertSame('15:00', substr(cita::find($emergencia)->hora_inicio, 0, 5));

        // La respuesta cuenta qué se corrió, con la hora de antes y la de ahora.
        $this->assertCount(2, $r->json('data.corrida.plan'));
        $this->assertSame('15:00', $r->json('data.corrida.plan.0.hora_inicio'));
        $this->assertSame('15:30', $r->json('data.corrida.plan.0.nuevo_inicio'));
        $this->assertSame([], $r->json('data.corrida.sinEspacio'));

        // Queda anotado por qué se corrió y a qué hora estaba; la libre y la emergencia no llevan marca.
        $this->assertSame('EMERGENCIA', cita::find($a)->corrida_por);
        $this->assertSame('15:00', substr(cita::find($a)->hora_inicio_original, 0, 5));
        $this->assertNull(cita::find($libre)->corrida_por);
        $this->assertNull(cita::find($emergencia)->corrida_por);

        // Si recepción la reprograma a mano, deja de figurar como corrida.
        $this->patchJson("/api/citas/{$a}/reprogramar", ['fecha' => self::LUNES, 'hora_inicio' => '18:00', 'hora_fin' => '18:30'])->assertOk();
        $this->assertNull(cita::find($a)->corrida_por);
        $this->assertNull(cita::find($a)->hora_inicio_original);
    }

    public function test_una_emergencia_sin_choques_no_corre_nada_y_las_regulares_no_corren_a_nadie(): void
    {
        Sanctum::actingAs($this->recepcion);
        $regular = $this->postJson('/api/citas', $this->datosCita(['hora_inicio' => '15:00', 'hora_fin' => '15:30']))
            ->assertCreated();
        $this->assertNull($regular->json('data.corrida'));

        $emergencia = $this->postJson('/api/citas', $this->datosCita(['tipo_cita' => 'EMERGENCIA', 'hora_inicio' => '16:00', 'hora_fin' => '16:30']))
            ->assertCreated();
        $this->assertSame([], $emergencia->json('data.corrida.plan'));
        $this->assertSame('15:00', substr(cita::find($regular->json('data.id'))->hora_inicio, 0, 5));
    }

    public function test_la_emergencia_senala_las_citas_que_no_caben_antes_de_las_23(): void
    {
        Sanctum::actingAs($this->recepcion);
        \App\Models\horario_medico::create([
            'id_medico' => $this->medico->id,
            'dia_semana' => 'LUNES',
            'hora_inicio' => '19:00',
            'hora_fin' => '23:00',
        ]);
        $primera = $this->postJson('/api/citas', $this->datosCita(['hora_inicio' => '22:00', 'hora_fin' => '22:30']))->json('data.id');
        $segunda = $this->postJson('/api/citas', $this->datosCita(['hora_inicio' => '22:30', 'hora_fin' => '23:00']))->json('data.id');

        $r = $this->postJson('/api/citas', $this->datosCita(['tipo_cita' => 'EMERGENCIA', 'hora_inicio' => '22:00', 'hora_fin' => '22:30']))
            ->assertCreated();

        // La primera cabe (22:30-23:00); la segunda pasaría de las 23:00: se queda donde estaba, señalada.
        $this->assertSame('22:30', substr(cita::find($primera)->hora_inicio, 0, 5));
        $this->assertSame('22:30', substr(cita::find($segunda)->hora_inicio, 0, 5));
        $this->assertCount(1, $r->json('data.corrida.plan'));
        $this->assertSame([$segunda], $r->json('data.corrida.sinEspacio'));
        $this->assertSame($segunda, $r->json('data.corrida.citasSinEspacio.0.id'));
    }

    public function test_el_sobrecupo_no_puede_terminar_despues_de_las_23(): void
    {
        Sanctum::actingAs($this->recepcion);

        $this->postJson('/api/citas', $this->datosCita(['tipo_cita' => 'SOBRECUPO', 'hora_inicio' => '22:45', 'hora_fin' => '23:15']))
            ->assertStatus(409);
    }

    public function test_la_emergencia_no_consume_disponibilidad(): void
    {
        Sanctum::actingAs($this->recepcion);
        $this->postJson('/api/citas', $this->datosCita(['tipo_cita' => 'EMERGENCIA']))->assertCreated();

        $this->getJson("/api/agenda/disponibilidad?medico_id={$this->medico->id}&fecha=".self::LUNES)
            ->assertJsonCount(7, 'data.bloques');
    }

    // ---- HU-13 y HU-14 cancelar y reprogramar ----

    public function test_cancelar_libera_el_bloque(): void
    {
        Sanctum::actingAs($this->recepcion);
        $id = $this->postJson('/api/citas', $this->datosCita())->json('data.id');

        $this->patchJson("/api/citas/{$id}/cancelar", ['motivo_cancelacion' => 'El paciente avisó'])
            ->assertOk()
            ->assertJsonPath('data.estado', 'CANCELADA');

        $this->postJson('/api/citas', $this->datosCita())->assertCreated();
    }

    public function test_reprogramar_libera_el_bloque_original(): void
    {
        Sanctum::actingAs($this->recepcion);
        $id = $this->postJson('/api/citas', $this->datosCita())->json('data.id');

        $this->patchJson("/api/citas/{$id}/reprogramar", [
            'fecha' => self::LUNES,
            'hora_inicio' => '16:00',
            'hora_fin' => '16:30',
        ])->assertOk()->assertJsonPath('data.hora_inicio', '16:00');

        // El bloque de las 15:00 vuelve a estar libre.
        $this->postJson('/api/citas', $this->datosCita())->assertCreated();
    }

    public function test_no_reprograma_sobre_un_bloque_ocupado(): void
    {
        Sanctum::actingAs($this->recepcion);
        $id = $this->postJson('/api/citas', $this->datosCita())->json('data.id');
        $this->postJson('/api/citas', $this->datosCita([
            'hora_inicio' => '16:00', 'hora_fin' => '16:30',
        ]))->assertCreated();

        $this->patchJson("/api/citas/{$id}/reprogramar", [
            'fecha' => self::LUNES,
            'hora_inicio' => '16:00',
            'hora_fin' => '16:30',
        ])->assertStatus(409);
    }

    public function test_reprogramar_permite_reasignar_la_cita_a_otro_medico_disponible(): void
    {
        Sanctum::actingAs($this->recepcion);

        $otroMedico = User::factory()->create(['rol' => 'MEDICO', 'estado' => 'ACTIVO']);
        horario_medico::create([
            'id_medico' => $otroMedico->id,
            'dia_semana' => 'LUNES',
            'hora_inicio' => '15:00',
            'hora_fin' => '18:30',
        ]);

        $id = $this->postJson('/api/citas', $this->datosCita())->json('data.id');

        // Reprogramar reasignando al otro médico en su bloque de las 16:00
        $this->patchJson("/api/citas/{$id}/reprogramar", [
            'fecha' => self::LUNES,
            'hora_inicio' => '16:00',
            'hora_fin' => '16:30',
            'medico_id' => $otroMedico->id,
        ])->assertOk()
            ->assertJsonPath('data.medico_id', $otroMedico->id)
            ->assertJsonPath('data.hora_inicio', '16:00');

        // El bloque original del primer médico a las 15:00 queda liberado
        $this->postJson('/api/citas', $this->datosCita())->assertCreated();
    }

    // ---- HU-35 bloqueo de agenda ----

    public function test_bloquear_un_dia_deja_la_agenda_sin_bloques(): void
    {
        Sanctum::actingAs($this->recepcion);

        $this->postJson('/api/bloqueos', [
            'medico_id' => $this->medico->id,
            'fecha' => self::LUNES,
            'motivo' => 'Capacitación',
        ])->assertCreated();

        $this->getJson("/api/agenda/disponibilidad?medico_id={$this->medico->id}&fecha=".self::LUNES)
            ->assertJsonPath('data.bloqueado', true)
            ->assertJsonCount(0, 'data.bloques');
    }

    public function test_las_citas_de_un_dia_bloqueado_no_desaparecen(): void
    {
        Sanctum::actingAs($this->recepcion);
        $this->postJson('/api/citas', $this->datosCita())->assertCreated();

        $this->postJson('/api/bloqueos', [
            'medico_id' => $this->medico->id,
            'fecha' => self::LUNES,
            'motivo' => 'Emergencia familiar',
        ])->assertCreated()->assertJsonCount(1, 'data.citasAfectadas');

        $this->assertDatabaseCount('cita', 1);
    }

    public function test_no_admite_dos_bloqueos_el_mismo_dia(): void
    {
        Sanctum::actingAs($this->recepcion);
        $datos = ['medico_id' => $this->medico->id, 'fecha' => self::LUNES, 'motivo' => 'x'];

        $this->postJson('/api/bloqueos', $datos)->assertCreated();
        $this->postJson('/api/bloqueos', $datos)->assertStatus(409);
    }

    // ---- HU-43 orden de atención ----

    public function test_el_orden_lo_marca_la_llegada_y_no_la_hora_agendada(): void
    {
        Sanctum::actingAs($this->recepcion);

        $temprana = $this->postJson('/api/citas', $this->datosCita())->json('data.id');
        $tardia = $this->postJson('/api/citas', $this->datosCita([
            'hora_inicio' => '16:00', 'hora_fin' => '16:30',
        ]))->json('data.id');

        // Llega primero quien tenía la cita más tarde.
        $this->patchJson("/api/citas/{$tardia}/llegada")->assertOk()
            ->assertJsonPath('data.orden_atencion', 1)
            ->assertJsonPath('data.estado', 'EN_ESPERA');

        $this->patchJson("/api/citas/{$temprana}/llegada")->assertOk()
            ->assertJsonPath('data.orden_atencion', 2);
    }

    public function test_un_paciente_retrasado_se_manda_al_final(): void
    {
        Sanctum::actingAs($this->recepcion);

        $primera = $this->postJson('/api/citas', $this->datosCita())->json('data.id');
        $segunda = $this->postJson('/api/citas', $this->datosCita([
            'hora_inicio' => '16:00', 'hora_fin' => '16:30',
        ]))->json('data.id');

        $this->patchJson("/api/citas/{$primera}/llegada")->assertOk();
        $this->patchJson("/api/citas/{$segunda}/llegada")->assertOk();

        $this->patchJson("/api/citas/{$primera}/mover-al-final")
            ->assertOk()
            ->assertJsonPath('data.orden_atencion', 3);
    }

    // ---- HU-15 y HU-16 agenda del médico ----

    public function test_el_medico_solo_ve_su_propia_agenda(): void
    {
        Sanctum::actingAs($this->recepcion);
        $this->postJson('/api/citas', $this->datosCita())->assertCreated();

        $otro = User::factory()->create(['rol' => 'MEDICO', 'estado' => 'ACTIVO']);
        $this->app['auth']->forgetGuards();
        Sanctum::actingAs($otro);

        $this->getJson('/api/citas')->assertOk()->assertJsonCount(0, 'data');

        $this->app['auth']->forgetGuards();
        Sanctum::actingAs($this->medico);
        $this->getJson('/api/citas')->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_el_medico_no_agenda_en_la_agenda_de_otro(): void
    {
        $otro = User::factory()->create(['rol' => 'MEDICO', 'estado' => 'ACTIVO']);
        Sanctum::actingAs($otro);

        $this->postJson('/api/citas', $this->datosCita())->assertForbidden();
    }

    public function test_el_medico_agenda_en_su_propia_agenda(): void
    {
        Sanctum::actingAs($this->medico);

        $this->postJson('/api/citas', $this->datosCita())->assertCreated();
    }

    public function test_el_medico_no_puede_agendar_con_especialidad_no_asignada(): void
    {
        Sanctum::actingAs($this->medico);
        $otraEsp = \App\Models\Especialidad::create(['nombre' => 'Oftalmología', 'estado' => 'ACTIVA']);

        $this->postJson('/api/citas', $this->datosCita([
            'especialidad_id' => $otraEsp->id,
        ]))->assertStatus(422)
            ->assertJsonPath('message', 'Solo puedes agendar citas para tus propias especialidades asignadas.');
    }

    public function test_el_medico_puede_agendar_con_su_propia_especialidad(): void
    {
        Sanctum::actingAs($this->medico);
        $miEsp = \App\Models\Especialidad::create(['nombre' => 'Medicina Interna', 'estado' => 'ACTIVA']);
        $this->medico->especialidades()->attach($miEsp->id);

        $this->postJson('/api/citas', $this->datosCita([
            'especialidad_id' => $miEsp->id,
        ]))->assertCreated()
            ->assertJsonPath('data.especialidad_id', $miEsp->id);
    }

    public function test_no_agenda_con_un_medico_inactivo(): void
    {
        $inactivo = User::factory()->create(['rol' => 'MEDICO', 'estado' => 'INACTIVO']);
        Sanctum::actingAs($this->recepcion);

        $this->postJson('/api/citas', $this->datosCita(['medico_id' => $inactivo->id]))
            ->assertStatus(422);
    }

    public function test_agendar_requiere_autenticacion(): void
    {
        $this->postJson('/api/citas', $this->datosCita())->assertUnauthorized();
    }

    public function test_el_estado_cancelada_no_ocupa_el_bloque(): void
    {
        Sanctum::actingAs($this->recepcion);
        $id = $this->postJson('/api/citas', $this->datosCita())->json('data.id');
        $this->patchJson("/api/citas/{$id}/cancelar", ['motivo_cancelacion' => 'x'])->assertOk();

        $this->assertSame('CANCELADA', cita::find($id)->estado);

        $this->getJson("/api/agenda/disponibilidad?medico_id={$this->medico->id}&fecha=".self::LUNES)
            ->assertJsonCount(7, 'data.bloques');
    }

    public function test_disponibilidad_hoy_omite_bloques_que_ya_pasaron(): void
    {
        Sanctum::actingAs($this->recepcion);

        // Si hoy es lunes 2026-09-21 a las 16:15
        Carbon::setTestNow(Carbon::parse('2026-09-21 16:15'));

        // Horario médico: 15:00 a 18:30 (bloques: 15:00, 15:30, 16:00, 16:30, 17:00, 17:30, 18:00)
        // A las 16:15, los bloques de 15:00, 15:30 y 16:00 ya pasaron.
        // Solo deben quedar disponibles a partir de 16:30 (4 bloques: 16:30, 17:00, 17:30, 18:00).
        $res = $this->getJson("/api/agenda/disponibilidad?medico_id={$this->medico->id}&fecha=2026-09-21")
            ->assertOk()
            ->assertJsonCount(4, 'data.bloques');

        $this->assertSame('16:30', $res->json('data.bloques.0.hora_inicio'));

        Carbon::setTestNow();
    }

    public function test_rechaza_agendar_cita_regular_en_hora_pasada_para_el_dia_de_hoy(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-09-21 17:00'));
        Sanctum::actingAs($this->recepcion);

        // Intentar agendar a las 15:00 de hoy cuando ya son las 17:00
        $this->postJson('/api/citas', $this->datosCita([
            'fecha' => '2026-09-21',
            'hora_inicio' => '15:00',
            'hora_fin' => '15:30',
        ]))->assertStatus(409);

        // Sí permite agendar a las 17:30 (futuro de hoy)
        $this->postJson('/api/citas', $this->datosCita([
            'fecha' => '2026-09-21',
            'hora_inicio' => '17:30',
            'hora_fin' => '18:00',
        ]))->assertCreated();

        Carbon::setTestNow();
    }
}
