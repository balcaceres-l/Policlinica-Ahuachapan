<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Verifica que las restricciones del esquema clínico se apliquen en la base
 * y no solo en la capa de aplicación.
 */
class EsquemaClinicoTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $medico;

    protected function setUp(): void
    {
        parent::setUp();

        // SQLite ignora las llaves foráneas salvo que se activen explícitamente.
        if (DB::connection()->getDriverName() === 'sqlite') {
            DB::statement('PRAGMA foreign_keys = ON');
        }

        $this->admin = User::factory()->create(['rol' => 'ADMINISTRADOR']);
        $this->medico = User::factory()->create(['rol' => 'MEDICO']);
    }

    private function crearPaciente(string $expediente = 'PT01-2026'): int
    {
        return DB::table('pacientes')->insertGetId([
            'numero_expediente' => $expediente,
            'nombre_completo' => 'Paciente de Prueba',
            'fecha_nacimiento' => '1990-05-14',
            'registrado_por_id' => $this->admin->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function crearCita(int $pacienteId): int
    {
        return DB::table('citas')->insertGetId([
            'paciente_id' => $pacienteId,
            'medico_id' => $this->medico->id,
            'fecha' => '2026-09-10',
            'hora_inicio' => '15:00',
            'hora_fin' => '15:30',
            'creado_por_id' => $this->admin->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function crearConsulta(int $citaId): int
    {
        return DB::table('consultas')->insertGetId([
            'cita_id' => $citaId,
            'medico_id' => $this->medico->id,
            'fecha_hora_inicio' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function test_una_cita_nueva_nace_regular_y_agendada(): void
    {
        $cita = DB::table('citas')->find($this->crearCita($this->crearPaciente()));

        $this->assertSame('REGULAR', $cita->tipo_cita);
        $this->assertSame('AGENDADA', $cita->estado);
    }

    public function test_permite_la_cadena_paciente_cita_consulta_diagnostico(): void
    {
        $consultaId = $this->crearConsulta($this->crearCita($this->crearPaciente()));

        DB::table('diagnosticos')->insert([
            'consulta_id' => $consultaId,
            'descripcion_texto_libre' => 'Diagnóstico registrado como texto libre',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->assertDatabaseCount('diagnosticos', 1);
        $this->assertSame('PRESUNTIVO', DB::table('diagnosticos')->first()->tipo);
    }

    public function test_una_cita_no_admite_dos_consultas(): void
    {
        $citaId = $this->crearCita($this->crearPaciente());
        $this->crearConsulta($citaId);

        $this->expectException(QueryException::class);
        $this->crearConsulta($citaId);
    }

    public function test_no_admite_dos_bloqueos_del_mismo_medico_en_la_misma_fecha(): void
    {
        $bloqueo = [
            'medico_id' => $this->medico->id,
            'fecha' => '2026-09-11',
            'creado_por_id' => $this->admin->id,
            'created_at' => now(),
            'updated_at' => now(),
        ];
        DB::table('bloqueos_agenda')->insert($bloqueo);

        $this->expectException(QueryException::class);
        DB::table('bloqueos_agenda')->insert($bloqueo);
    }

    public function test_no_permite_borrar_un_paciente_con_historial(): void
    {
        $pacienteId = $this->crearPaciente();
        $this->crearCita($pacienteId);

        $this->expectException(QueryException::class);
        DB::table('pacientes')->where('id', $pacienteId)->delete();
    }

    public function test_rechaza_un_diagnostico_con_codigo_cie10_inexistente(): void
    {
        $consultaId = $this->crearConsulta($this->crearCita($this->crearPaciente()));

        $this->expectException(QueryException::class);
        DB::table('diagnosticos')->insert([
            'consulta_id' => $consultaId,
            'codigo_cie10' => 'NO-EXISTE',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function test_el_examen_fisico_acepta_hallazgos_sin_region_anatomica(): void
    {
        $consultaId = $this->crearConsulta($this->crearCita($this->crearPaciente()));

        DB::table('examenes_fisicos')->insert([
            'consulta_id' => $consultaId,
            'hallazgos' => 'Paciente consciente, orientado, sin hallazgos relevantes.',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->assertNull(DB::table('examenes_fisicos')->first()->region_anatomica);
    }

    public function test_un_resultado_de_laboratorio_puede_existir_sin_consulta(): void
    {
        DB::table('resultados_laboratorio')->insert([
            'paciente_id' => $this->crearPaciente(),
            'consulta_id' => null,
            'tipo_examen' => 'Hemograma completo',
            'fecha_examen' => '2026-09-08',
            'resultado_texto' => 'Valores dentro de rango.',
            'registrado_por_id' => $this->medico->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->assertDatabaseCount('resultados_laboratorio', 1);
    }

    public function test_el_numero_de_expediente_es_unico(): void
    {
        $this->crearPaciente('PT01-2026');

        $this->expectException(QueryException::class);
        $this->crearPaciente('PT01-2026');
    }
}
