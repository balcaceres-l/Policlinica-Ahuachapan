<?php

namespace Tests\Feature;

use App\Models\catalogo_cie10;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** HU-44 — carga del catálogo CIE-10 desde un archivo CSV. */
class ImportarCie10Test extends TestCase
{
    use RefreshDatabase;

    private string $archivo;

    protected function setUp(): void
    {
        parent::setUp();
        $this->archivo = tempnam(sys_get_temp_dir(), 'cie10');
    }

    protected function tearDown(): void
    {
        @unlink($this->archivo);
        parent::tearDown();
    }

    public function test_carga_el_catalogo_y_omite_filas_incompletas(): void
    {
        file_put_contents($this->archivo, "\xEF\xBB\xBFcodigo,descripcion\nj00,Rinofaringitis aguda\nE11.9,\"Diabetes mellitus, sin complicacion\"\n,Sin codigo\n");

        $this->artisan('cie10:importar', ['archivo' => $this->archivo])->assertSuccessful();

        $this->assertDatabaseCount('catalogo_cie10', 2);
        $this->assertDatabaseHas('catalogo_cie10', ['codigo' => 'J00', 'descripcion' => 'Rinofaringitis aguda']);
        $this->assertDatabaseHas('catalogo_cie10', ['codigo' => 'E11.9', 'descripcion' => 'Diabetes mellitus, sin complicacion']);
    }

    public function test_volver_a_cargar_actualiza_sin_duplicar(): void
    {
        catalogo_cie10::create(['codigo' => 'J00', 'descripcion' => 'Texto viejo']);
        file_put_contents($this->archivo, "codigo;descripcion\nJ00;Rinofaringitis aguda\n");

        $this->artisan('cie10:importar', ['archivo' => $this->archivo, '--delimitador' => ';'])->assertSuccessful();

        $this->assertDatabaseCount('catalogo_cie10', 1);
        $this->assertDatabaseHas('catalogo_cie10', ['codigo' => 'J00', 'descripcion' => 'Rinofaringitis aguda']);
    }

    public function test_convierte_archivos_en_latin1(): void
    {
        file_put_contents($this->archivo, "codigo,descripcion\nJ02.9,".mb_convert_encoding('Faringitis aguda no específica', 'ISO-8859-1', 'UTF-8')."\n");

        $this->artisan('cie10:importar', ['archivo' => $this->archivo])->assertSuccessful();

        $this->assertDatabaseHas('catalogo_cie10', ['codigo' => 'J02.9', 'descripcion' => 'Faringitis aguda no específica']);
    }

    public function test_falla_si_el_archivo_no_existe(): void
    {
        $this->artisan('cie10:importar', ['archivo' => '/ruta/que/no/existe.csv'])->assertFailed();
    }
}
