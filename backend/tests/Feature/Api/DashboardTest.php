<?php

namespace Tests\Feature\Api;

use App\Models\cita;
use App\Models\consulta;
use App\Models\diagnostico;
use App\Models\Especialidad;
use App\Models\paciente;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $medico;
    private User $recepcionista;
    private Especialidad $especialidad;
    private paciente $paciente;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'rol' => 'ADMINISTRADOR',
            'estado' => 'ACTIVO',
        ]);

        $this->medico = User::factory()->create([
            'rol' => 'MEDICO',
            'estado' => 'ACTIVO',
            'jvpm' => '12345',
        ]);

        $this->recepcionista = User::factory()->create([
            'rol' => 'RECEPCIONISTA',
            'estado' => 'ACTIVO',
        ]);

        $this->especialidad = Especialidad::create([
            'nombre' => 'Medicina General',
            'descripcion' => 'Atención primaria',
            'estado' => 'ACTIVA',
        ]);

        $this->paciente = paciente::create([
            'numero_expediente' => 'PA01-2026',
            'nombre_completo' => 'Juan Pérez',
            'fecha_nacimiento' => '1990-01-01',
            'dui' => '01234567-8',
            'telefono' => '7123-4567',
            'direccion' => 'Ahuachapán',
            'es_menor_edad' => false,
            'estado' => 'ACTIVO',
            'datos_pendientes' => false,
            'id_registrado_por' => $this->recepcionista->id,
            'fecha_registro' => now(),
        ]);
    }

    public function test_administrador_puede_obtener_metricas_del_dashboard(): void
    {
        $cita = cita::create([
            'id_paciente' => $this->paciente->id_paciente,
            'id_medico' => $this->medico->id,
            'id_especialidad' => $this->especialidad->id,
            'fecha' => now()->toDateString(),
            'hora_inicio' => '08:00:00',
            'hora_fin' => '08:30:00',
            'tipo_cita' => 'REGULAR',
            'estado' => 'ATENDIDA',
            'id_creado_por' => $this->recepcionista->id,
        ]);

        consulta::create([
            'id_cita' => $cita->id_cita,
            'id_medico' => $this->medico->id,
            'id_especialidad_atencion' => $this->especialidad->id,
            'fecha_hora_inicio' => now()->subMinutes(30),
            'fecha_hora_fin' => now(),
            'motivo_consulta' => 'Control general',
            'precio' => 25.00,
            'total' => 25.00,
            'segundos_transcurridos' => 1200,
            'en_pausa' => false,
        ]);

        $response = $this->actingAs($this->admin)
            ->getJson('/api/dashboard/admin?periodo=mes_actual');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.kpis.consultas_atendidas', 1)
            ->assertJsonPath('data.kpis.ingresos_estimados', 25)
            ->assertJsonPath('data.kpis.medicos_activos', 1)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'rango',
                    'kpis' => [
                        'consultas_atendidas',
                        'total_citas',
                        'tasa_efectividad',
                        'ingresos_estimados',
                        'pacientes_nuevos',
                        'pacientes_total',
                        'medicos_activos',
                    ],
                    'citas_por_estado',
                    'especialidades_demandadas',
                    'top_medicos',
                    'tendencia',
                ],
            ]);
    }

    public function test_medico_no_puede_acceder_al_dashboard_de_administrador(): void
    {
        $this->actingAs($this->medico)
            ->getJson('/api/dashboard/admin')
            ->assertForbidden();
    }

    public function test_medico_puede_obtener_sus_propias_estadisticas_clinicas(): void
    {
        $cita = cita::create([
            'id_paciente' => $this->paciente->id_paciente,
            'id_medico' => $this->medico->id,
            'id_especialidad' => $this->especialidad->id,
            'fecha' => now()->toDateString(),
            'hora_inicio' => '09:00:00',
            'hora_fin' => '09:30:00',
            'tipo_cita' => 'REGULAR',
            'estado' => 'ATENDIDA',
            'id_creado_por' => $this->recepcionista->id,
        ]);

        $consulta = consulta::create([
            'id_cita' => $cita->id_cita,
            'id_medico' => $this->medico->id,
            'id_especialidad_atencion' => $this->especialidad->id,
            'fecha_hora_inicio' => now()->subMinutes(20),
            'fecha_hora_fin' => now(),
            'motivo_consulta' => 'Fiebre y dolor de garganta',
            'precio' => 20.00,
            'total' => 20.00,
            'segundos_transcurridos' => 1200,
            'en_pausa' => false,
        ]);

        diagnostico::create([
            'id_consulta' => $consulta->id_consulta,
            'codigo_cie11' => 'CA02.Z',
            'descripcion' => 'Faringitis aguda, no especificada',
        ]);

        $response = $this->actingAs($this->medico)
            ->getJson('/api/dashboard/medico?periodo=mes_actual');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.kpis.consultas_atendidas', 1)
            ->assertJsonPath('data.kpis.ingresos_generados', 20)
            ->assertJsonPath('data.kpis.tiempo_promedio_min', 20)
            ->assertJsonPath('data.top_diagnosticos_cie11.0.codigo', 'CA02.Z')
            ->assertJsonPath('data.top_diagnosticos_cie11.0.total', 1);
    }
}
