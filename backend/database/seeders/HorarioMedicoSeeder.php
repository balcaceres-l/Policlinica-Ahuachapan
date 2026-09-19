<?php

namespace Database\Seeders;

use App\Models\horario_medico;
use App\Models\User;
use Illuminate\Database\Seeder;
use RuntimeException;

class HorarioMedicoSeeder extends Seeder
{
    /**
     * Horarios equivalentes a los utilizados originalmente por el frontend.
     */
    public function run(): void
    {
        $horarios = [
            'eramirez@policlinica.com' => [
                ['LUNES', '15:00', '18:30'],
                ['MIERCOLES', '15:00', '18:30'],
                ['VIERNES', '15:00', '18:30'],
                ['SABADO', '08:00', '12:00'],
            ],
            'mtorres@policlinica.com' => [
                ['MARTES', '15:00', '18:30'],
                ['JUEVES', '15:00', '18:30'],
            ],
            'cpena@policlinica.com' => [
                ['LUNES', '08:00', '12:00'],
                ['MARTES', '08:00', '12:00'],
            ],
            'jhernandez@policlinica.com' => [
                ['LUNES', '15:00', '18:30'],
                ['MIERCOLES', '15:00', '18:30'],
                ['SABADO', '08:00', '10:00'],
                ['SABADO', '10:30', '12:00'],
            ],
            'rcanas@policlinica.com' => [
                ['JUEVES', '15:00', '18:30'],
                ['VIERNES', '15:00', '18:30'],
            ],
            'falvarenga@policlinica.com' => [
                ['MARTES', '15:00', '18:30'],
            ],
        ];

        foreach ($horarios as $usuario => $tramos) {
            $medico = User::where('usuario', $usuario)->first();

            if (! $medico) {
                throw new RuntimeException("No se encontró el médico {$usuario} al sembrar horarios.");
            }

            foreach ($tramos as [$dia, $inicio, $fin]) {
                horario_medico::updateOrCreate(
                    [
                        'id_medico' => $medico->id,
                        'dia_semana' => $dia,
                        'hora_inicio' => $inicio,
                    ],
                    ['hora_fin' => $fin],
                );
            }
        }
    }
}
