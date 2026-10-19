<?php

namespace Tests\Feature\Api;

use App\Models\cita;
use App\Models\constancia_medica;
use App\Models\consulta;
use App\Models\detalle_receta;
use App\Models\diagnostico;
use App\Models\paciente;
use App\Models\receta_medica;
use App\Models\referencia_medica;
use App\Models\User;
use App\Services\DocumentoPdf;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Symfony\Component\HttpFoundation\Response;
use Tests\TestCase;

/** HU-30, HU-31, HU-32 y HU-33 — documentos médicos y su PDF. */
class DocumentoMedicoTest extends TestCase
{
    use RefreshDatabase;

    private User $medico;

    private User $otroMedico;

    private User $recepcion;

    private paciente $paciente;

    private consulta $consulta;

    protected function setUp(): void
    {
        parent::setUp();

        $admin = User::factory()->create(['rol' => 'ADMINISTRADOR', 'estado' => 'ACTIVO']);
        $this->medico = User::factory()->create(['rol' => 'MEDICO', 'estado' => 'ACTIVO', 'jvpm' => '12345']);
        $this->otroMedico = User::factory()->create(['rol' => 'MEDICO', 'estado' => 'ACTIVO']);
        $this->recepcion = User::factory()->create(['rol' => 'RECEPCIONISTA', 'estado' => 'ACTIVO']);

        $this->paciente = paciente::create([
            'numero_expediente' => 'PT01-2026',
            'nombre_completo' => 'Paciente de Prueba',
            'fecha_nacimiento' => '1990-05-14',
            'id_registrado_por' => $admin->id,
        ]);

        $cita = cita::create([
            'id_paciente' => $this->paciente->id_paciente,
            'id_medico' => $this->medico->id,
            'fecha' => '2026-10-15',
            'hora_inicio' => '15:00',
            'hora_fin' => '15:30',
            'estado' => 'ATENDIDA',
            'id_creado_por' => $this->recepcion->id,
        ]);

        $this->consulta = consulta::create([
            'id_cita' => $cita->id_cita,
            'id_medico' => $this->medico->id,
            'fecha_hora_inicio' => '2026-10-15 15:05:00',
            'fecha_hora_fin' => '2026-10-15 15:30:00',
            'motivo_consulta' => 'Dolor de garganta',
        ]);

        diagnostico::create([
            'id_consulta' => $this->consulta->id_consulta,
            'descripcion' => 'Faringitis aguda, sin especificación',
            'codigo_cie11' => 'CA02.Z',
            'uri_linearizacion' => 'http://id.who.int/icd/release/11/2026-01/mms/1',
            'release_cie11' => '2026-01',
        ]);
    }

    private function conReceta(): void
    {
        $receta = receta_medica::create(['id_consulta' => $this->consulta->id_consulta]);
        detalle_receta::create([
            'id_receta' => $receta->id_receta,
            'nombre_medicamento' => 'Amoxicilina 500 mg',
            'dosis' => '1 cápsula',
            'frecuencia' => 'Cada 8 horas',
            'duracion' => '7 días',
        ]);
    }

    /** Reemplaza el PDF por el HTML de la plantilla para revisar qué lleva. */
    private function verHtmlEnLugarDePdf(): void
    {
        $this->app->instance(DocumentoPdf::class, new class extends DocumentoPdf
        {
            public function responder(string $vista, array $datos, string $archivo, bool $descargar): Response
            {
                return response(view("documentos.{$vista}", $datos + ['clinica' => $this->clinica()])->render());
            }
        });
    }

    // ---- HU-31 constancia ----

    public function test_el_medico_que_atendio_genera_una_constancia(): void
    {
        Sanctum::actingAs($this->medico);

        $this->postJson("/api/consultas/{$this->consulta->id_consulta}/constancias", [
            'motivo' => 'Reposo por 3 días por faringitis aguda.',
        ])
            ->assertCreated()
            ->assertJsonPath('data.motivo', 'Reposo por 3 días por faringitis aguda.')
            ->assertJsonPath('data.paciente_id', $this->paciente->id_paciente);
    }

