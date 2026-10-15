<?php

namespace Tests\Feature\Api;

use App\Models\catalogo_cie10;
use App\Models\cita;
use App\Models\consulta;
use App\Models\paciente;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** HU-20 y HU-44 — diagnóstico de la consulta y catálogo CIE-10. */
class DiagnosticoTest extends TestCase
{
    use RefreshDatabase;

    private User $medico;

    private paciente $paciente;

    private consulta $consulta;

    protected function setUp(): void
    {
        parent::setUp();

        $this->medico = User::factory()->create(['rol' => 'MEDICO', 'estado' => 'ACTIVO']);

        $this->paciente = paciente::create([
            'numero_expediente' => 'PT01-2026',
            'nombre_completo' => 'Paciente de Prueba',
            'fecha_nacimiento' => '1990-05-14',
            'id_registrado_por' => $this->medico->id,
        ]);

        $cita = cita::create([
            'id_paciente' => $this->paciente->id_paciente,
            'id_medico' => $this->medico->id,
            'fecha' => '2026-09-21',
            'hora_inicio' => '15:00',
            'hora_fin' => '15:30',
            'id_creado_por' => $this->medico->id,
        ]);

        $this->consulta = consulta::create([
            'id_cita' => $cita->id_cita,
            'id_medico' => $this->medico->id,
            'fecha_hora_inicio' => now(),
        ]);

        catalogo_cie10::insert([
            ['codigo' => 'J00', 'descripcion' => 'Rinofaringitis aguda [resfriado comun]'],
            ['codigo' => 'J02.9', 'descripcion' => 'Faringitis aguda, no especificada'],
            ['codigo' => 'E11.9', 'descripcion' => 'Diabetes mellitus no insulinodependiente, sin mencion de complicacion'],
        ]);
    }

    public function test_busca_en_el_catalogo_por_texto(): void
    {
        Sanctum::actingAs($this->medico);

        $this->getJson('/api/catalogo/cie10?buscar=faringitis')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.codigo', 'J00')
            ->assertJsonPath('data.1.codigo', 'J02.9');
    }

    public function test_primero_salen_las_filas_que_coinciden_con_mas_palabras(): void
    {
        Sanctum::actingAs($this->medico);

        $this->getJson('/api/catalogo/cie10?buscar='.urlencode('faringitis especificada'))
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.codigo', 'J02.9')
            ->assertJsonPath('data.1.codigo', 'J00');
    }

