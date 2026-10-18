<?php

namespace Tests\Feature\Api;

use App\Models\User;
use App\Services\PaseProxyIcd;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** HU-44 — buscador CIE-11: pase del proxy, proxy hacia la OMS y jerarquía. */
class Cie11Test extends TestCase
{
    use RefreshDatabase;

    private const SECRETO = 'secreto-de-prueba-que-no-debe-salir';

    private User $medico;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.oms_icd.client_id' => 'cliente-prueba',
            'services.oms_icd.client_secret' => self::SECRETO,
            'services.oms_icd.api_url' => 'https://id.who.int',
            'services.oms_icd.api_secured' => true,
            'services.oms_icd.limite_por_minuto' => 240,
        ]);

        $this->medico = User::factory()->create(['rol' => 'MEDICO', 'estado' => 'ACTIVO']);

        // Respuestas reales de la OMS (2026-01, español), recortadas a lo que se usa.
        $entidades = [
            'https://id.who.int/icd/release/11/mms' => ['latestRelease' => 'http://id.who.int/icd/release/11/2026-01/mms'],
            'https://id.who.int/icd/release/11/2026-01/mms/761947693/unspecified' => [
                '@id' => 'http://id.who.int/icd/release/11/2026-01/mms/761947693/unspecified',
                'parent' => ['http://id.who.int/icd/release/11/2026-01/mms/761947693'],
                'code' => 'BA00.Z', 'classKind' => 'category',
                'title' => ['@language' => 'es', '@value' => 'Hipertensión esencial, sin especificación'],
            ],
            'https://id.who.int/icd/release/11/2026-01/mms/761947693' => [
                '@id' => 'http://id.who.int/icd/release/11/2026-01/mms/761947693',
                'parent' => ['http://id.who.int/icd/release/11/2026-01/mms/1802997298'],
                'code' => 'BA00', 'classKind' => 'category',
                'title' => ['@language' => 'es', '@value' => 'Hipertensión esencial'],
            ],
            'https://id.who.int/icd/release/11/2026-01/mms/1802997298' => [
                '@id' => 'http://id.who.int/icd/release/11/2026-01/mms/1802997298',
                'parent' => ['http://id.who.int/icd/release/11/2026-01/mms/426429380'],
                'code' => '', 'classKind' => 'block', 'blockId' => 'BlockL1-BA0',
                'title' => ['@language' => 'es', '@value' => 'Enfermedades hipertensivas'],
            ],
            'https://id.who.int/icd/release/11/2026-01/mms/426429380' => [
                '@id' => 'http://id.who.int/icd/release/11/2026-01/mms/426429380',
                'parent' => ['http://id.who.int/icd/release/11/2026-01/mms'],
                'code' => '11', 'classKind' => 'chapter',
                'title' => ['@language' => 'es', '@value' => 'Enfermedades del sistema circulatorio'],
            ],
            'https://id.who.int/icd/release/11/2026-01/mms/search' => ['destinationEntities' => [
                ['theCode' => 'BA00.Z', 'title' => 'Hipertensión esencial, sin especificación'],
            ]],
        ];

        Http::fake(function (Request $request) use ($entidades) {
            if (str_contains($request->url(), 'connect/token')) {
                return Http::response(['access_token' => 'token-oms', 'expires_in' => 3600, 'token_type' => 'Bearer']);
            }
            $sinQuery = strtok($request->url(), '?');

            return isset($entidades[$sinQuery]) ? Http::response($entidades[$sinQuery]) : Http::response(['error' => 'no existe'], 404);
        });
    }

    private function pase(?User $usuario = null): string
    {
        return app(PaseProxyIcd::class)->emitir($usuario ?? $this->medico)['token'];
    }

    // ── Pase para el buscador ───────────────────────────────────────────────

    public function test_un_usuario_sin_autenticar_no_obtiene_el_pase(): void
    {
        $this->getJson('/api/cie11/pase')->assertUnauthorized();
    }

    public function test_solo_el_medico_obtiene_el_pase(): void
    {
        Sanctum::actingAs(User::factory()->create(['rol' => 'RECEPCIONISTA', 'estado' => 'ACTIVO']));

        $this->getJson('/api/cie11/pase')->assertForbidden();
    }

    public function test_el_pase_es_un_jwt_con_vencimiento_y_no_expone_las_credenciales(): void
    {
        Sanctum::actingAs($this->medico);

        $respuesta = $this->getJson('/api/cie11/pase')->assertOk();
        $token = $respuesta->json('data.token');

        $partes = explode('.', $token);
        $this->assertCount(3, $partes);
        $contenido = json_decode(base64_decode(strtr($partes[1], '-_', '+/')), true);
        $this->assertSame($this->medico->id, $contenido['sub']);
        $this->assertGreaterThan(now()->getTimestamp(), $contenido['exp']);

        $this->assertStringNotContainsString(self::SECRETO, $respuesta->getContent());
        $this->assertStringNotContainsString('token-oms', $respuesta->getContent());
        Http::assertNothingSent();
    }

    // ── Proxy hacia la OMS ──────────────────────────────────────────────────

    public function test_el_proxy_reenvia_con_el_token_de_la_oms_y_en_espanol(): void
    {
        $this->withToken($this->pase())
            ->getJson('/api/oms-icd/icd/release/11/2026-01/mms/search?q=hipertension+esencial')
            ->assertOk()
            ->assertJsonPath('destinationEntities.0.theCode', 'BA00.Z');

        Http::assertSent(fn (Request $r) => str_contains($r->url(), '/mms/search')
            && str_contains($r->url(), 'q=hipertension')
            && $r->hasHeader('Authorization', 'Bearer token-oms')
            && $r->hasHeader('Accept-Language', 'es'));
    }

    public function test_el_proxy_reutiliza_el_token_de_la_oms_en_cache(): void
    {
        $pase = $this->pase();
        $this->withToken($pase)->getJson('/api/oms-icd/icd/release/11/2026-01/mms/search?q=a')->assertOk();
        $this->withToken($pase)->getJson('/api/oms-icd/icd/release/11/2026-01/mms/search?q=b')->assertOk();

        Http::assertSentCount(3); // 1 token + 2 búsquedas
    }

    public function test_el_proxy_rechaza_sin_pase_con_pase_falso_o_vencido(): void
    {
        $ruta = '/api/oms-icd/icd/release/11/2026-01/mms/search?q=a';

        $this->getJson($ruta)->assertUnauthorized();
        $this->withToken('cualquier.cosa.inventada')->getJson($ruta)->assertUnauthorized();

        $pase = $this->pase();
        $this->travel(16)->minutes();
        $this->withToken($pase)->getJson($ruta)->assertUnauthorized();

        Http::assertNothingSent();
    }

    public function test_el_proxy_rechaza_el_pase_de_un_medico_desactivado(): void
    {
        $pase = $this->pase();
        $this->medico->update(['estado' => 'INACTIVO']);

        $this->withToken($pase)->getJson('/api/oms-icd/icd/release/11/2026-01/mms/search?q=a')->assertUnauthorized();
    }

    public function test_el_proxy_no_acepta_el_token_de_sesion_normal(): void
    {
        $sesion = $this->medico->createToken('web')->plainTextToken;

        $this->withToken($sesion)->getJson('/api/oms-icd/icd/release/11/2026-01/mms/search?q=a')->assertUnauthorized();
    }

    public function test_el_proxy_solo_permite_rutas_de_la_cie11(): void
    {
        $pase = $this->pase();

        $this->withToken($pase)->getJson('/api/oms-icd/icd/release/10/2019/J02.9')->assertNotFound();
        $this->withToken($pase)->getJson('/api/oms-icd/icd/release/11/../../../otra')->assertNotFound();
        Http::assertNothingSent();
    }

    public function test_las_analiticas_de_la_herramienta_no_se_envian_a_la_oms(): void
    {
        $this->withToken($this->pase())->postJson('/api/oms-icd/analytics/clientanalytics', ['bestMatchingText' => 'x'])
            ->assertNoContent();

        Http::assertNothingSent();
    }

    public function test_el_proxy_limita_las_peticiones_por_minuto(): void
    {
        config(['services.oms_icd.limite_por_minuto' => 3]);
        $pase = $this->pase();
        $ruta = '/api/oms-icd/icd/release/11/2026-01/mms/search?q=a';

        foreach (range(1, 3) as $_) {
            $this->withToken($pase)->getJson($ruta)->assertOk();
        }
        $this->withToken($pase)->getJson($ruta)->assertStatus(429);
    }

    public function test_si_la_oms_no_responde_avisa_y_sugiere_texto_libre(): void
    {
        Http::fake(fn () => throw new ConnectionException('sin red'));

        $this->withToken($this->pase())->getJson('/api/oms-icd/icd/release/11/2026-01/mms/search?q=a')
            ->assertStatus(502)
            ->assertJsonPath('success', false);
    }

    // ── Configuración y jerarquía ───────────────────────────────────────────

    public function test_la_configuracion_indica_la_version_vigente(): void
    {
        Sanctum::actingAs($this->medico);

        $this->getJson('/api/cie11/configuracion')
            ->assertOk()
            ->assertJsonPath('data.release', '2026-01')
            ->assertJsonPath('data.idioma', 'es');
    }

    public function test_devuelve_bloque_y_capitulo_en_espanol_de_una_categoria_guardada(): void
    {
        Sanctum::actingAs(User::factory()->create(['rol' => 'RECEPCIONISTA', 'estado' => 'ACTIVO']));
        $uri = 'http://id.who.int/icd/release/11/2026-01/mms/761947693/unspecified';

        $this->getJson('/api/cie11/jerarquia?uri='.urlencode($uri))
            ->assertOk()
            ->assertJsonPath('data.categoria.codigo', 'BA00.Z')
            ->assertJsonPath('data.bloque.titulo', 'Enfermedades hipertensivas')
            ->assertJsonPath('data.bloque.codigo', null)
            ->assertJsonPath('data.bloque.block_id', 'BlockL1-BA0')
            ->assertJsonPath('data.capitulo.codigo', '11')
            ->assertJsonPath('data.capitulo.titulo', 'Enfermedades del sistema circulatorio');

        Http::assertSent(fn (Request $r) => $r->hasHeader('Accept-Language', 'es'));
    }

    public function test_la_jerarquia_se_guarda_en_cache(): void
    {
        Sanctum::actingAs($this->medico);
        $url = '/api/cie11/jerarquia?uri='.urlencode('http://id.who.int/icd/release/11/2026-01/mms/761947693/unspecified');

        $this->getJson($url)->assertOk();
        $enviadas = count(Http::recorded());
        $this->getJson($url)->assertOk();

        $this->assertCount($enviadas, Http::recorded());
    }

    public function test_la_jerarquia_solo_acepta_uris_de_la_cie11(): void
    {
        Sanctum::actingAs($this->medico);

        $this->getJson('/api/cie11/jerarquia?uri='.urlencode('https://ejemplo.com/algo'))->assertStatus(422);
        $this->getJson('/api/cie11/jerarquia?uri='.urlencode('http://id.who.int/icd/release/10/2019/J02.9'))->assertStatus(422);
    }
}
