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

    public function test_recepcionista_puede_registrar_paciente_adulto_con_pasaporte(): void
    {
        $payload = [
            'nombre_completo' => 'John David Smith',
            'fecha_nacimiento' => '1988-12-05',
            'dui' => 'A12345678', // Pasaporte guardado en campo dui
            'telefono' => '7888-9999',
        ];

        $this->actingAs($this->recepcion)
            ->postJson('/api/pacientes', $payload)
            ->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.nombreCompleto', 'John David Smith')
            ->assertJsonPath('data.dui', 'A12345678')
            ->assertJsonPath('data.tipoDocumento', 'PASAPORTE')
            ->assertJsonPath('data.esMenorEdad', false);
    }

    /** Consulta inmediata: el médico registra y la recepcionista completa después. */
    public function test_el_medico_registra_paciente_y_queda_con_datos_pendientes(): void
    {
        $payload = [
            'nombre_completo' => 'Paciente Sin Cita',
            'fecha_nacimiento' => '1990-01-01',
            'dui' => '01234567-8',
        ];

        $id = $this->actingAs($this->medico)
            ->postJson('/api/pacientes', $payload)
            ->assertStatus(201)
            ->assertJsonPath('data.datosPendientes', true)
            ->json('data.id');

        $this->actingAs($this->recepcion)
            ->getJson('/api/pacientes?pendientes=1')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $id);

        // La recepcionista termina de llenar el registro y deja de estar pendiente.
        $this->actingAs($this->recepcion)
            ->putJson("/api/pacientes/{$id}", [
                'nombre_completo' => 'Paciente Sin Cita',
                'telefono' => '7111-2222',
                'direccion' => 'Ahuachapán',
            ])
            ->assertOk()
            ->assertJsonPath('data.datosPendientes', false);

        $this->actingAs($this->recepcion)
            ->getJson('/api/pacientes?pendientes=1')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_lo_que_registra_la_recepcionista_no_queda_pendiente(): void
    {
        $this->actingAs($this->recepcion)
            ->postJson('/api/pacientes', [
                'nombre_completo' => 'Paciente de Recepcion',
                'fecha_nacimiento' => '1990-01-01',
                'dui' => '01234567-8',
            ])
            ->assertStatus(201)
            ->assertJsonPath('data.datosPendientes', false);
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

    public function test_recepcionista_puede_editar_paciente_adulto_sin_modificar_dui_ni_fecha_nacimiento(): void
    {
        $paciente = paciente::create([
            'numero_expediente' => 'CR01-2026',
            'nombre_completo' => 'Carlos Ramos',
            'fecha_nacimiento' => '1990-05-15',
            'dui' => '01234567-8',
            'telefono' => '7000-0000',
            'direccion' => 'Direccion Vieja',
            'es_menor_edad' => false,
            'estado' => 'ACTIVO',
            'id_registrado_por' => $this->recepcion->id,
        ]);

        $payload = [
            'nombre_completo' => 'Carlos Alberto Ramos Corregido',
            'telefono' => '7999-8888',
            'direccion' => 'Nueva Direccion Ahuachapan',
            // Intentar alterar DUI y fecha de nacimiento (deben ignorarse)
            'dui' => '99999999-9',
            'fecha_nacimiento' => '2000-01-01',
        ];

        $this->actingAs($this->recepcion)
            ->putJson("/api/pacientes/{$paciente->id_paciente}", $payload)
            ->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.nombreCompleto', 'Carlos Alberto Ramos Corregido')
            ->assertJsonPath('data.telefono', '7999-8888')
            ->assertJsonPath('data.direccion', 'Nueva Direccion Ahuachapan')
            ->assertJsonPath('data.dui', '01234567-8') // El DUI original NO cambia
            ->assertJsonPath('data.fechaNacimiento', '1990-05-15'); // La fecha original NO cambia

        $paciente->refresh();
        $this->assertEquals('Carlos Alberto Ramos Corregido', $paciente->nombre_completo);
        $this->assertEquals('01234567-8', $paciente->dui);
        $this->assertEquals('1990-05-15', $paciente->fecha_nacimiento->toDateString());
    }

    public function test_quien_cumple_la_mayoria_de_edad_pasa_a_adulto_y_puede_agregar_su_documento(): void
    {
        $resp = responsable::create([
            'nombre_completo' => 'Madre Ramos',
            'dui' => '04444444-4',
            'telefono' => '7000-1111',
            'parentesco' => 'Madre',
        ]);
        // Se registró de menor hace años; hoy ya tiene más de 18.
        $paciente = paciente::create([
            'numero_expediente' => 'JR01-2026',
            'nombre_completo' => 'Joven Ramos',
            'fecha_nacimiento' => now()->subYears(19)->toDateString(),
            'dui' => null,
            'es_menor_edad' => true,
            'estado' => 'ACTIVO',
            'id_responsable' => $resp->id_responsable,
            'id_registrado_por' => $this->recepcion->id,
        ]);

        // El listado ya lo muestra como adulto.
        $this->actingAs($this->recepcion)
            ->getJson('/api/pacientes?categoria=ADULTO')
            ->assertOk()
            ->assertJsonFragment(['id_paciente' => $paciente->id_paciente]);

        // Aparece entre los pendientes por completar, con la marca de documento pendiente.
        $this->actingAs($this->recepcion)
            ->getJson('/api/pacientes?pendientes=1')
            ->assertOk()
            ->assertJsonPath('data.0.id_paciente', $paciente->id_paciente)
            ->assertJsonPath('data.0.documento_pendiente', true);

        // Agrega su documento; el formato se valida igual que al registrar.
        $this->actingAs($this->recepcion)
            ->putJson("/api/pacientes/{$paciente->id_paciente}", [
                'nombre_completo' => 'Joven Ramos',
                'telefono' => '7123-4567',
                'dui' => 'no-es-un-dui!',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('dui');

        $this->actingAs($this->recepcion)
            ->putJson("/api/pacientes/{$paciente->id_paciente}", [
                'nombre_completo' => 'Joven Ramos',
                'telefono' => '7123-4567',
                'dui' => '05555555-5',
            ])
            ->assertOk()
            ->assertJsonPath('data.dui', '05555555-5')
            ->assertJsonPath('data.es_menor_edad', false)
            ->assertJsonPath('data.documento_pendiente', false);

        // Con el documento agregado ya no queda pendiente.
        $this->actingAs($this->recepcion)
            ->getJson('/api/pacientes?pendientes=1')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        // Una vez agregado, ya no se cambia.
        $this->actingAs($this->recepcion)
            ->putJson("/api/pacientes/{$paciente->id_paciente}", [
                'nombre_completo' => 'Joven Ramos',
                'dui' => '06666666-6',
            ])
            ->assertOk()
            ->assertJsonPath('data.dui', '05555555-5');
    }

    public function test_un_menor_puede_tener_pasaporte_propio_opcional(): void
    {
        $datos = [
            'nombre_completo' => 'Niña Con Pasaporte',
            'fecha_nacimiento' => now()->subYears(8)->toDateString(),
            'responsable_nombre' => 'Madre Pasaporte',
            'responsable_documento' => '08888888-8',
            'responsable_telefono' => '7000-2222',
            'responsable_parentesco' => 'Madre',
        ];

        // Sin documento propio sigue siendo válido.
        $this->actingAs($this->recepcion)
            ->postJson('/api/pacientes', $datos)
            ->assertCreated()
            ->assertJsonPath('data.dui', null);

        // Con pasaporte, se guarda; el del responsable no cambia.
        $this->actingAs($this->recepcion)
            ->postJson('/api/pacientes', [...$datos, 'nombre_completo' => 'Niño Con Pasaporte', 'dui' => 'P1234567'])
            ->assertCreated()
            ->assertJsonPath('data.dui', 'P1234567')
            ->assertJsonPath('data.tipo_documento', 'PASAPORTE')
            ->assertJsonPath('data.responsable_documento', '08888888-8')
            ->assertJsonPath('data.es_menor_edad', true);

        // Un documento mal escrito o repetido se rechaza como en los adultos.
        $this->actingAs($this->recepcion)
            ->postJson('/api/pacientes', [...$datos, 'nombre_completo' => 'Otro Niño', 'dui' => 'P1234567'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('dui');
    }

    public function test_se_agrega_pasaporte_a_un_menor_ya_registrado_una_sola_vez(): void
    {
        $resp = responsable::create([
            'nombre_completo' => 'Madre Menor',
            'dui' => '09999999-9',
            'telefono' => '7000-3333',
            'parentesco' => 'Madre',
        ]);
        $menor = paciente::create([
            'numero_expediente' => 'MP01-2026',
            'nombre_completo' => 'Menor Sin Doc',
            'fecha_nacimiento' => now()->subYears(10)->toDateString(),
            'dui' => null,
            'es_menor_edad' => true,
            'estado' => 'ACTIVO',
            'id_responsable' => $resp->id_responsable,
            'id_registrado_por' => $this->recepcion->id,
        ]);
        $datos = [
            'nombre_completo' => 'Menor Sin Doc',
            'responsable_nombre' => 'Madre Menor',
            'responsable_telefono' => '7000-3333',
            'responsable_parentesco' => 'Madre',
        ];

        $this->actingAs($this->recepcion)
            ->putJson("/api/pacientes/{$menor->id_paciente}", [...$datos, 'dui' => 'AB123456'])
            ->assertOk()
            ->assertJsonPath('data.dui', 'AB123456')
            ->assertJsonPath('data.es_menor_edad', true)
            ->assertJsonPath('data.documento_pendiente', false);

        $this->actingAs($this->recepcion)
            ->putJson("/api/pacientes/{$menor->id_paciente}", [...$datos, 'dui' => 'ZZ999999'])
            ->assertOk()
            ->assertJsonPath('data.dui', 'AB123456');
    }

    public function test_registro_rapido_de_emergencia_solo_pide_nombre_y_fecha_de_nacimiento(): void
    {
        // Adulto: sin documento ni teléfono, queda pendiente.
        $adulto = $this->actingAs($this->recepcion)
            ->postJson('/api/pacientes', [
                'nombre_completo' => 'Paciente de Emergencia',
                'fecha_nacimiento' => now()->subYears(40)->toDateString(),
                'registro_rapido' => true,
            ])
            ->assertCreated()
            ->assertJsonPath('data.datos_pendientes', true)
            ->assertJsonPath('data.documento_pendiente', true)
            ->assertJsonPath('data.dui', null)
            ->assertJsonPath('data.es_menor_edad', false);

        // Menor: sin responsable, queda pendiente.
        $this->actingAs($this->recepcion)
            ->postJson('/api/pacientes', [
                'nombre_completo' => 'Niña de Emergencia',
                'fecha_nacimiento' => now()->subYears(6)->toDateString(),
                'registro_rapido' => true,
            ])
            ->assertCreated()
            ->assertJsonPath('data.datos_pendientes', true)
            ->assertJsonPath('data.responsable_pendiente', true)
            ->assertJsonPath('data.es_menor_edad', true);

        // Sin el registro rápido las reglas de siempre siguen vigentes.
        $this->actingAs($this->recepcion)
            ->postJson('/api/pacientes', [
                'nombre_completo' => 'Sin Documento',
                'fecha_nacimiento' => now()->subYears(40)->toDateString(),
            ])
            ->assertStatus(422);

        // Sigue pendiente aunque la recepcionista lo edite sin agregar el documento…
        $id = $adulto->json('data.id');
        $this->actingAs($this->recepcion)
            ->putJson("/api/pacientes/{$id}", ['nombre_completo' => 'Paciente de Emergencia', 'direccion' => 'Calle 1'])
            ->assertOk()
            ->assertJsonPath('data.datos_pendientes', true);

        // …y deja de estarlo cuando ya tiene el documento.
        $this->actingAs($this->recepcion)
            ->putJson("/api/pacientes/{$id}", ['nombre_completo' => 'Paciente de Emergencia', 'dui' => '01111111-1'])
            ->assertOk()
            ->assertJsonPath('data.datos_pendientes', false)
            ->assertJsonPath('data.documento_pendiente', false);
    }

    public function test_se_agrega_el_responsable_a_un_menor_registrado_en_emergencia(): void
    {
        $id = $this->actingAs($this->recepcion)
            ->postJson('/api/pacientes', [
                'nombre_completo' => 'Niño de Emergencia',
                'fecha_nacimiento' => now()->subYears(4)->toDateString(),
                'registro_rapido' => true,
            ])
            ->assertCreated()->json('data.id');

        // Los datos del responsable van completos o no van.
        $this->actingAs($this->recepcion)
            ->putJson("/api/pacientes/{$id}", [
                'nombre_completo' => 'Niño de Emergencia',
                'responsable_nombre' => 'Madre del Niño',
            ])
            ->assertStatus(422);

        $this->actingAs($this->recepcion)
            ->putJson("/api/pacientes/{$id}", [
                'nombre_completo' => 'Niño de Emergencia',
                'responsable_nombre' => 'Madre del Niño',
                'responsable_documento' => '02222222-2',
                'responsable_telefono' => '7000-5555',
                'responsable_parentesco' => 'Madre',
            ])
            ->assertOk()
            ->assertJsonPath('data.responsable_pendiente', false)
            ->assertJsonPath('data.responsable_nombre', 'Madre del Niño')
            ->assertJsonPath('data.datos_pendientes', false);
    }

    public function test_el_documento_agregado_a_un_nuevo_adulto_no_puede_repetirse(): void
    {
        paciente::create([
            'numero_expediente' => 'AA01-2026',
            'nombre_completo' => 'Ya Registrado',
            'fecha_nacimiento' => '1980-01-01',
            'dui' => '07777777-7',
            'es_menor_edad' => false,
            'estado' => 'ACTIVO',
            'id_registrado_por' => $this->recepcion->id,
        ]);
        $joven = paciente::create([
            'numero_expediente' => 'JR02-2026',
            'nombre_completo' => 'Joven Dos',
            'fecha_nacimiento' => now()->subYears(20)->toDateString(),
            'dui' => null,
            'es_menor_edad' => true,
            'estado' => 'ACTIVO',
            'id_registrado_por' => $this->recepcion->id,
        ]);

        $this->actingAs($this->recepcion)
            ->putJson("/api/pacientes/{$joven->id_paciente}", [
                'nombre_completo' => 'Joven Dos',
                'dui' => '07777777-7',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('dui');
    }

    public function test_medico_puede_editar_paciente_menor_y_datos_de_su_responsable(): void
    {
        $resp = responsable::create([
            'nombre_completo' => 'Maria Lopez',
            'dui' => '07654321-0',
            'telefono' => '7111-2222',
            'parentesco' => 'Madre',
        ]);

        $paciente = paciente::create([
            'numero_expediente' => 'JL01-2026',
            'nombre_completo' => 'Juanito Lopez',
            'fecha_nacimiento' => '2018-03-20',
            'dui' => null,
            'telefono' => null,
            'direccion' => 'Colonia San Antonio',
            'es_menor_edad' => true,
            'estado' => 'ACTIVO',
            'id_responsable' => $resp->id_responsable,
            'id_registrado_por' => $this->medico->id,
        ]);

        $payload = [
            'nombre_completo' => 'Juan Alberto Lopez Martinez',
            'direccion' => 'Colonia San Antonio Pasaje 2',
            'responsable_nombre' => 'Maria Elena Lopez de Martinez',
            'responsable_telefono' => '7333-5555',
            'responsable_parentesco' => 'Madre',
        ];

        $this->actingAs($this->medico)
            ->putJson("/api/pacientes/{$paciente->id_paciente}", $payload)
            ->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.nombreCompleto', 'Juan Alberto Lopez Martinez')
            ->assertJsonPath('data.direccion', 'Colonia San Antonio Pasaje 2')
            ->assertJsonPath('data.responsableNombre', 'Maria Elena Lopez de Martinez')
            ->assertJsonPath('data.responsableTelefono', '7333-5555')
            ->assertJsonPath('data.responsableParentesco', 'Madre')
            ->assertJsonPath('data.responsableDocumento', '07654321-0');

        $resp->refresh();
        $this->assertEquals('Maria Elena Lopez de Martinez', $resp->nombre_completo);
        $this->assertEquals('7333-5555', $resp->telefono);
    }

    public function test_administrador_no_puede_editar_pacientes(): void
    {
        $paciente = paciente::create([
            'numero_expediente' => 'PA02-2026',
            'nombre_completo' => 'Paciente Para Bloqueo',
            'fecha_nacimiento' => '1985-01-01',
            'dui' => '01112223-4',
            'estado' => 'ACTIVO',
            'id_registrado_por' => $this->recepcion->id,
        ]);

        $this->actingAs($this->admin)
            ->putJson("/api/pacientes/{$paciente->id_paciente}", [
                'nombre_completo' => 'Intento Por Admin',
            ])
            ->assertStatus(403);
    }

    public function test_historial_paciente_retorna_citas_y_consultas(): void
    {
        $paciente = paciente::create([
            'numero_expediente' => 'PA03-2026',
            'nombre_completo' => 'Paciente Con Historial',
            'fecha_nacimiento' => '1990-05-15',
            'dui' => '05556667-8',
            'estado' => 'ACTIVO',
            'id_registrado_por' => $this->recepcion->id,
        ]);

        $cita = \App\Models\cita::create([
            'id_paciente' => $paciente->id_paciente,
            'id_medico' => $this->medico->id,
            'fecha' => now()->toDateString(),
            'hora_inicio' => '10:00:00',
            'hora_fin' => '10:30:00',
            'tipo_cita' => 'REGULAR',
            'estado' => 'ATENDIDA',
            'id_creado_por' => $this->recepcion->id,
        ]);

        $consulta = \App\Models\consulta::create([
            'id_cita' => $cita->id_cita,
            'id_medico' => $this->medico->id,
            'fecha_hora_inicio' => now()->subMinutes(30),
            'fecha_hora_fin' => now(),
            'motivo_consulta' => 'Cefalea intensa',
            'notas_adicionales' => 'Evolución favorable',
            'precio' => 25.00,
            'total' => 25.00,
        ]);

        $consulta->examenesFisicos()->create([
            'region_anatomica' => 'Cabeza y Cuello',
            'hallazgos' => 'Sin alteraciones palpables',
        ]);

        $consulta->planManejo()->create([
            'descripcion' => 'Tratamiento ambulatorio',
            'indicaciones' => 'Tomar analgésicos',
        ]);

        $receta = $consulta->receta()->create([
            'observaciones_generales' => 'Con abundantes líquidos',
        ]);

        $receta->detalles()->create([
            'nombre_medicamento' => 'Ibuprofeno',
            'dosis' => '400mg',
            'frecuencia' => 'Cada 8 horas',
        ]);

        $this->actingAs($this->medico)
            ->getJson("/api/pacientes/{$paciente->id_paciente}/historial")
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.motivo_consulta', 'Cefalea intensa')
            ->assertJsonPath('data.0.plan_manejo.descripcion', 'Tratamiento ambulatorio')
            ->assertJsonPath('data.0.receta.detalles.0.nombre_medicamento', 'Ibuprofeno')
            ->assertJsonPath('data.0.cita_estado', 'ATENDIDA')
            ->assertJsonPath('data.0.precio', 25)
            ->assertJsonPath('data.0.total', 25);

        // La recepcionista también consulta el historial para ver diagnósticos, consultas y tarifas para cobro
        $this->actingAs($this->recepcion)
            ->getJson("/api/pacientes/{$paciente->id_paciente}/historial")
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.precio', 25)
            ->assertJsonPath('data.0.total', 25);
    }
}