    /** El médico escribe síntomas en una frase, no el término del catálogo. */
    public function test_una_frase_de_sintomas_ignora_conectores_y_numeros(): void
    {
        Sanctum::actingAs($this->medico);

        $this->getJson('/api/catalogo/cie10?buscar='.urlencode('paciente con diabetes desde hace 3 años'))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.codigo', 'E11.9');

        $this->getJson('/api/catalogo/cie10?buscar='.urlencode('de la y 12'))
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    /** "tipo 2" desempata: el número solo no se busca, pero la frase sí cuenta. */
    public function test_una_frase_con_numero_ordena_primero_la_coincidencia_exacta(): void
    {
        catalogo_cie10::insert([
            ['codigo' => 'E10.9', 'descripcion' => 'DIABETES MELLITUS TIPO 1, SIN MENCIÓN DE COMPLICACIÓN'],
            ['codigo' => 'E11.8', 'descripcion' => 'DIABETES MELLITUS TIPO 2, CON COMPLICACIONES NO ESPECIFICADAS'],
        ]);
        Sanctum::actingAs($this->medico);

        $this->getJson('/api/catalogo/cie10?buscar='.urlencode('diabetes tipo 2'))
            ->assertOk()
            ->assertJsonPath('data.0.codigo', 'E11.8');
    }

    public function test_busca_por_inicio_de_codigo(): void
    {
        Sanctum::actingAs($this->medico);

        $this->getJson('/api/catalogo/cie10?buscar=e11')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.codigo', 'E11.9');
    }

    public function test_avisa_cuando_el_catalogo_no_esta_cargado(): void
    {
        catalogo_cie10::query()->delete();
        Sanctum::actingAs($this->medico);

        $this->getJson('/api/catalogo/cie10?buscar=gripe')
            ->assertStatus(503)
            ->assertJsonPath('success', false);
    }

    public function test_solo_el_medico_consulta_el_catalogo(): void
    {
        Sanctum::actingAs(User::factory()->create(['rol' => 'RECEPCIONISTA', 'estado' => 'ACTIVO']));

        $this->getJson('/api/catalogo/cie10?buscar=faringitis')->assertForbidden();
    }

    public function test_guarda_diagnosticos_con_codigo_y_como_texto_libre(): void
    {
        Sanctum::actingAs($this->medico);

        $this->putJson("/api/consultas/{$this->consulta->id_consulta}", [
            'diagnosticos' => [
                ['descripcion' => 'Dolor de garganta y fiebre', 'codigo_cie10' => 'J02.9'],
                ['descripcion' => 'Cuadro en estudio'],
            ],
        ])
            ->assertOk()
            ->assertJsonCount(2, 'data.diagnosticos')
            ->assertJsonPath('data.diagnosticos.0.codigo_cie10', 'J02.9')
            ->assertJsonPath('data.diagnosticos.0.es_texto_libre', false)
            ->assertJsonPath('data.diagnosticos.1.codigo_cie10', null)
            ->assertJsonPath('data.diagnosticos.1.es_texto_libre', true);

        $this->assertDatabaseHas('diagnostico', [
            'id_consulta' => $this->consulta->id_consulta,
            'codigo_cie10' => 'J02.9',
            'descripcion' => 'Dolor de garganta y fiebre',
        ]);
    }

    public function test_rechaza_un_codigo_que_no_esta_en_el_catalogo(): void
    {
        Sanctum::actingAs($this->medico);

        $this->putJson("/api/consultas/{$this->consulta->id_consulta}", [
            'diagnosticos' => [['descripcion' => 'Gripe', 'codigo_cie10' => 'ZZ99']],
        ])->assertStatus(422);

        $this->assertDatabaseCount('diagnostico', 0);
    }

    public function test_guardar_de_nuevo_reemplaza_la_lista(): void
    {
        Sanctum::actingAs($this->medico);
        $url = "/api/consultas/{$this->consulta->id_consulta}";

        $this->putJson($url, ['diagnosticos' => [['descripcion' => 'Uno'], ['descripcion' => 'Dos']]])->assertOk();
        $this->putJson($url, ['diagnosticos' => [['descripcion' => 'Definitivo', 'codigo_cie10' => 'J00']]])
            ->assertOk()
            ->assertJsonCount(1, 'data.diagnosticos');

        $this->assertDatabaseCount('diagnostico', 1);
    }

    public function test_guardar_sin_enviar_diagnosticos_no_los_borra(): void
    {
        Sanctum::actingAs($this->medico);
        $url = "/api/consultas/{$this->consulta->id_consulta}";

        $this->putJson($url, ['diagnosticos' => [['descripcion' => 'Gripe', 'codigo_cie10' => 'J00']]])->assertOk();
        $this->putJson($url, ['motivo_consulta' => 'Control'])
            ->assertOk()
            ->assertJsonCount(1, 'data.diagnosticos');
    }

    /** HU-22 — el historial del paciente devuelve los diagnósticos registrados. */
    public function test_el_historial_del_paciente_incluye_los_diagnosticos(): void
    {
        Sanctum::actingAs($this->medico);

        $this->putJson("/api/consultas/{$this->consulta->id_consulta}", [
            'diagnosticos' => [['descripcion' => 'Resfriado', 'codigo_cie10' => 'J00']],
        ])->assertOk();

        $this->getJson("/api/pacientes/{$this->paciente->id_paciente}/historial")
            ->assertOk()
            ->assertJsonCount(1, 'data.0.diagnosticos')
            ->assertJsonPath('data.0.diagnosticos.0.codigo_cie10', 'J00')
            ->assertJsonPath('data.0.diagnosticos.0.descripcion', 'Resfriado');
    }
}
