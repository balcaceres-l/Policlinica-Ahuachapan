<?php

namespace Tests\Feature\Api;

use App\Models\paciente;
use App\Models\responsable;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PacienteTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $recepcion;
    private User $medico;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['rol' => 'ADMINISTRADOR', 'estado' => 'ACTIVO']);
        $this->recepcion = User::factory()->create(['rol' => 'RECEPCIONISTA', 'estado' => 'ACTIVO']);
        $this->medico = User::factory()->create(['rol' => 'MEDICO', 'estado' => 'ACTIVO']);
    }

    public function test_recepcionista_puede_registrar_paciente_adulto_con_dui(): void
    {
        $payload = [
            'nombre_completo' => 'Carlos Alberto Martinez',
            'fecha_nacimiento' => '1995-04-10',
            'dui' => '02345678-9',
            'telefono' => '7111-2222',
            'direccion' => 'Ahuachapan Centro',
        ];

        $res = $this->actingAs($this->recepcion)
            ->postJson('/api/pacientes', $payload)
            ->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.nombreCompleto', 'Carlos Alberto Martinez')
            ->assertJsonPath('data.dui', '02345678-9')
            ->assertJsonPath('data.telefono', '7111-2222')
            ->assertJsonPath('data.esMenorEdad', false)
            ->assertJsonPath('data.estado', 'ACTIVO');

        $expediente = $res->json('data.numeroExpediente');
        $this->assertMatchesRegularExpression('/^CA\d{2}-\d{4}$/', $expediente);

        // Verificar que en la base de datos se almacena cifrado
        $p = paciente::where('numero_expediente', $expediente)->first();
        $this->assertNotNull($p);
        $this->assertNotEquals('Carlos Alberto Martinez', $p->getAttributes()['nombre_completo']);
        $this->assertNotEquals('02345678-9', $p->getAttributes()['dui']);
    }

    public function test_medico_puede_registrar_paciente_adulto_con_pasaporte(): void
    {
        $payload = [
            'nombre_completo' => 'John David Smith',
            'fecha_nacimiento' => '1988-12-05',
            'dui' => 'A12345678', // Pasaporte guardado en campo dui
            'telefono' => '7888-9999',
        ];

        $this->actingAs($this->medico)
            ->postJson('/api/pacientes', $payload)
            ->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.nombreCompleto', 'John David Smith')
            ->assertJsonPath('data.dui', 'A12345678')
            ->assertJsonPath('data.tipoDocumento', 'PASAPORTE')
            ->assertJsonPath('data.esMenorEdad', false);
    }

    public function test_administrador_no_puede_registrar_pacientes(): void
    {
        $payload = [
            'nombre_completo' => 'Paciente Intento Admin',
            'fecha_nacimiento' => '1990-01-01',
            'dui' => '09876543-2',
        ];

        $this->actingAs($this->admin)
            ->postJson('/api/pacientes', $payload)
            ->assertStatus(403);
    }

    public function test_menor_de_edad_no_pide_doc_ni_telefono_al_menor_y_exige_responsable(): void
    {
        $payload = [
            'nombre_completo' => 'Lucas Alexander Gomez',
            'fecha_nacimiento' => '2019-06-15', // 7 años -> Menor de edad
            // Sin dui ni telefono para el menor
            'responsable_nombre' => 'Ana Beatriz Gomez',
            'responsable_documento' => '05678901-2',
            'responsable_telefono' => '7333-4444',
            'responsable_parentesco' => 'Madre',
        ];

        $res = $this->actingAs($this->recepcion)
            ->postJson('/api/pacientes', $payload)
            ->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.esMenorEdad', true)
            ->assertJsonPath('data.dui', null)
            ->assertJsonPath('data.telefono', null)
            ->assertJsonPath('data.responsableNombre', 'Ana Beatriz Gomez')
            ->assertJsonPath('data.responsableDocumento', '05678901-2')
            ->assertJsonPath('data.responsableTelefono', '7333-4444')
            ->assertJsonPath('data.responsableParentesco', 'Madre');

        $expediente = $res->json('data.numeroExpediente');
        $this->assertMatchesRegularExpression('/^LA\d{2}-\d{4}$/', $expediente);
    }

    public function test_responsable_guarda_documento_en_campo_dui_y_se_reutiliza_si_ya_existe(): void
    {
        // Primer hijo
        $payload1 = [
            'nombre_completo' => 'Hermano Mayor Gomez',
            'fecha_nacimiento' => '2015-02-10',
            'responsable_nombre' => 'Ana Beatriz Gomez',
            'responsable_documento' => 'PAS123456', // Pasaporte en campo dui
            'responsable_telefono' => '7333-4444',
            'responsable_parentesco' => 'Madre',
        ];

        $res1 = $this->actingAs($this->recepcion)
            ->postJson('/api/pacientes', $payload1)
            ->assertStatus(201);

        $idResponsable1 = $res1->json('data.id_responsable');

        // Segundo hijo con el mismo documento de responsable
        $payload2 = [
            'nombre_completo' => 'Hermano Menor Gomez',
            'fecha_nacimiento' => '2020-08-20',
            'responsable_nombre' => 'Ana Beatriz Gomez',
            'responsable_documento' => 'PAS123456',
            'responsable_telefono' => '7333-4444',
            'responsable_parentesco' => 'Madre',
        ];

        $res2 = $this->actingAs($this->recepcion)
            ->postJson('/api/pacientes', $payload2)
            ->assertStatus(201);

        $idResponsable2 = $res2->json('data.id_responsable');

        // Mismo ID de responsable reutilizado sin fallar
        $this->assertSame($idResponsable1, $idResponsable2);
        $this->assertSame(1, responsable::count());
    }

    public function test_adulto_sin_documento_de_identidad_es_rechazado(): void
    {
        $payload = [
            'nombre_completo' => 'Adulto Sin Documento',
            'fecha_nacimiento' => '1992-03-15',
            // dui omitido
        ];

        $this->actingAs($this->recepcion)
            ->postJson('/api/pacientes', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['dui']);
    }

    public function test_duplicado_de_dui_en_paciente_adulto_es_rechazado(): void
    {
        $payload = [
            'nombre_completo' => 'Primer Paciente',
            'fecha_nacimiento' => '1990-01-01',
            'dui' => '03333333-3',
        ];

        $this->actingAs($this->recepcion)->postJson('/api/pacientes', $payload)->assertStatus(201);

        // Intento con mismo DUI
        $payload2 = [
            'nombre_completo' => 'Segundo Paciente',
            'fecha_nacimiento' => '1992-02-02',
            'dui' => '03333333-3',
        ];

        $this->actingAs($this->recepcion)
            ->postJson('/api/pacientes', $payload2)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['dui']);
    }

    public function test_soft_delete_marca_paciente_como_fallecido(): void
    {
        $paciente = paciente::create([
            'numero_expediente' => 'PA01-2026',
            'nombre_completo' => 'Paciente Para Eliminar',
            'fecha_nacimiento' => '1980-05-20',
            'dui' => '04444444-4',
            'estado' => 'ACTIVO',
            'id_registrado_por' => $this->recepcion->id,
        ]);

        $this->actingAs($this->recepcion)
            ->deleteJson("/api/pacientes/{$paciente->id_paciente}")
            ->assertStatus(200)
            ->assertJsonPath('data.estado', 'FALLECIDO');

        // La fila física sigue existiendo en BD con estado FALLECIDO
        $this->assertDatabaseHas('paciente', [
            'id_paciente' => $paciente->id_paciente,
            'estado' => 'FALLECIDO',
        ]);
    }

    public function test_listado_por_defecto_muestra_solo_activos_y_filtros_funcionan(): void
    {
        $activo = paciente::create([
            'numero_expediente' => 'AC01-2026',
            'nombre_completo' => 'Paciente Activo',
            'fecha_nacimiento' => '1990-01-01',
            'dui' => '05555555-5',
            'estado' => 'ACTIVO',
            'id_registrado_por' => $this->recepcion->id,
        ]);

        $fallecido = paciente::create([
            'numero_expediente' => 'FA01-2026',
            'nombre_completo' => 'Paciente Fallecido',
            'fecha_nacimiento' => '1970-01-01',
            'dui' => '06666666-6',
            'estado' => 'FALLECIDO',
            'id_registrado_por' => $this->recepcion->id,
        ]);

        // Por defecto: solo activos
        $this->actingAs($this->recepcion)
            ->getJson('/api/pacientes')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $activo->id_paciente);

        // Filtro estado = FALLECIDO
        $this->actingAs($this->recepcion)
            ->getJson('/api/pacientes?estado=FALLECIDO')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $fallecido->id_paciente);

        // Filtro estado = TODOS
        $this->actingAs($this->recepcion)
            ->getJson('/api/pacientes?estado=TODOS')
            ->assertStatus(200)
            ->assertJsonCount(2, 'data');
    }

    public function test_busqueda_de_paciente_por_nombre_expediente_y_documento(): void
    {
        paciente::create([
            'numero_expediente' => 'RA01-2026',
            'nombre_completo' => 'Roberto Alexander Ramos',
            'fecha_nacimiento' => '1992-06-10',
            'dui' => '07777777-7',
            'estado' => 'ACTIVO',
            'id_registrado_por' => $this->recepcion->id,
        ]);

        paciente::create([
            'numero_expediente' => 'ME01-2026',
            'nombre_completo' => 'Maria Elena Vasquez',
            'fecha_nacimiento' => '1985-09-12',
            'dui' => '08888888-8',
            'estado' => 'ACTIVO',
            'id_registrado_por' => $this->recepcion->id,
        ]);

        // Buscar por nombre parcial
        $this->actingAs($this->recepcion)
            ->getJson('/api/pacientes?buscar=Alexander')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.nombreCompleto', 'Roberto Alexander Ramos');

        // Buscar por expediente
        $this->actingAs($this->recepcion)
            ->getJson('/api/pacientes?buscar=ME01-2026')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.nombreCompleto', 'Maria Elena Vasquez');

        // Buscar por DUI
        $this->actingAs($this->recepcion)
            ->getJson('/api/pacientes?buscar=07777777-7')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.nombreCompleto', 'Roberto Alexander Ramos');
    }
}
