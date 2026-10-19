<?php

namespace Database\Seeders;

use App\Models\Especialidad;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $password = Hash::make('1234');

        $usuarios = [
            ['Dra. Elena Ramírez Alfaro', 'eramirez@policlinica.com', 'MEDICO', 'ACTIVO', '2443-1020'],
            ['Dr. Miguel Ángel Torres', 'mtorres@policlinica.com', 'MEDICO', 'ACTIVO', '2443-1021'],
            ['Dra. Carla Sofía Peña', 'cpena@policlinica.com', 'MEDICO', 'ACTIVO', '2443-1022'],
            ['Dr. Josué Hernández Cruz', 'jhernandez@policlinica.com', 'MEDICO', 'ACTIVO', '2443-1023'],
            ['Dra. Ana Lucía Menjívar', 'amenjivar@policlinica.com', 'MEDICO', 'INACTIVO', '2443-1024'],
            ['Dr. Roberto Cañas Portillo', 'rcanas@policlinica.com', 'MEDICO', 'ACTIVO', '2443-1025'],
            ['Dr. Fernando Alvarenga', 'falvarenga@policlinica.com', 'MEDICO', 'ACTIVO', '2443-1026'],
            ['Karla Beatriz Solórzano', 'ksolorzano@policlinica.com', 'RECEPCIONISTA', 'ACTIVO', '2443-1000'],
            ['Marta Elena Guevara', 'mguevara@policlinica.com', 'RECEPCIONISTA', 'ACTIVO', '2443-1001'],
            ['Sofía Marroquín Rivas', 'smarroquin@policlinica.com', 'RECEPCIONISTA', 'INACTIVO', '2443-1002'],
            ['Carlos Soto Mejía', 'csoto@policlinica.com', 'ADMINISTRADOR', 'INACTIVO', '2443-1010'],
            ['Katherinne Algarín', 'kalgarin@policlinica.com', 'ADMINISTRADOR', 'ACTIVO', '2443-1011'],
        ];

        // updateOrCreate y sync mantienen el seeder idempotente: `composer setup`
        // puede ejecutarse sobre una base ya poblada.
        foreach ($usuarios as [$nombre, $usuario, $rol, $estado, $telefono]) {
            User::updateOrCreate(
                ['usuario' => $usuario],
                [
                    'nombre_completo' => $nombre,
                    'rol' => $rol,
                    'estado' => $estado,
                    'telefono' => $telefono,
                    'password' => $password,
                ],
            );
        }

        $especialidades = [
            ['Ginecología', 'Atención integral de la salud femenina y control prenatal.', 'ACTIVA'],
            ['Medicina Interna', 'Diagnóstico y tratamiento de enfermedades del adulto.', 'ACTIVA'],
            ['Dermatología', 'Diagnóstico y tratamiento de afecciones de la piel.', 'ACTIVA'],
            ['Pediatría', 'Atención médica de niñas y niños de 0 a 12 años.', 'ACTIVA'],
            ['Clínica de Úlceras', 'Curación y seguimiento de úlceras y heridas crónicas.', 'INACTIVA'],
            ['Cirugía General', 'Evaluación prequirúrgica y procedimientos menores.', 'ACTIVA'],
        ];

        foreach ($especialidades as [$nombre, $descripcion, $estado]) {
            Especialidad::updateOrCreate(['nombre' => $nombre], compact('descripcion', 'estado'));
        }

        $asignaciones = [
            'eramirez@policlinica.com' => ['Ginecología'],
            'mtorres@policlinica.com' => ['Medicina Interna', 'Clínica de Úlceras'],
            'cpena@policlinica.com' => ['Dermatología'],
            'jhernandez@policlinica.com' => ['Pediatría'],
            'amenjivar@policlinica.com' => ['Clínica de Úlceras'],
            'rcanas@policlinica.com' => ['Cirugía General', 'Medicina Interna'],
            'falvarenga@policlinica.com' => ['Medicina Interna'],
        ];

        foreach ($asignaciones as $usuario => $nombresEspecialidades) {
            $medico = User::where('usuario', $usuario)->firstOrFail();
            $ids = Especialidad::whereIn('nombre', $nombresEspecialidades)->pluck('id');
            $medico->especialidades()->sync($ids);
        }
    }
}
