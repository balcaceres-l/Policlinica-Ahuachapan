<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** HU-06 — Listado de usuarios con filtros. */
class ListadoUsuariosTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Sanctum::actingAs(User::factory()->create([
            'nombre_completo' => 'Katherinne Algarín',
            'usuario' => 'kalgarin@policlinica.com',
            'rol' => 'ADMINISTRADOR',
            'estado' => 'ACTIVO',
        ]));

        User::factory()->create([
            'nombre_completo' => 'Elena Ramirez Alfaro',
            'usuario' => 'eramirez@policlinica.com',
            'rol' => 'MEDICO',
            'estado' => 'ACTIVO',
        ]);
        User::factory()->create([
            'nombre_completo' => 'Ana Menjivar',
            'usuario' => 'amenjivar@policlinica.com',
            'rol' => 'MEDICO',
            'estado' => 'INACTIVO',
        ]);
        User::factory()->create([
            'nombre_completo' => 'Karla Solorzano',
            'usuario' => 'ksolorzano@policlinica.com',
            'rol' => 'RECEPCIONISTA',
            'estado' => 'ACTIVO',
        ]);
    }

    public function test_lista_todos_los_usuarios_sin_filtros(): void
    {
        $this->getJson('/api/usuarios')->assertOk()->assertJsonCount(4, 'data');
    }

    public function test_filtra_por_rol(): void
    {
        $this->getJson('/api/usuarios?rol=MEDICO')->assertOk()->assertJsonCount(2, 'data');
    }

    public function test_filtra_por_estado(): void
    {
        $this->getJson('/api/usuarios?estado=INACTIVO')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.usuario', 'amenjivar@policlinica.com');
    }

    public function test_combina_rol_y_estado(): void
    {
        $this->getJson('/api/usuarios?rol=MEDICO&estado=ACTIVO')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.usuario', 'eramirez@policlinica.com');
    }

    public function test_busca_por_nombre_parcial(): void
    {
        $this->getJson('/api/usuarios?buscar=Ramirez')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.nombreCompleto', 'Elena Ramirez Alfaro');
    }

    public function test_busca_por_usuario(): void
    {
        $this->getJson('/api/usuarios?buscar=ksolorzano')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.rol', 'RECEPCIONISTA');
    }

    public function test_la_busqueda_sin_coincidencias_devuelve_lista_vacia(): void
    {
        $this->getJson('/api/usuarios?buscar=nadie')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_ordena_alfabeticamente_por_nombre(): void
    {
        $nombres = $this->getJson('/api/usuarios')->json('data.*.nombreCompleto');

        $ordenados = $nombres;
        sort($ordenados, SORT_NATURAL | SORT_FLAG_CASE);

        $this->assertSame($ordenados, $nombres);
    }

    public function test_rechaza_un_rol_fuera_del_catalogo(): void
    {
        $this->getJson('/api/usuarios?rol=LABORATORIO')->assertStatus(422);
    }

    public function test_la_respuesta_no_expone_la_contrasena(): void
    {
        $respuesta = $this->getJson('/api/usuarios')->assertOk();

        $this->assertStringNotContainsString('password', $respuesta->getContent());
    }

    public function test_recepcionista_y_medico_no_pueden_listar_usuarios(): void
    {
        foreach (['RECEPCIONISTA', 'MEDICO'] as $rol) {
            Sanctum::actingAs(User::factory()->create(['rol' => $rol, 'estado' => 'ACTIVO']));

            $this->getJson('/api/usuarios')->assertForbidden();

            $this->app['auth']->forgetGuards();
        }
    }
}
