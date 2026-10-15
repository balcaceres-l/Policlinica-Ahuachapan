<?php

namespace Tests\Feature\Api;

use App\Models\paciente;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

/** HU-42 — unicidad del número de expediente ante registros simultáneos. */
class NumeroExpedienteTest extends TestCase
{
    use RefreshDatabase;

    private User $recepcion;

    protected function setUp(): void
    {
        parent::setUp();
        $this->recepcion = User::factory()->create(['rol' => 'RECEPCIONISTA', 'estado' => 'ACTIVO']);
    }

    private function registrar(string $nombre, string $dui)
    {
        return $this->actingAs($this->recepcion)->postJson('/api/pacientes', [
            'nombre_completo' => $nombre,
            'fecha_nacimiento' => '1990-01-01',
            'dui' => $dui,
        ]);
    }

    public function test_el_correlativo_avanza_por_iniciales(): void
    {
        $anio = now()->year;

        $this->registrar('Carlos Alberto Martinez', '02345678-9')
            ->assertCreated()
            ->assertJsonPath('data.numeroExpediente', "CA01-{$anio}");

        $this->registrar('Carmen Alicia Lopez', '02345678-8')
            ->assertCreated()
            ->assertJsonPath('data.numeroExpediente', "CA02-{$anio}");
    }

    /**
     * Simula la carrera: justo antes de insertar, otra sesión ocupa el número
     * que este registro acababa de calcular.
     */
    public function test_si_otro_registro_gana_el_numero_toma_el_siguiente(): void
    {
        $anio = now()->year;
        $yaCompitio = false;

        paciente::creating(function (paciente $nuevo) use (&$yaCompitio) {
            if ($yaCompitio) {
                return;
            }
            $yaCompitio = true;

            DB::table('paciente')->insert([
                'id_paciente' => (string) Str::uuid(),
                'numero_expediente' => $nuevo->numero_expediente,
                'nombre_completo' => 'Registro simultaneo',
                'fecha_nacimiento' => '1985-01-01',
                'id_registrado_por' => $this->recepcion->id,
            ]);
        });

        $this->registrar('Carlos Alberto Martinez', '02345678-9')
            ->assertCreated()
            ->assertJsonPath('data.numeroExpediente', "CA02-{$anio}");

        // El registro competidor comparte conexión con la prueba, así que el
        // punto de guardado lo deshace junto con el intento fallido. Lo que se
        // comprueba es que el choque no termina en error y se usa otro número.
        $this->assertTrue($yaCompitio);
        $this->assertSame(1, paciente::where('numero_expediente', "CA02-{$anio}")->count());

        paciente::flushEventListeners();
    }
}
