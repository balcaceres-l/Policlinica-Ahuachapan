<?php

namespace Tests\Feature\Api;

use App\Models\cita;
use App\Models\consulta;
use App\Models\paciente;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** Número de junta de vigilancia (JVPM / JVPE) del profesional. */
class JuntaVigilanciaTest extends TestCase
{
    use RefreshDatabase;

    private function payload(array $extra = []): array
    {
        return array_merge([
            'nombre_completo' => 'Dra. Ana Lucía Menjívar',
            'usuario' => 'amenjivar@policlinica.com',
            'cargo' => 'Pediatría',
            'rol' => 'MEDICO',
            'password' => 'Clave-Segura-2026',
        ], $extra);
    }

    private function actuarComoAdministrador(): void
    {
        Sanctum::actingAs(User::factory()->create(['rol' => 'ADMINISTRADOR', 'estado' => 'ACTIVO']));
    }

    public function test_registra_y_devuelve_el_numero_de_junta(): void
    {
        $this->actuarComoAdministrador();

        $this->postJson('/api/usuarios', $this->payload(['jvpm' => '12345']))
            ->assertCreated()
            ->assertJsonPath('data.jvpm', '12345')
            ->assertJsonPath('data.jvpe', null);

        $this->assertDatabaseHas('users', ['usuario' => 'amenjivar@policlinica.com', 'jvpm' => '12345']);
    }

    public function test_el_numero_de_junta_es_opcional(): void
    {
        $this->actuarComoAdministrador();

        $this->postJson('/api/usuarios', $this->payload())
            ->assertCreated()
            ->assertJsonPath('data.jvpm', null);
    }

    public function test_no_permite_repetir_el_jvpm_de_otro_usuario(): void
    {
        $this->actuarComoAdministrador();
        User::factory()->create(['rol' => 'MEDICO', 'jvpm' => '12345']);

        $this->postJson('/api/usuarios', $this->payload(['jvpm' => '12345']))
            ->assertStatus(422)
            ->assertJsonValidationErrors('jvpm');
    }

    public function test_al_editar_conserva_su_propio_numero_y_puede_cambiarlo(): void
    {
        $this->actuarComoAdministrador();
        $medico = User::factory()->create(['rol' => 'MEDICO', 'jvpm' => '12345']);

        $datos = [
            'nombre_completo' => $medico->nombre_completo,
            'usuario' => $medico->usuario,
            'cargo' => $medico->cargo,
            'rol' => 'MEDICO',
        ];

        $this->putJson("/api/usuarios/{$medico->id}", $datos + ['jvpm' => '12345'])
            ->assertOk()
            ->assertJsonPath('data.jvpm', '12345');

        $this->putJson("/api/usuarios/{$medico->id}", $datos + ['jvpm' => '67890'])
            ->assertOk()
            ->assertJsonPath('data.jvpm', '67890');
    }

    /** La receta toma el JVPM de la consulta, no de un texto fijo. */
    public function test_la_consulta_expone_el_jvpm_del_medico(): void
    {
        $medico = User::factory()->create(['rol' => 'MEDICO', 'estado' => 'ACTIVO', 'jvpm' => '12345']);
        $paciente = paciente::create([
            'numero_expediente' => 'PT01-2026',
            'nombre_completo' => 'Paciente de Prueba',
            'fecha_nacimiento' => '1990-05-14',
            'id_registrado_por' => $medico->id,
        ]);
        $cita = cita::create([
            'id_paciente' => $paciente->id_paciente,
            'id_medico' => $medico->id,
            'fecha' => '2026-09-21',
            'hora_inicio' => '15:00',
            'hora_fin' => '15:30',
            'id_creado_por' => $medico->id,
        ]);
        $consulta = consulta::create([
            'id_cita' => $cita->id_cita,
            'id_medico' => $medico->id,
            'fecha_hora_inicio' => now(),
        ]);
        Sanctum::actingAs($medico);

        $this->getJson("/api/consultas/{$consulta->id_consulta}")
            ->assertOk()
            ->assertJsonPath('data.medicoJvpm', '12345');

        $this->getJson("/api/pacientes/{$paciente->id_paciente}/historial")
            ->assertOk()
            ->assertJsonPath('data.0.medicoJvpm', '12345');
    }
}
