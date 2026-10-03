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

/** HU-35 — bloqueo parcial, historial y citas que quedan dentro del bloqueo. */
class BloqueoParcialTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $recepcion;

    private User $medico;

    private paciente $paciente;

    /** Lunes futuro, para que coincida con el horario y no caiga en el historial. */
    private string $lunes;

    protected function setUp(): void
    {
        parent::setUp();

        $this->lunes = now()->next('Monday')->addWeek()->toDateString();

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
            'fecha' => $this->lunes,
            'hora_inicio' => $inicio,
            'hora_fin' => $fin,
            'id_creado_por' => $this->recepcion->id,
        ], $extra));
    }

    /** @return array<string, mixed> */
    private function bloqueo(array $sobrescribir = []): array
    {
        return array_merge([
            'medico_id' => $this->medico->id,
            'fecha' => $this->lunes,
            'hora_inicio' => '16:00',
            'hora_fin' => '17:00',
            'motivo' => 'Llega tarde por trámite',
        ], $sobrescribir);
    }

    // ---- crear ----

    public function test_registra_un_bloqueo_parcial(): void
    {
        Sanctum::actingAs($this->recepcion);

        $this->postJson('/api/bloqueos', $this->bloqueo())
            ->assertCreated()
            ->assertJsonPath('data.bloqueo.tipo_bloqueo', 'PARCIAL')
            ->assertJsonPath('data.bloqueo.hora_inicio', '16:00')
            ->assertJsonPath('data.bloqueo.hora_fin', '17:00')
            ->assertJsonPath('data.bloqueo.creadoPorNombre', $this->recepcion->nombre_completo);
    }

    public function test_sin_horas_el_bloqueo_sigue_siendo_de_dia_completo(): void
    {
        Sanctum::actingAs($this->recepcion);

        $this->postJson('/api/bloqueos', [
            'medico_id' => $this->medico->id,
            'fecha' => $this->lunes,
            'motivo' => 'Congreso',
        ])->assertCreated()
            ->assertJsonPath('data.bloqueo.tipo_bloqueo', 'COMPLETO')
            ->assertJsonPath('data.bloqueo.hora_inicio', null);
    }

    public function test_exige_las_dos_horas_y_que_el_fin_sea_posterior(): void
    {
        Sanctum::actingAs($this->recepcion);

        $this->postJson('/api/bloqueos', $this->bloqueo(['hora_fin' => null]))
            ->assertStatus(422)->assertJsonValidationErrors('hora_fin');

        $this->postJson('/api/bloqueos', $this->bloqueo(['hora_inicio' => null]))
            ->assertStatus(422)->assertJsonValidationErrors('hora_inicio');

        $this->postJson('/api/bloqueos', $this->bloqueo(['hora_inicio' => '17:00', 'hora_fin' => '16:00']))
            ->assertStatus(422)->assertJsonValidationErrors('hora_fin');
    }

    public function test_admite_varios_bloqueos_parciales_el_mismo_dia(): void
    {
        Sanctum::actingAs($this->recepcion);

        $this->postJson('/api/bloqueos', $this->bloqueo())->assertCreated();
        $this->postJson('/api/bloqueos', $this->bloqueo(['hora_inicio' => '17:00', 'hora_fin' => '18:00']))
            ->assertCreated();

        $this->assertDatabaseCount('bloqueo_agenda', 2);
    }

    public function test_rechaza_bloqueos_que_se_traslapan(): void
    {
        Sanctum::actingAs($this->recepcion);
        $this->postJson('/api/bloqueos', $this->bloqueo())->assertCreated();

        // Parcial sobre parcial.
        $this->postJson('/api/bloqueos', $this->bloqueo(['hora_inicio' => '16:30', 'hora_fin' => '17:30']))
            ->assertStatus(409);

        // Día completo sobre un parcial.
        $this->postJson('/api/bloqueos', [
            'medico_id' => $this->medico->id,
            'fecha' => $this->lunes,
            'motivo' => 'x',
        ])->assertStatus(409);

        $this->assertDatabaseCount('bloqueo_agenda', 1);
    }

    public function test_un_dia_completo_impide_agregar_un_parcial(): void
    {
        Sanctum::actingAs($this->recepcion);
        $this->postJson('/api/bloqueos', [
            'medico_id' => $this->medico->id,
            'fecha' => $this->lunes,
            'motivo' => 'x',
        ])->assertCreated();

        $this->postJson('/api/bloqueos', $this->bloqueo())->assertStatus(409);
    }

    public function test_dos_parciales_contiguos_no_se_consideran_traslape(): void
    {
        Sanctum::actingAs($this->recepcion);
        $this->postJson('/api/bloqueos', $this->bloqueo())->assertCreated();

        $this->postJson('/api/bloqueos', $this->bloqueo(['hora_inicio' => '15:00', 'hora_fin' => '16:00']))
            ->assertCreated();
    }

    // ---- disponibilidad ----

    public function test_un_bloqueo_parcial_quita_solo_esos_bloques(): void
    {
        Sanctum::actingAs($this->recepcion);
        $this->postJson('/api/bloqueos', $this->bloqueo())->assertCreated();

        $respuesta = $this->getJson("/api/agenda/disponibilidad?medico_id={$this->medico->id}&fecha={$this->lunes}")
            ->assertOk()
            ->assertJsonPath('data.bloqueado', false);

        $inicios = array_column($respuesta->json('data.bloques'), 'hora_inicio');

        $this->assertContains('15:00', $inicios);
        $this->assertContains('15:30', $inicios);
        $this->assertNotContains('16:00', $inicios);
        $this->assertNotContains('16:30', $inicios);
        $this->assertContains('17:00', $inicios);
    }

    public function test_no_se_agenda_ni_reprograma_dentro_de_un_bloqueo_parcial(): void
    {
        Sanctum::actingAs($this->recepcion);
        $this->postJson('/api/bloqueos', $this->bloqueo())->assertCreated();

        $datos = [
            'paciente_id' => $this->paciente->id_paciente,
            'medico_id' => $this->medico->id,
            'fecha' => $this->lunes,
            'hora_inicio' => '16:00',
            'hora_fin' => '16:30',
        ];

        $this->postJson('/api/citas', $datos)->assertStatus(409);
        $this->postJson('/api/citas', array_merge($datos, ['hora_inicio' => '15:00', 'hora_fin' => '15:30']))
            ->assertCreated();

        $id = $this->crearCita('17:30', '18:00')->id_cita;
        $this->patchJson("/api/citas/{$id}/reprogramar", [
            'fecha' => $this->lunes,
            'hora_inicio' => '16:30',
            'hora_fin' => '17:00',
        ])->assertStatus(409);
    }

    public function test_una_emergencia_puede_agendarse_dentro_del_bloqueo_parcial(): void
    {
        Sanctum::actingAs($this->recepcion);
        $this->postJson('/api/bloqueos', $this->bloqueo())->assertCreated();

        $this->postJson('/api/citas', [
            'paciente_id' => $this->paciente->id_paciente,
            'medico_id' => $this->medico->id,
            'fecha' => $this->lunes,
            'hora_inicio' => '16:00',
            'hora_fin' => '16:30',
            'tipo_cita' => 'EMERGENCIA',
        ])->assertCreated();
    }

    // ---- citas afectadas ----

    public function test_el_bloqueo_devuelve_solo_las_citas_que_quedaron_dentro(): void
    {
        Sanctum::actingAs($this->recepcion);
        $this->crearCita('15:00', '15:30');
        $dentro = $this->crearCita('16:00', '16:30');
        $this->crearCita('16:30', '17:00', ['estado' => 'CANCELADA']);
        $this->crearCita('17:00', '17:30');

        $this->postJson('/api/bloqueos', $this->bloqueo())
            ->assertCreated()
            ->assertJsonCount(1, 'data.citasAfectadas')
            ->assertJsonPath('data.citasAfectadas.0.id', $dentro->id_cita);

        // Nada se cancela ni se mueve solo.
        $this->assertSame('16:00', $this->hora($dentro, 'hora_inicio'));
        $this->assertSame('AGENDADA', $dentro->refresh()->estado);
    }

    public function test_una_cita_que_se_asoma_al_bloqueo_tambien_cuenta(): void
    {
        Sanctum::actingAs($this->recepcion);
        $this->crearCita('15:45', '16:15');

        $this->postJson('/api/bloqueos', $this->bloqueo())
            ->assertCreated()
            ->assertJsonCount(1, 'data.citasAfectadas');
    }

    public function test_un_dia_completo_afecta_todas_las_citas_pendientes_del_dia(): void
    {
        Sanctum::actingAs($this->recepcion);
        $this->crearCita('15:00', '15:30');
        $this->crearCita('16:00', '16:30', ['estado' => 'EN_ESPERA']);
        $this->crearCita('17:00', '17:30', ['estado' => 'ATENDIDA']);

        $this->postJson('/api/bloqueos', [
            'medico_id' => $this->medico->id,
            'fecha' => $this->lunes,
            'motivo' => 'Congreso',
        ])->assertCreated()->assertJsonCount(2, 'data.citasAfectadas');
    }

    public function test_el_listado_de_citas_marca_las_afectadas(): void
    {
        Sanctum::actingAs($this->recepcion);
        $libre = $this->crearCita('15:00', '15:30');
        $afectada = $this->crearCita('16:00', '16:30');
        $this->postJson('/api/bloqueos', $this->bloqueo())->assertCreated();

        $citas = collect($this->getJson("/api/citas?fecha={$this->lunes}")->assertOk()->json('data'))
            ->keyBy('id');

        $this->assertFalse($citas[$libre->id_cita]['afectada_por_bloqueo']);
        $this->assertNull($citas[$libre->id_cita]['bloqueo']);

        $this->assertTrue($citas[$afectada->id_cita]['afectada_por_bloqueo']);
        $this->assertSame('PARCIAL', $citas[$afectada->id_cita]['bloqueo']['tipo_bloqueo']);
        $this->assertSame('16:00', $citas[$afectada->id_cita]['bloqueo']['hora_inicio']);
    }

    public function test_el_medico_ve_en_su_agenda_las_citas_afectadas(): void
    {
        $afectada = $this->crearCita('16:00', '16:30');
        Sanctum::actingAs($this->recepcion);
        $this->postJson('/api/bloqueos', $this->bloqueo())->assertCreated();

        Sanctum::actingAs($this->medico);
        $this->getJson("/api/citas?fecha={$this->lunes}")
            ->assertOk()
            ->assertJsonPath('data.0.id', $afectada->id_cita)
            ->assertJsonPath('data.0.afectada_por_bloqueo', true);
    }

    public function test_lista_las_citas_afectadas_de_un_bloqueo(): void
    {
        Sanctum::actingAs($this->recepcion);
        $this->crearCita('15:00', '15:30');
        $dentro = $this->crearCita('16:30', '17:00');
        $id = $this->postJson('/api/bloqueos', $this->bloqueo())->json('data.bloqueo.id');

        $this->getJson("/api/bloqueos/{$id}/citas-afectadas")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $dentro->id_cita);
    }

    // ---- correr citas ----

    /** Crea el bloqueo parcial y devuelve su id. */
    private function bloquear(string $inicio = '16:00', string $fin = '17:00'): string
    {
        return $this->postJson('/api/bloqueos', $this->bloqueo(['hora_inicio' => $inicio, 'hora_fin' => $fin]))
            ->assertCreated()
            ->json('data.bloqueo.id');
    }

    public function test_solo_corre_la_cita_afectada_y_no_la_que_ya_estaba_libre(): void
    {
        Sanctum::actingAs($this->recepcion);
        $antes = $this->crearCita('15:00', '15:30');
        $afectada = $this->crearCita('16:00', '16:30');
        $lejana = $this->crearCita('17:30', '18:00');
        $id = $this->bloquear();

        $this->patchJson("/api/bloqueos/{$id}/correr-citas")
            ->assertOk()
            ->assertJsonCount(1, 'data.citas')
            ->assertJsonPath('data.fueraDeHorario', []);

        $this->assertSame('15:00', $this->hora($antes, 'hora_inicio'));
        $this->assertSame('17:00', $this->hora($afectada, 'hora_inicio'));
        $this->assertSame('17:30', $this->hora($afectada, 'hora_fin'));
        $this->assertSame('17:30', $this->hora($lejana, 'hora_inicio'));
        $this->assertSame('18:00', $this->hora($lejana, 'hora_fin'));

        $this->getJson("/api/bloqueos/{$id}/citas-afectadas")->assertJsonCount(0, 'data');
    }

    public function test_dos_afectadas_quedan_una_detras_de_otra_y_empujan_en_cadena(): void
    {
        Sanctum::actingAs($this->recepcion);
        $primera = $this->crearCita('16:00', '16:30');
        $segunda = $this->crearCita('16:30', '17:00');
        $choca = $this->crearCita('17:00', '17:30');
        $id = $this->bloquear();

        $this->patchJson("/api/bloqueos/{$id}/correr-citas")
            ->assertOk()
            ->assertJsonCount(3, 'data.citas');

        $this->assertSame(['17:00', '17:30'], [$this->hora($primera, 'hora_inicio'), $this->hora($primera, 'hora_fin')]);
        $this->assertSame(['17:30', '18:00'], [$this->hora($segunda, 'hora_inicio'), $this->hora($segunda, 'hora_fin')]);
        $this->assertSame(['18:00', '18:30'], [$this->hora($choca, 'hora_inicio'), $this->hora($choca, 'hora_fin')]);
    }

    public function test_el_empuje_se_detiene_donde_aparece_un_hueco(): void
    {
        Sanctum::actingAs($this->recepcion);
        $afectada = $this->crearCita('16:00', '16:30');
        $choca = $this->crearCita('17:00', '17:30');
        $libre = $this->crearCita('18:00', '18:30');
        $id = $this->bloquear();

        $this->patchJson("/api/bloqueos/{$id}/correr-citas")
            ->assertOk()
            ->assertJsonCount(2, 'data.citas');

        $this->assertSame('17:00', $this->hora($afectada, 'hora_inicio'));
        $this->assertSame('17:30', $this->hora($choca, 'hora_inicio'));
        $this->assertSame('18:00', $this->hora($libre, 'hora_inicio'));
    }

    public function test_una_cita_que_se_asoma_al_bloqueo_pasa_a_empezar_cuando_termina(): void
    {
        Sanctum::actingAs($this->recepcion);
        $asomada = $this->crearCita('16:00', '16:30');
        $id = $this->bloquear('16:15', '16:45');

        $this->patchJson("/api/bloqueos/{$id}/correr-citas")->assertOk();

        $this->assertSame(['16:45', '17:15'], [$this->hora($asomada, 'hora_inicio'), $this->hora($asomada, 'hora_fin')]);
    }

    public function test_conserva_la_duracion_de_cada_cita(): void
    {
        Sanctum::actingAs($this->recepcion);
        $larga = $this->crearCita('16:00', '16:45');
        $id = $this->bloquear();

        $this->patchJson("/api/bloqueos/{$id}/correr-citas")->assertOk();

        $this->assertSame(['17:00', '17:45'], [$this->hora($larga, 'hora_inicio'), $this->hora($larga, 'hora_fin')]);
    }

    public function test_no_mueve_una_emergencia_que_no_cayo_en_el_bloqueo(): void
    {
        Sanctum::actingAs($this->recepcion);
        $this->crearCita('16:00', '16:30');
        $emergencia = $this->crearCita('17:00', '17:30', ['tipo_cita' => 'EMERGENCIA']);
        $id = $this->bloquear();

        $this->patchJson("/api/bloqueos/{$id}/correr-citas")
            ->assertOk()
            ->assertJsonCount(1, 'data.citas');

        $this->assertSame('17:00', $this->hora($emergencia, 'hora_inicio'));
    }

    public function test_una_cita_corrida_no_cae_en_otro_bloqueo_del_dia(): void
    {
        Sanctum::actingAs($this->recepcion);
        $afectada = $this->crearCita('16:00', '16:30');
        $id = $this->bloquear();
        $this->postJson('/api/bloqueos', $this->bloqueo(['hora_inicio' => '17:00', 'hora_fin' => '17:30']))
            ->assertCreated();

        $this->patchJson("/api/bloqueos/{$id}/correr-citas")->assertOk();

        $this->assertSame('17:30', $this->hora($afectada, 'hora_inicio'));
    }

    public function test_avisa_las_citas_que_quedan_fuera_de_la_jornada(): void
    {
        Sanctum::actingAs($this->recepcion);
        $ultima = $this->crearCita('17:30', '18:00');
        $id = $this->bloquear('17:30', '18:30');

        $this->patchJson("/api/bloqueos/{$id}/correr-citas")
            ->assertOk()
            ->assertJsonPath('data.fueraDeHorario', [$ultima->id_cita]);
    }

    public function test_un_bloqueo_de_dia_completo_no_se_corre(): void
    {
        Sanctum::actingAs($this->recepcion);
        $this->crearCita('16:00', '16:30');
        $id = $this->postJson('/api/bloqueos', [
            'medico_id' => $this->medico->id,
            'fecha' => $this->lunes,
            'motivo' => 'Congreso',
        ])->json('data.bloqueo.id');

        $this->patchJson("/api/bloqueos/{$id}/correr-citas")->assertStatus(422);
    }

    public function test_no_corre_nada_si_ninguna_cita_quedo_dentro(): void
    {
        Sanctum::actingAs($this->recepcion);
        $this->crearCita('15:00', '15:30');
        $id = $this->postJson('/api/bloqueos', $this->bloqueo())->json('data.bloqueo.id');

        $this->patchJson("/api/bloqueos/{$id}/correr-citas")->assertStatus(422);
    }

    public function test_el_medico_no_puede_correr_citas_de_un_bloqueo(): void
    {
        Sanctum::actingAs($this->recepcion);
        $id = $this->postJson('/api/bloqueos', $this->bloqueo())->json('data.bloqueo.id');

        Sanctum::actingAs($this->medico);
        $this->patchJson("/api/bloqueos/{$id}/correr-citas")->assertForbidden();
        $this->getJson("/api/bloqueos/{$id}/citas-afectadas")->assertForbidden();
    }

    // ---- historial ----

    public function test_el_historial_responde_que_medicos_faltaron_un_dia(): void
    {
        $otro = User::factory()->create(['rol' => 'MEDICO', 'estado' => 'ACTIVO']);
        $ayer = now()->subDay()->toDateString();

        foreach ([$this->medico, $otro] as $m) {
            bloqueo_agenda::create([
                'id_medico' => $m->id,
                'fecha' => $ayer,
                'motivo' => 'Ausencia',
                'id_creado_por' => $this->recepcion->id,
            ]);
        }
        bloqueo_agenda::create([
            'id_medico' => $this->medico->id,
            'fecha' => now()->subDays(5)->toDateString(),
            'motivo' => 'Otro día',
            'id_creado_por' => $this->recepcion->id,
        ]);

        Sanctum::actingAs($this->recepcion);

        $this->getJson("/api/bloqueos?desde={$ayer}&hasta={$ayer}")
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.fecha', $ayer)
            ->assertJsonPath('data.0.tipo_bloqueo', 'COMPLETO');

        $this->getJson("/api/bloqueos?medico_id={$otro->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_el_listado_cuenta_las_citas_afectadas_de_cada_bloqueo(): void
    {
        Sanctum::actingAs($this->recepcion);
        $this->crearCita('16:00', '16:30');
        $this->crearCita('16:30', '17:00');
        $this->crearCita('15:00', '15:30');
        $this->postJson('/api/bloqueos', $this->bloqueo())->assertCreated();

        $this->getJson('/api/bloqueos')
            ->assertOk()
            ->assertJsonPath('data.0.citas_afectadas_total', 2);
    }

    public function test_un_bloqueo_pasado_no_se_elimina_y_uno_futuro_si(): void
    {
        $pasado = bloqueo_agenda::create([
            'id_medico' => $this->medico->id,
            'fecha' => now()->subDay()->toDateString(),
            'motivo' => 'Faltó',
            'id_creado_por' => $this->recepcion->id,
        ]);
        $futuro = bloqueo_agenda::create([
            'id_medico' => $this->medico->id,
            'fecha' => $this->lunes,
            'motivo' => 'Permiso',
            'id_creado_por' => $this->recepcion->id,
        ]);

        Sanctum::actingAs($this->recepcion);

        $this->deleteJson("/api/bloqueos/{$pasado->id_bloqueo}")->assertStatus(422);
        $this->assertDatabaseHas('bloqueo_agenda', ['id_bloqueo' => $pasado->id_bloqueo]);

        $this->deleteJson("/api/bloqueos/{$futuro->id_bloqueo}")->assertOk();
        $this->assertDatabaseMissing('bloqueo_agenda', ['id_bloqueo' => $futuro->id_bloqueo]);
    }
}
