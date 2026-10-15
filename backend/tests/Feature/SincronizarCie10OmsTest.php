<?php

namespace Tests\Feature;

use App\Models\catalogo_cie10;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** HU-44 — catálogo CIE-10 con la lista de la OMS y descripciones oficiales en español. */
class SincronizarCie10OmsTest extends TestCase
{
    use RefreshDatabase;

    private const API = 'https://id.who.int/icd/release/10/2019';

    private string $espanol;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.oms_icd.client_id' => 'cliente-prueba',
            'services.oms_icd.client_secret' => 'secreto-prueba',
            'services.oms_icd.release_cie10' => '2019',
        ]);

        // Formato del catálogo oficial en español: códigos sin punto y con X de relleno.
        $this->espanol = tempnam(sys_get_temp_dir(), 'cie10es');
        file_put_contents($this->espanol, "codigo,descripcion\nJ00X,RINOFARINGITIS AGUDA [RESFRIADO COMÚN]\nJ029,\"FARINGITIS AGUDA, NO ESPECIFICADA\"\nE119,\"DIABETES MELLITUS TIPO 2, SIN MENCIÓN DE COMPLICACIÓN\"\nZ999,CODIGO QUE LA OMS NO TIENE\n");

        // Árbol mínimo: capítulo → bloque → J00 (sin subdivisiones) y J02 (con J02.0 y J02.9).
        $entidades = [
            self::API => ['child' => ['http://id.who.int/icd/release/10/2019/X']],
            self::API.'/X' => ['classKind' => 'chapter', 'code' => 'X', 'child' => ['http://id.who.int/icd/release/10/2019/J00-J06', 'http://id.who.int/icd/release/10/2019/E10-E14']],
            // Subdivisiones compartidas del bloque: la OMS las marca como `modifiedcategory`.
            self::API.'/E10-E14' => ['classKind' => 'block', 'code' => 'E10-E14', 'child' => ['http://id.who.int/icd/release/10/2019/E11']],
            self::API.'/E11' => ['classKind' => 'category', 'code' => 'E11', 'title' => ['@value' => 'Type 2 diabetes mellitus'], 'child' => ['http://id.who.int/icd/release/10/2019/E11.9']],
            self::API.'/E11.9' => ['classKind' => 'modifiedcategory', 'code' => 'E11.9', 'title' => ['@value' => 'Type 2 diabetes mellitus without complications']],
            self::API.'/J00-J06' => ['classKind' => 'block', 'code' => 'J00-J06', 'child' => [
                'http://id.who.int/icd/release/10/2019/J00',
                'http://id.who.int/icd/release/10/2019/J02',
            ]],
            self::API.'/J00' => ['classKind' => 'category', 'code' => 'J00', 'title' => ['@language' => 'en', '@value' => 'Acute nasopharyngitis [common cold]']],
            self::API.'/J02' => ['classKind' => 'category', 'code' => 'J02', 'title' => ['@value' => 'Acute pharyngitis'], 'child' => [
                'http://id.who.int/icd/release/10/2019/J02.0',
                'http://id.who.int/icd/release/10/2019/J02.9',
            ]],
            self::API.'/J02.0' => ['classKind' => 'category', 'code' => 'J02.0', 'title' => ['@value' => 'Streptococcal pharyngitis']],
            self::API.'/J02.9' => ['classKind' => 'category', 'code' => 'J02.9', 'title' => ['@value' => 'Acute pharyngitis, unspecified']],
        ];

        Http::fake(function (Request $request) use ($entidades) {
            if (str_contains($request->url(), 'connect/token')) {
                return Http::response(['access_token' => 'token-prueba', 'expires_in' => 3600]);
            }

            return isset($entidades[$request->url()])
                ? Http::response($entidades[$request->url()])
                : Http::response(['error' => 'no existe'], 404);
        });
    }

    protected function tearDown(): void
    {
        @unlink($this->espanol);
        parent::tearDown();
    }

    public function test_carga_solo_los_codigos_registrables_de_la_oms_con_su_descripcion_en_espanol(): void
    {
        catalogo_cie10::create(['codigo' => 'VIEJO', 'descripcion' => 'Fila que la OMS ya no trae']);

        $this->artisan('cie10:sincronizar-oms', ['--descripciones' => $this->espanol, '--minimo' => 1])
            ->assertSuccessful();

        $this->assertSame(['E11.9', 'J00', 'J02.0', 'J02.9'], catalogo_cie10::orderBy('codigo')->pluck('codigo')->all());
        $this->assertDatabaseHas('catalogo_cie10', ['codigo' => 'E11.9', 'descripcion' => 'DIABETES MELLITUS TIPO 2, SIN MENCIÓN DE COMPLICACIÓN']);

        $this->assertDatabaseHas('catalogo_cie10', [
            'codigo' => 'J00',
            'descripcion' => 'RINOFARINGITIS AGUDA [RESFRIADO COMÚN]',
            'titulo_oms' => 'Acute nasopharyngitis [common cold]',
            'version_oms' => '2019',
        ]);
        $this->assertDatabaseHas('catalogo_cie10', ['codigo' => 'J02.9', 'descripcion' => 'FARINGITIS AGUDA, NO ESPECIFICADA']);
        // Sin traducción oficial queda el título de la OMS.
        $this->assertDatabaseHas('catalogo_cie10', ['codigo' => 'J02.0', 'descripcion' => 'Streptococcal pharyngitis']);

        Http::assertSent(fn (Request $r) => $r->hasHeader('API-Version', 'v2') && $r->hasHeader('Authorization', 'Bearer token-prueba'));
        Http::assertSent(fn (Request $r) => str_starts_with($r->url(), 'https://id.who.int/icd/release/10/2019/J02.9'));
    }

    public function test_sin_credenciales_no_toca_el_catalogo(): void
    {
        config(['services.oms_icd.client_id' => null]);
        catalogo_cie10::create(['codigo' => 'J00', 'descripcion' => 'Se queda']);

        $this->artisan('cie10:sincronizar-oms', ['--descripciones' => $this->espanol])->assertFailed();

        $this->assertDatabaseCount('catalogo_cie10', 1);
        Http::assertNothingSent();
    }

    public function test_si_la_oms_devuelve_muy_pocos_codigos_no_toca_el_catalogo(): void
    {
        catalogo_cie10::create(['codigo' => 'J00', 'descripcion' => 'Se queda']);

        $this->artisan('cie10:sincronizar-oms', ['--descripciones' => $this->espanol, '--minimo' => 100])->assertFailed();

        $this->assertDatabaseHas('catalogo_cie10', ['codigo' => 'J00', 'descripcion' => 'Se queda']);
        $this->assertDatabaseCount('catalogo_cie10', 1);
    }

    public function test_el_buscador_tambien_encuentra_por_el_titulo_de_la_oms(): void
    {
        $this->artisan('cie10:sincronizar-oms', ['--descripciones' => $this->espanol, '--minimo' => 1])->assertSuccessful();
        Sanctum::actingAs(User::factory()->create(['rol' => 'MEDICO', 'estado' => 'ACTIVO']));

        $this->getJson('/api/catalogo/cie10?buscar=common+cold')
            ->assertOk()
            ->assertJsonPath('data.0.codigo', 'J00')
            ->assertJsonPath('data.0.descripcion', 'RINOFARINGITIS AGUDA [RESFRIADO COMÚN]');
    }
}
