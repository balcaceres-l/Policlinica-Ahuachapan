<?php

namespace App\Services;

use App\Models\bloqueo_agenda;
use App\Models\cita;
use App\Models\horario_medico;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class AgendaService
{
    /** Minutos que dura un bloque cuando no se indica hora_fin. */
    public const DURACION_BLOQUE_MIN = 30;

    private const DIAS = [
        Carbon::MONDAY => 'LUNES',
        Carbon::TUESDAY => 'MARTES',
        Carbon::WEDNESDAY => 'MIERCOLES',
        Carbon::THURSDAY => 'JUEVES',
        Carbon::FRIDAY => 'VIERNES',
        Carbon::SATURDAY => 'SABADO',
        Carbon::SUNDAY => 'DOMINGO',
    ];

    public function diaSemanaDe(string $fecha): string
    {
        return self::DIAS[Carbon::parse($fecha)->dayOfWeek];
    }

    public function estaBloqueado(string $medicoId, string $fecha): bool
    {
        return bloqueo_agenda::where('id_medico', $medicoId)
            ->whereDate('fecha', $fecha)
            ->exists();
    }

    /** @return array<int, horario_medico> */
    public function horariosDe(string $medicoId, string $fecha): array
    {
        return horario_medico::where('id_medico', $medicoId)
            ->where('dia_semana', $this->diaSemanaDe($fecha))
            ->orderBy('hora_inicio')
            ->get()
            ->all();
    }

    /**
     * Bloques del día que caen dentro del horario configurado y no chocan con
     * una cita vigente. Las emergencias y sobrecupos no se descuentan: son
     * excepciones deliberadas y no consumen disponibilidad.
     *
     * @return array<int, array{hora_inicio: string, hora_fin: string}>
     */
    public function bloquesDisponibles(string $medicoId, string $fecha): array
    {
        if ($this->estaBloqueado($medicoId, $fecha)) {
            return [];
        }

        $ocupados = cita::where('id_medico', $medicoId)
            ->whereDate('fecha', $fecha)
            ->where('tipo_cita', 'REGULAR')
            ->whereIn('estado', cita::ESTADOS_VIGENTES)
            ->get(['hora_inicio', 'hora_fin']);

        $bloques = [];

        foreach ($this->horariosDe($medicoId, $fecha) as $horario) {
            $cursor = Carbon::parse($horario->hora_inicio);
            $cierre = Carbon::parse($horario->hora_fin);

            while ($cursor->copy()->addMinutes(self::DURACION_BLOQUE_MIN)->lessThanOrEqualTo($cierre)) {
                $fin = $cursor->copy()->addMinutes(self::DURACION_BLOQUE_MIN);

                $libre = $ocupados->every(fn ($c) => ! $this->seSolapan(
                    $cursor->format('H:i'),
                    $fin->format('H:i'),
                    substr((string) $c->hora_inicio, 0, 5),
                    substr((string) $c->hora_fin, 0, 5),
                ));

                if ($libre) {
                    $bloques[] = [
                        'hora_inicio' => $cursor->format('H:i'),
                        'hora_fin' => $fin->format('H:i'),
                    ];
                }

                $cursor = $fin;
            }
        }

        return $bloques;
    }

    public function seSolapan(string $inicioA, string $finA, string $inicioB, string $finB): bool
    {
        return $inicioA < $finB && $finA > $inicioB;
    }

    /**
     * Crea la cita dentro de una transacción, bloqueando antes la fila del
     * médico. Serializar por médico es lo que impide que dos peticiones
     * simultáneas comprueben disponibilidad a la vez y ambas reserven el
     * mismo bloque.
     *
     * @param  array<string, mixed>  $datos
     */
    public function agendar(array $datos): cita
    {
        return DB::transaction(function () use ($datos) {
            User::where('id', $datos['id_medico'])->lockForUpdate()->first();

            $esExcepcion = in_array($datos['tipo_cita'] ?? 'REGULAR', cita::TIPOS_SIN_VALIDACION, true);

            if (! $esExcepcion) {
                $this->asegurarDisponible(
                    $datos['id_medico'],
                    $datos['fecha'],
                    $datos['hora_inicio'],
                    $datos['hora_fin'],
                );
            }

            // `estado` viene del default de la tabla: sin refresh vuelve null.
            return cita::create($datos)->refresh();
        });
    }

    /**
     * Libera el bloque original y valida el nuevo dentro de la misma
     * transacción, para que no quede un hueco donde otro lo tome.
     */
    public function reprogramar(cita $cita, string $fecha, string $horaInicio, string $horaFin): cita
    {
        return DB::transaction(function () use ($cita, $fecha, $horaInicio, $horaFin) {
            User::where('id', $cita->id_medico)->lockForUpdate()->first();

            if (! in_array($cita->tipo_cita, cita::TIPOS_SIN_VALIDACION, true)) {
                $this->asegurarDisponible(
                    $cita->id_medico,
                    $fecha,
                    $horaInicio,
                    $horaFin,
                    $cita->id_cita,
                );
            }

            $cita->update([
                'fecha' => $fecha,
                'hora_inicio' => $horaInicio,
                'hora_fin' => $horaFin,
                'estado' => 'AGENDADA',
            ]);

            return $cita->refresh();
        });
    }

    /**
     * Corre las citas pendientes de un médico cuando llega tarde. Conserva la
     * duración de cada una y respeta el orden; las que quedan fuera de la
     * jornada se desplazan igual y se devuelven señaladas, porque el médico ya
     * va tarde y recepción necesita verlas para decidir.
     *
     * @return array{citas: array<int, cita>, fuera_de_horario: array<int, string>}
     */
    public function desplazarPorAtraso(
        string $medicoId,
        string $fecha,
        int $minutos,
        ?string $desdeHora = null,
    ): array {
        return DB::transaction(function () use ($medicoId, $fecha, $minutos, $desdeHora) {
            User::where('id', $medicoId)->lockForUpdate()->first();

            $citas = cita::where('id_medico', $medicoId)
                ->whereDate('fecha', $fecha)
                ->whereIn('estado', ['AGENDADA', 'EN_ESPERA'])
                ->when($desdeHora, fn ($q) => $q->where('hora_inicio', '>=', $desdeHora))
                ->orderBy('hora_inicio')
                ->lockForUpdate()
                ->get();

            $fueraDeHorario = [];

            foreach ($citas as $c) {
                $inicio = Carbon::parse((string) $c->hora_inicio)->addMinutes($minutos);
                $fin = Carbon::parse((string) $c->hora_fin)->addMinutes($minutos);

                $c->update([
                    'hora_inicio' => $inicio->format('H:i'),
                    'hora_fin' => $fin->format('H:i'),
                ]);

                if (! $this->dentroDelHorario($medicoId, $fecha, $inicio->format('H:i'), $fin->format('H:i'))) {
                    $fueraDeHorario[] = $c->id_cita;
                }
            }

            return ['citas' => $citas->all(), 'fuera_de_horario' => $fueraDeHorario];
        });
    }

    /**
     * @throws RuntimeException si el bloque no puede ocuparse
     */
    private function asegurarDisponible(
        string $medicoId,
        string $fecha,
        string $horaInicio,
        string $horaFin,
        ?string $ignorarCitaId = null,
    ): void {
        if ($this->estaBloqueado($medicoId, $fecha)) {
            throw new RuntimeException('El médico tiene la agenda bloqueada ese día.');
        }

        if (! $this->dentroDelHorario($medicoId, $fecha, $horaInicio, $horaFin)) {
            throw new RuntimeException('El horario solicitado está fuera de la jornada del médico.');
        }

        $conflicto = cita::where('id_medico', $medicoId)
            ->whereDate('fecha', $fecha)
            ->where('tipo_cita', 'REGULAR')
            ->whereIn('estado', cita::ESTADOS_VIGENTES)
            ->when($ignorarCitaId, fn ($q) => $q->where('id_cita', '!=', $ignorarCitaId))
            ->where('hora_inicio', '<', $horaFin)
            ->where('hora_fin', '>', $horaInicio)
            ->lockForUpdate()
            ->exists();

        if ($conflicto) {
            throw new RuntimeException('Ya existe una cita en ese bloque para el médico.');
        }
    }

    private function dentroDelHorario(
        string $medicoId,
        string $fecha,
        string $horaInicio,
        string $horaFin,
    ): bool {
        foreach ($this->horariosDe($medicoId, $fecha) as $horario) {
            $desde = substr((string) $horario->hora_inicio, 0, 5);
            $hasta = substr((string) $horario->hora_fin, 0, 5);

            if ($horaInicio >= $desde && $horaFin <= $hasta) {
                return true;
            }
        }

        return false;
    }
}
