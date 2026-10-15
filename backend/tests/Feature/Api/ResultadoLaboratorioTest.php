<?php

namespace Tests\Feature\Api;

use App\Models\paciente;
use App\Models\resultado_laboratorio;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** HU-41 y HU-23 — registro y consulta cronológica de resultados de laboratorio. */
class ResultadoLaboratorioTest extends TestCase
{
    use RefreshDatabase;

    private User $medico;

    private User $recepcion;

    private paciente $paciente;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');

        $this->medico = User::factory()->create(['rol' => 'MEDICO', 'estado' => 'ACTIVO']);
        $this->recepcion = User::factory()->create(['rol' => 'RECEPCIONISTA', 'estado' => 'ACTIVO']);

        $this->paciente = paciente::create([
            'numero_expediente' => 'PT01-2026',
            'nombre_completo' => 'Paciente de Prueba',
            'fecha_nacimiento' => '1990-05-14',
            'id_registrado_por' => $this->medico->id,
        ]);
    }

    private function url(): string
    {
        return "/api/pacientes/{$this->paciente->id_paciente}/laboratorio";
    }

    public function test_registra_un_resultado_como_texto(): void
    {
        Sanctum::actingAs($this->medico);

        $this->postJson($this->url(), [
            'nombre_examen' => 'Hemograma completo',
            'fecha_examen' => '2026-09-01',
            'resultado_texto' => 'Hemoglobina 14.8 g/dL',
        ])
            ->assertCreated()
            ->assertJsonPath('data.nombre_examen', 'Hemograma completo')
            ->assertJsonPath('data.fecha_examen', '2026-09-01')
            ->assertJsonPath('data.archivo', null)
            ->assertJsonPath('data.registrado_por_id', $this->medico->id);
    }

    public function test_registra_un_resultado_con_archivo_adjunto(): void
    {
        Sanctum::actingAs($this->medico);

        $respuesta = $this->post($this->url(), [
            'nombre_examen' => 'Radiografía de tórax',
            'fecha_examen' => '2026-09-02',
            'archivo' => UploadedFile::fake()->image('rx.jpg'),
        ], ['Accept' => 'application/json'])
            ->assertCreated()
            ->assertJsonPath('data.archivo.nombre', 'rx.jpg')
            ->assertJsonMissingPath('data.archivo_ruta');

        $resultado = resultado_laboratorio::find($respuesta->json('data.id'));
        Storage::disk('local')->assertExists($resultado->archivo_ruta);

        $this->get("/api/laboratorio/{$resultado->id_resultado}/archivo")
            ->assertOk()
            ->assertHeader('Content-Type', 'image/jpeg');
    }

    public function test_exige_texto_o_archivo(): void
    {
        Sanctum::actingAs($this->medico);

        $this->postJson($this->url(), [
            'nombre_examen' => 'Glucosa',
            'fecha_examen' => '2026-09-01',
        ])->assertStatus(422);
    }

    public function test_rechaza_una_fecha_futura_y_un_tipo_de_archivo_no_permitido(): void
    {
        Sanctum::actingAs($this->medico);

        $this->postJson($this->url(), [
            'nombre_examen' => 'Glucosa',
            'fecha_examen' => now()->addDay()->toDateString(),
            'resultado_texto' => '90 mg/dL',
        ])->assertStatus(422);

        $this->post($this->url(), [
            'nombre_examen' => 'Glucosa',
            'fecha_examen' => '2026-09-01',
            'archivo' => UploadedFile::fake()->create('resultado.exe', 10),
        ], ['Accept' => 'application/json'])->assertStatus(422);
    }

    public function test_la_recepcionista_consulta_pero_no_registra(): void
    {
        resultado_laboratorio::create([
            'id_paciente' => $this->paciente->id_paciente,
            'id_registrado_por' => $this->medico->id,
            'nombre_examen' => 'Glucosa',
            'fecha_examen' => '2026-09-01',
            'resultado_texto' => '90 mg/dL',
        ]);
        Sanctum::actingAs($this->recepcion);

        $this->getJson($this->url())->assertOk()->assertJsonCount(1, 'data');

        $this->postJson($this->url(), [
            'nombre_examen' => 'Glucosa',
            'fecha_examen' => '2026-09-01',
            'resultado_texto' => '90 mg/dL',
        ])->assertForbidden();
    }

    public function test_lista_los_resultados_del_mas_reciente_al_mas_antiguo(): void
    {
        foreach (['2026-05-30' => 'Hemograma', '2026-08-12' => 'Perfil metabólico', '2026-02-10' => 'Orina'] as $fecha => $examen) {
            resultado_laboratorio::create([
                'id_paciente' => $this->paciente->id_paciente,
                'id_registrado_por' => $this->medico->id,
                'nombre_examen' => $examen,
                'fecha_examen' => $fecha,
                'resultado_texto' => 'Sin hallazgos',
            ]);
        }
        Sanctum::actingAs($this->medico);

        $this->getJson($this->url())
            ->assertOk()
            ->assertJsonPath('data.0.nombre_examen', 'Perfil metabólico')
            ->assertJsonPath('data.1.nombre_examen', 'Hemograma')
            ->assertJsonPath('data.2.nombre_examen', 'Orina');
    }

    public function test_solo_quien_lo_registro_puede_eliminarlo(): void
    {
        $resultado = resultado_laboratorio::create([
            'id_paciente' => $this->paciente->id_paciente,
            'id_registrado_por' => $this->medico->id,
            'nombre_examen' => 'Glucosa',
            'fecha_examen' => '2026-09-01',
            'resultado_texto' => '90 mg/dL',
        ]);

        Sanctum::actingAs(User::factory()->create(['rol' => 'MEDICO', 'estado' => 'ACTIVO']));
        $this->deleteJson("/api/laboratorio/{$resultado->id_resultado}")->assertForbidden();

        Sanctum::actingAs($this->medico);
        $this->deleteJson("/api/laboratorio/{$resultado->id_resultado}")->assertOk();
        $this->assertDatabaseCount('resultado_laboratorio', 0);
    }
}
