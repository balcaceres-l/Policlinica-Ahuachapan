<?php

namespace Database\Seeders;

use App\Models\horario_medico;
use App\Models\paciente;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class AgendaSeeder extends Seeder
{
    private const DIAS = [
        Carbon::MONDAY => 'LUNES',
        Carbon::TUESDAY => 'MARTES',
        Carbon::WEDNESDAY => 'MIERCOLES',
        Carbon::THURSDAY => 'JUEVES',
        Carbon::FRIDAY => 'VIERNES',
        Carbon::SATURDAY => 'SABADO',
        Carbon::SUNDAY => 'DOMINGO',
    ];

    /**
     * Agrega citas de demostración para la fecha actual y algunos bloqueos
     * futuros. Usa UUID fijos para poder ejecutarse más de una vez sin duplicar.
     */
    public function run(): void
    {
        $creadoPor = User::where('usuario', 'ksolorzano@policlinica.com')->first()
            ?? User::where('usuario', 'kalgarin@policlinica.com')->first();

        if (! $creadoPor) {
            throw new RuntimeException('No existe un usuario para registrar citas y bloqueos.');
        }

        $pacientes = paciente::whereIn('numero_expediente', [
            'CM01-2026',
            'MA02-2026',
            'JR03-2026',
            'SH04-2026',
            'LP05-2026',
            'AG06-2026',
        ])->get()->keyBy('numero_expediente');

        if ($pacientes->count() < 6) {
            throw new RuntimeException('Faltan pacientes de demostración. Ejecute primero PacienteSeeder.');
        }

        DB::transaction(function () use ($creadoPor, $pacientes) {
            $hoy = Carbon::today();
            $dia = self::DIAS[$hoy->dayOfWeek];

            $tramosHoy = horario_medico::with('medico')
                ->where('dia_semana', $dia)
                ->orderBy('hora_inicio')
                ->get()
                ->filter(fn (horario_medico $horario) => $horario->medico?->estado === 'ACTIVO')
                ->values();

            $plantillas = [
                ['a1f8ad5b-d9cb-469f-a165-708677289701', 'CM01-2026', 'AGENDADA', 'REGULAR'],
                ['a2f8ad5b-d9cb-469f-a165-708677289702', 'MA02-2026', 'EN_ESPERA', 'REGULAR'],
                ['a3f8ad5b-d9cb-469f-a165-708677289703', 'JR03-2026', 'ATENDIDA', 'REGULAR'],
                ['a4f8ad5b-d9cb-469f-a165-708677289704', 'SH04-2026', 'AGENDADA', 'EMERGENCIA'],
                ['a5f8ad5b-d9cb-469f-a165-708677289705', 'LP05-2026', 'CANCELADA', 'REGULAR'],
                ['a6f8ad5b-d9cb-469f-a165-708677289706', 'AG06-2026', 'AGENDADA', 'SOBRECUPO'],
            ];

            $creadas = 0;

            foreach ($tramosHoy as $tramo) {
                if ($creadas >= count($plantillas)) {
                    break;
                }

                $inicioJornada = Carbon::parse($tramo->hora_inicio);
                $finJornada = Carbon::parse($tramo->hora_fin);

                for ($cursor = $inicioJornada->copy(); $cursor->copy()->addMinutes(30)->lessThanOrEqualTo($finJornada); $cursor->addMinutes(30)) {
                    if ($creadas >= count($plantillas)) {
                        break 2;
                    }

                    [$idCita, $expediente, $estado, $tipo] = $plantillas[$creadas];
                    $paciente = $pacientes[$expediente];
                    $medico = $tramo->medico;
                    $especialidadId = $medico->especialidades()->where('especialidades.estado', 'ACTIVA')->value('especialidades.id');

                    $inicio = $cursor->format('H:i');
                    $fin = $cursor->copy()->addMinutes(30)->format('H:i');

                    $datos = [
                        'id_especialidad' => $especialidadId,
                        'hora_fin' => $fin,
                        'tipo_cita' => $tipo,
                        'estado' => $estado,
                        'motivo_cancelacion' => $estado === 'CANCELADA'
                            ? 'Paciente solicitó reprogramar la consulta.'
                            : null,
                        'hora_llegada' => $estado === 'EN_ESPERA'
                            ? now()->subMinutes(10)
                            : null,
                        'orden_atencion' => $estado === 'EN_ESPERA' ? 1 : null,
                        'id_creado_por' => $creadoPor->id,
                    ];

                    DB::table('cita')->updateOrInsert(
                        ['id_cita' => $idCita],
                        [
                            'id_paciente' => $paciente->id_paciente,
                            'id_medico' => $medico->id,
                            'fecha' => $hoy->toDateString(),
                            'hora_inicio' => $inicio,
                            ...$datos,
                        ],
                    );

                    $creadas++;
                }
            }

            // Si hoy no hay jornada (por ejemplo, domingo), se deja al menos
            // una emergencia visible en la pantalla de recepción.
            if ($creadas === 0) {
                $medico = User::where('usuario', 'eramirez@policlinica.com')->firstOrFail();
                $especialidadId = $medico->especialidades()->where('especialidades.estado', 'ACTIVA')->value('especialidades.id');

                DB::table('cita')->updateOrInsert(
                    ['id_cita' => 'a1f8ad5b-d9cb-469f-a165-708677289701'],
                    [
                        'id_paciente' => $pacientes['CM01-2026']->id_paciente,
                        'id_medico' => $medico->id,
                        'id_especialidad' => $especialidadId,
                        'fecha' => $hoy->toDateString(),
                        'hora_inicio' => '09:00',
                        'hora_fin' => '09:30',
                        'tipo_cita' => 'EMERGENCIA',
                        'estado' => 'AGENDADA',
                        'motivo_cancelacion' => null,
                        'hora_llegada' => null,
                        'orden_atencion' => null,
                        'id_creado_por' => $creadoPor->id,
                    ],
                );
            }

            $bloqueos = [
                ['b1f8ad5b-d9cb-469f-a165-708677289801', 'mtorres@policlinica.com', $hoy->copy()->addDays(3), 'Capacitación médica fuera de la clínica.'],
                ['b2f8ad5b-d9cb-469f-a165-708677289802', 'cpena@policlinica.com', $hoy->copy()->addDays(7), 'Ausencia programada.'],
            ];

            foreach ($bloqueos as [$idBloqueo, $usuarioMedico, $fecha, $motivo]) {
                $medico = User::where('usuario', $usuarioMedico)->firstOrFail();

                DB::table('bloqueo_agenda')->updateOrInsert(
                    ['id_bloqueo' => $idBloqueo],
                    [
                        'id_medico' => $medico->id,
                        'fecha' => $fecha->toDateString(),
                        'motivo' => $motivo,
                        'id_creado_por' => $creadoPor->id,
                    ],
                );
            }
        });
    }
}