    public function test_otro_medico_no_emite_documentos_de_una_consulta_ajena(): void
    {
        Sanctum::actingAs($this->otroMedico);

        $this->postJson("/api/consultas/{$this->consulta->id_consulta}/constancias", ['motivo' => 'Constancia de prueba'])
            ->assertForbidden();
        $this->postJson("/api/consultas/{$this->consulta->id_consulta}/referencias", [
            'tipo' => 'EXTERNA', 'destino' => 'Hospital', 'motivo' => 'Evaluación', 'resumen_clinico' => 'Resumen',
        ])->assertForbidden();
    }

    public function test_la_constancia_exige_motivo(): void
    {
        Sanctum::actingAs($this->medico);

        $this->postJson("/api/consultas/{$this->consulta->id_consulta}/constancias", ['motivo' => ''])
            ->assertStatus(422)
            ->assertJsonValidationErrors('motivo');
    }

    public function test_la_constancia_lleva_paciente_medico_y_motivo(): void
    {
        $constancia = constancia_medica::create([
            'id_consulta' => $this->consulta->id_consulta,
            'id_paciente' => $this->paciente->id_paciente,
            'id_medico' => $this->medico->id,
            'motivo' => 'Asistió a consulta médica.',
        ]);
        $this->verHtmlEnLugarDePdf();
        Sanctum::actingAs($this->recepcion);

        $html = $this->get("/api/constancias/{$constancia->id_constancia}/pdf")->assertOk()->getContent();

        $this->assertStringContainsString('Paciente de Prueba', $html);
        $this->assertStringContainsString('PT01-2026', $html);
        $this->assertStringContainsString($this->medico->nombre_completo, $html);
        $this->assertStringContainsString('JVPM: 12345', $html);
        $this->assertStringContainsString('Asistió a consulta médica.', $html);
    }

    // ---- HU-32 referencia ----

