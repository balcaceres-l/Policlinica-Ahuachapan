<?php

namespace Database\Seeders;

use App\Models\historial_clinico;
use App\Models\paciente;
use App\Models\responsable;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class PacienteSeeder extends Seeder
{
    /**
     * Pacientes de demostración. Los UUID coinciden con mockData.ts para que
     * el selector de pacientes del frontend pueda agendar citas reales en la API.
     */
    public function run(): void
    {
        $registradoPor = User::where('usuario', 'ksolorzano@policlinica.com')->first()
            ?? User::where('usuario', 'kalgarin@policlinica.com')->first();

        if (! $registradoPor) {
            throw new RuntimeException('No existe un usuario con el cual registrar los pacientes. Ejecute primero DatabaseSeeder.');
        }

        DB::transaction(function () use ($registradoPor) {
            $responsables = [
                'sofia' => [
                    'id_responsable' => '8f8fad5b-d9cb-469f-a165-708677289601',
                    'nombre_completo' => 'Gloria Hernández de Cruz',
                    'dui' => '01827364-5',
                    'telefono' => '7920-1122',
                    'parentesco' => 'Madre',
                ],
                'mateo' => [
                    'id_responsable' => '9f8fad5b-d9cb-469f-a165-708677289602',
                    'nombre_completo' => 'Alejandro Escobar Pineda',
                    'dui' => '02918273-4',
                    'telefono' => '7412-8956',
                    'parentesco' => 'Padre',
                ],
            ];

            foreach ($responsables as $clave => $datos) {
                $responsables[$clave] = responsable::updateOrCreate(
                    ['dui' => $datos['dui']],
                    $datos,
                );
            }

            $pacientes = [
                [
                    'id_paciente' => '0f8fad5b-d9cb-469f-a165-708677289501',
                    'numero_expediente' => 'CM01-2026',
                    'nombre_completo' => 'Carlos Eduardo Mendoza',
                    'fecha_nacimiento' => '1988-04-12',
                    'dui' => '04829103-5',
                    'telefono' => '7823-4412',
                    'direccion' => 'Ahuachapán, Ahuachapán',
                    'es_menor_edad' => false,
                    'id_responsable' => null,
                    'fecha_registro' => '2026-02-15 09:15:00',
                    'historial_familiar' => 'Antecedentes familiares de hipertensión arterial.',
                    'historial_personal' => 'Sin antecedentes personales relevantes registrados.',
                ],
                [
                    'id_paciente' => '1f8fad5b-d9cb-469f-a165-708677289502',
                    'numero_expediente' => 'MA02-2026',
                    'nombre_completo' => 'María Antonieta Alvarado',
                    'fecha_nacimiento' => '1995-11-23',
                    'dui' => '03918274-1',
                    'telefono' => '7190-8821',
                    'direccion' => 'Atiquizaya, Ahuachapán',
                    'es_menor_edad' => false,
                    'id_responsable' => null,
                    'fecha_registro' => '2026-02-20 10:30:00',
                    'historial_familiar' => 'Sin antecedentes familiares relevantes registrados.',
                    'historial_personal' => 'Alergia estacional referida por la paciente.',
                ],
                [
                    'id_paciente' => '2f8fad5b-d9cb-469f-a165-708677289503',
                    'numero_expediente' => 'JR03-2026',
                    'nombre_completo' => 'Juan Roberto Ramos',
                    'fecha_nacimiento' => '1976-08-05',
                    'dui' => '01928475-8',
                    'telefono' => '7541-2309',
                    'direccion' => 'Concepción de Ataco, Ahuachapán',
                    'es_menor_edad' => false,
                    'id_responsable' => null,
                    'fecha_registro' => '2026-03-01 08:45:00',
                    'historial_familiar' => 'Antecedente familiar de diabetes mellitus tipo 2.',
                    'historial_personal' => 'Control periódico de presión arterial.',
                ],
                [
                    'id_paciente' => '3f8fad5b-d9cb-469f-a165-708677289504',
                    'numero_expediente' => 'SH04-2026',
                    'nombre_completo' => 'Sofía Valentina Hernández',
                    'fecha_nacimiento' => '2018-06-14',
                    'dui' => 'MENOR-0001',
                    'telefono' => '7920-1122',
                    'direccion' => 'Ahuachapán, Ahuachapán',
                    'es_menor_edad' => true,
                    'id_responsable' => $responsables['sofia']->id_responsable,
                    'fecha_registro' => '2026-03-05 11:20:00',
                    'historial_familiar' => 'Madre refiere antecedentes familiares de asma.',
                    'historial_personal' => 'Esquema de vacunación referido como completo para la edad.',
                ],
                [
                    'id_paciente' => '4f8fad5b-d9cb-469f-a165-708677289505',
                    'numero_expediente' => 'LP05-2026',
                    'nombre_completo' => 'Luis Fernando Portillo',
                    'fecha_nacimiento' => '1982-01-30',
                    'dui' => '05829104-9',
                    'telefono' => '7234-9012',
                    'direccion' => 'Tacuba, Ahuachapán',
                    'es_menor_edad' => false,
                    'id_responsable' => null,
                    'fecha_registro' => '2026-03-10 14:10:00',
                    'historial_familiar' => 'Sin antecedentes familiares relevantes registrados.',
                    'historial_personal' => 'Sin antecedentes personales relevantes registrados.',
                ],
                [
                    'id_paciente' => '5f8fad5b-d9cb-469f-a165-708677289506',
                    'numero_expediente' => 'AG06-2026',
                    'nombre_completo' => 'Ana Gabriela Gómez',
                    'fecha_nacimiento' => '2001-09-17',
                    'dui' => '06192837-4',
                    'telefono' => '7789-3456',
                    'direccion' => 'Apaneca, Ahuachapán',
                    'es_menor_edad' => false,
                    'id_responsable' => null,
                    'fecha_registro' => '2026-03-12 09:40:00',
                    'historial_familiar' => 'Antecedentes familiares de migraña.',
                    'historial_personal' => 'Sin cirugías previas registradas.',
                ],
                [
                    'id_paciente' => '6f8fad5b-d9cb-469f-a165-708677289507',
                    'numero_expediente' => 'ME07-2026',
                    'nombre_completo' => 'Mateo Alejandro Escobar',
                    'fecha_nacimiento' => '2021-02-08',
                    'dui' => 'MENOR-0002',
                    'telefono' => '7412-8956',
                    'direccion' => 'Turín, Ahuachapán',
                    'es_menor_edad' => true,
                    'id_responsable' => $responsables['mateo']->id_responsable,
                    'fecha_registro' => '2026-03-15 10:05:00',
                    'historial_familiar' => 'Sin antecedentes familiares relevantes registrados.',
                    'historial_personal' => 'Control pediátrico de rutina.',
                ],
                [
                    'id_paciente' => '7f8fad5b-d9cb-469f-a165-708677289508',
                    'numero_expediente' => 'JS08-2026',
                    'nombre_completo' => 'John Michael Smith',
                    'fecha_nacimiento' => '1985-07-22',
                    'dui' => 'PA8492019',
                    'telefono' => '7999-1234',
                    'direccion' => 'Ahuachapán, Ahuachapán',
                    'es_menor_edad' => false,
                    'id_responsable' => null,
                    'fecha_registro' => '2026-03-18 15:25:00',
                    'historial_familiar' => 'Sin antecedentes familiares relevantes registrados.',
                    'historial_personal' => 'Sin antecedentes personales relevantes registrados.',
                ],
            ];

            foreach ($pacientes as $datos) {
                $historialFamiliar = $datos['historial_familiar'];
                $historialPersonal = $datos['historial_personal'];
                unset($datos['historial_familiar'], $datos['historial_personal']);

                $datos['id_registrado_por'] = $registradoPor->id;

                $registro = paciente::updateOrCreate(
                    ['numero_expediente' => $datos['numero_expediente']],
                    $datos,
                );

                historial_clinico::updateOrCreate(
                    ['id_paciente' => $registro->id_paciente],
                    [
                        'historial_familiar' => $historialFamiliar,
                        'historial_personal' => $historialPersonal,
                    ],
                );
            }
        });
    }
}
