<?php

namespace Tests\Feature\Api;

use App\Models\cita;
use App\Models\consulta;
use App\Models\paciente;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** HU-20 y HU-44 — diagnóstico de la consulta con CIE-11 de la OMS o texto libre. */
class DiagnosticoTest extends TestCase
{
    use RefreshDatabase;

    private const URI_BA00Z = 'http://id.who.int/icd/release/11/2026-01/mms/761947693/unspecified';

    private const URI_FOUNDATION = 'http://id.who.int/icd/entity/761947693';

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
    }

    private function url(): string
    {
        return "/api/consultas/{$this->consulta->id_consulta}";
    }

    private function hipertension(array $cambios = []): array
    {
        return array_merge([
            'descripcion' => 'Hipertensión esencial, sin especificación',
            'codigo_cie11' => 'BA00.Z',
            'uri_foundation' => self::URI_FOUNDATION,
            'uri_linearizacion' => self::URI_BA00Z,
        ], $cambios);
    }

    public function test_guarda_la_categoria_elegida_con_codigo_uris_y_release(): void
    {
        Sanctum::actingAs($this->medico);

        $this->putJson($this->url(), ['diagnosticos' => [$this->hipertension()]])
            ->assertOk()
            ->assertJsonPath('data.diagnosticos.0.codigo_cie11', 'BA00.Z')
            ->assertJsonPath('data.diagnosticos.0.descripcion', 'Hipertensión esencial, sin especificación')
            ->assertJsonPath('data.diagnosticos.0.uri_linearizacion', self::URI_BA00Z)
            ->assertJsonPath('data.diagnosticos.0.uri_foundation', self::URI_FOUNDATION)
            ->assertJsonPath('data.diagnosticos.0.release_cie11', '2026-01')
            ->assertJsonPath('data.diagnosticos.0.es_texto_libre', false);
    }

    public function test_guarda_un_diagnostico_como_texto_libre(): void
    {
        Sanctum::actingAs($this->medico);

        $this->putJson($this->url(), ['diagnosticos' => [['descripcion' => 'Cuadro gripal en estudio']]])
            ->assertOk()
            ->assertJsonPath('data.diagnosticos.0.codigo_cie11', null)
            ->assertJsonPath('data.diagnosticos.0.uri_linearizacion', null)
            ->assertJsonPath('data.diagnosticos.0.es_texto_libre', true);
    }

    /** Un nodo de la jerarquía sin código (bloque, capítulo) no se puede guardar. */
    public function test_rechaza_un_elemento_de_la_oms_sin_codigo(): void
    {
        Sanctum::actingAs($this->medico);

        $this->putJson($this->url(), ['diagnosticos' => [$this->hipertension(['codigo_cie11' => null])]])
            ->assertStatus(422)
            ->assertJsonValidationErrors('diagnosticos.0.codigo_cie11');

        $this->assertDatabaseCount('diagnostico', 0);
    }

    public function test_rechaza_un_codigo_sin_uri_de_la_oms(): void
    {
        Sanctum::actingAs($this->medico);

        $this->putJson($this->url(), ['diagnosticos' => [['descripcion' => 'Algo', 'codigo_cie11' => 'BA00.Z']]])
            ->assertStatus(422)
            ->assertJsonValidationErrors('diagnosticos.0.uri_linearizacion');
    }

    public function test_rechaza_uris_que_no_son_de_la_cie11_de_la_oms(): void
    {
        Sanctum::actingAs($this->medico);

        $this->putJson($this->url(), ['diagnosticos' => [$this->hipertension(['uri_linearizacion' => 'https://ejemplo.com/icd/release/11/2026-01/mms/1'])]])
            ->assertStatus(422)
            ->assertJsonValidationErrors('diagnosticos.0.uri_linearizacion');

        $this->putJson($this->url(), ['diagnosticos' => [$this->hipertension(['uri_foundation' => 'https://ejemplo.com/x'])]])
            ->assertStatus(422)
            ->assertJsonValidationErrors('diagnosticos.0.uri_foundation');
    }

    public function test_guardar_de_nuevo_reemplaza_la_lista(): void
    {
        Sanctum::actingAs($this->medico);

        $this->putJson($this->url(), ['diagnosticos' => [['descripcion' => 'Uno'], ['descripcion' => 'Dos']]])->assertOk();
        $this->putJson($this->url(), ['diagnosticos' => [$this->hipertension()]])
            ->assertOk()
            ->assertJsonCount(1, 'data.diagnosticos');

        $this->assertDatabaseCount('diagnostico', 1);
    }

    public function test_guardar_sin_enviar_diagnosticos_no_los_borra(): void
    {
        Sanctum::actingAs($this->medico);

        $this->putJson($this->url(), ['diagnosticos' => [$this->hipertension()]])->assertOk();
        $this->putJson($this->url(), ['motivo_consulta' => 'Control'])
            ->assertOk()
            ->assertJsonCount(1, 'data.diagnosticos');
    }

    /** HU-22 — el historial del paciente devuelve los diagnósticos registrados. */
    public function test_el_historial_del_paciente_incluye_los_diagnosticos(): void
    {
        Sanctum::actingAs($this->medico);

        $this->putJson($this->url(), ['diagnosticos' => [$this->hipertension()]])->assertOk();

        $this->getJson("/api/pacientes/{$this->paciente->id_paciente}/historial")
            ->assertOk()
            ->assertJsonCount(1, 'data.0.diagnosticos')
            ->assertJsonPath('data.0.diagnosticos.0.codigo_cie11', 'BA00.Z')
            ->assertJsonPath('data.0.diagnosticos.0.release_cie11', '2026-01');
    }
}