    public function test_la_referencia_interna_exige_un_medico_destino_valido(): void
    {
        Sanctum::actingAs($this->medico);
        $url = "/api/consultas/{$this->consulta->id_consulta}/referencias";

        $this->postJson($url, ['tipo' => 'INTERNA', 'motivo' => 'Valoración por otra especialidad'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('medico_destino_id');

        $this->postJson($url, ['tipo' => 'INTERNA', 'medico_destino_id' => $this->medico->id, 'motivo' => 'A mí mismo'])
            ->assertStatus(422);

        $this->postJson($url, ['tipo' => 'INTERNA', 'medico_destino_id' => $this->recepcion->id, 'motivo' => 'A recepción'])
            ->assertStatus(422);

        $this->postJson($url, [
            'tipo' => 'INTERNA',
            'medico_destino_id' => $this->otroMedico->id,
            'especialidad_destino' => 'Otorrinolaringología',
            'motivo' => 'Faringitis recurrente',
        ])
            ->assertCreated()
            ->assertJsonPath('data.tipo', 'INTERNA')
            ->assertJsonPath('data.medicoDestinoNombre', $this->otroMedico->nombre_completo);
    }

    public function test_la_referencia_externa_exige_destino_y_la_informacion_escrita(): void
    {
        Sanctum::actingAs($this->medico);
        $url = "/api/consultas/{$this->consulta->id_consulta}/referencias";

        $this->postJson($url, ['tipo' => 'EXTERNA', 'motivo' => 'Evaluación especializada'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['destino', 'resumen_clinico']);

        $this->postJson($url, [
            'tipo' => 'EXTERNA',
            'destino' => 'Dr. Juan Pérez, Hospital Nacional',
            'motivo' => 'Evaluación especializada',
            'resumen_clinico' => 'Faringitis a repetición, 4 episodios en el año.',
        ])
            ->assertCreated()
            ->assertJsonPath('data.medico_destino_id', null);
    }

    public function test_la_referencia_interna_lleva_el_expediente_completo(): void
    {
        $this->conReceta();
        $referencia = referencia_medica::create([
            'id_consulta' => $this->consulta->id_consulta,
            'id_paciente' => $this->paciente->id_paciente,
            'id_medico' => $this->medico->id,
            'tipo' => 'INTERNA',
            'id_medico_destino' => $this->otroMedico->id,
            'motivo' => 'Valoración por otorrino',
        ]);
        $this->verHtmlEnLugarDePdf();
        Sanctum::actingAs($this->otroMedico);

        $html = $this->get("/api/referencias/{$referencia->id_referencia}/pdf")->assertOk()->getContent();

        $this->assertStringContainsString('Expediente clínico completo', $html);
        $this->assertStringContainsString('Faringitis aguda, sin especificación', $html);
        $this->assertStringContainsString('CIE-11 CA02.Z', $html);
        $this->assertStringContainsString('Amoxicilina 500 mg', $html);
        $this->assertStringContainsString('Dolor de garganta', $html);
    }

    public function test_la_referencia_externa_no_expone_el_expediente(): void
    {
        $this->conReceta();
        $referencia = referencia_medica::create([
            'id_consulta' => $this->consulta->id_consulta,
            'id_paciente' => $this->paciente->id_paciente,
            'id_medico' => $this->medico->id,
            'tipo' => 'EXTERNA',
            'destino' => 'Hospital Nacional',
            'motivo' => 'Evaluación especializada',
            'resumen_clinico' => 'Solo esto escribió el médico.',
        ]);
        $this->verHtmlEnLugarDePdf();
        Sanctum::actingAs($this->medico);

        $html = $this->get("/api/referencias/{$referencia->id_referencia}/pdf")->assertOk()->getContent();

        $this->assertStringContainsString('Solo esto escribió el médico.', $html);
        $this->assertStringNotContainsString('Expediente clínico completo', $html);
        $this->assertStringNotContainsString('Faringitis aguda, sin especificación', $html);
        $this->assertStringNotContainsString('Amoxicilina', $html);
    }

    public function test_lista_los_medicos_a_los_que_se_puede_referir(): void
    {
        Sanctum::actingAs($this->medico);

        $this->getJson('/api/referencias/medicos-destino')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $this->otroMedico->id);
    }

    // ---- HU-30 / HU-33 PDF ----

    public function test_la_receta_se_genera_como_pdf_para_ver_o_descargar(): void
    {
        $this->conReceta();
        Sanctum::actingAs($this->recepcion);
        $url = "/api/consultas/{$this->consulta->id_consulta}/receta/pdf";

        $verla = $this->get($url)->assertOk()->assertHeader('content-type', 'application/pdf');
        $this->assertStringStartsWith('%PDF', $verla->getContent());
        $this->assertStringStartsWith('inline', (string) $verla->headers->get('content-disposition'));

        $descargarla = $this->get($url.'?descargar=1')->assertOk();
        $this->assertStringStartsWith('attachment', (string) $descargarla->headers->get('content-disposition'));
    }

    public function test_sin_receta_no_hay_pdf(): void
    {
        Sanctum::actingAs($this->medico);

        $this->getJson("/api/consultas/{$this->consulta->id_consulta}/receta/pdf")->assertNotFound();
    }

    public function test_el_administrador_no_descarga_documentos_medicos(): void
    {
        $this->conReceta();
        Sanctum::actingAs(User::factory()->create(['rol' => 'ADMINISTRADOR', 'estado' => 'ACTIVO']));

        $this->getJson("/api/consultas/{$this->consulta->id_consulta}/receta/pdf")->assertForbidden();
    }

    public function test_el_expediente_muestra_los_documentos_emitidos(): void
    {
        Sanctum::actingAs($this->medico);
        $this->postJson("/api/consultas/{$this->consulta->id_consulta}/constancias", ['motivo' => 'Constancia de asistencia'])
            ->assertCreated();

        $this->getJson("/api/pacientes/{$this->paciente->id_paciente}/historial")
            ->assertOk()
            ->assertJsonCount(1, 'data.0.constancias')
            ->assertJsonCount(0, 'data.0.referencias');
    }
}
