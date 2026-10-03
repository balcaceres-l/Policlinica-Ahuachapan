<?php

namespace App\Services;

use App\Models\bloqueo_agenda;
use App\Models\cita;
use App\Models\horario_medico;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
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

    /** Si el día completo está bloqueado. Los bloqueos parciales no cuentan aquí. */
    public function estaBloqueado(string $medicoId, string $fecha): bool
    {
        return bloqueo_agenda::where('id_medico', $medicoId)
            ->whereDate('fecha', $fecha)
            ->whereNull('hora_inicio')
            ->exists();
    }

    /** @return Collection<int, bloqueo_agenda> */
    public function bloqueosParcialesDe(string $medicoId, string $fecha): Collection
    {
        return bloqueo_agenda::where('id_medico', $medicoId)
            ->whereDate('fecha', $fecha)
            ->whereNotNull('hora_inicio')
            ->orderBy('hora_inicio')
            ->get();
    }

    /** El primer bloqueo (de día completo o parcial) que toca el rango, si lo hay. */
    public function bloqueoQueTocaRango(
        string $medicoId,
        string $fecha,
        string $horaInicio,
        string $horaFin,
    ): ?bloqueo_agenda {
        return bloqueo_agenda::where('id_medico', $medicoId)
            ->whereDate('fecha', $fecha)
            ->get()
            ->first(fn (bloqueo_agenda $b) => $b->solapaCon($horaInicio, $horaFin));
    }

    /**
     * Citas que siguen pendientes y quedaron dentro del bloqueo: recepción debe
     * contactar a cada paciente para reagendar, correr o cancelar.
     *
     * @return Collection<int, cita>
     */
    public function citasAfectadas(bloqueo_agenda $bloqueo): Collection
    {
        return cita::where('id_medico', $bloqueo->id_medico)
            ->whereDate('fecha', $bloqueo->fecha)
            ->whereIn('estado', ['AGENDADA', 'EN_ESPERA'])
            ->orderBy('hora_inicio')
            ->get()
            ->filter(fn (cita $c) => $bloqueo->solapaCon(
                substr((string) $c->hora_inicio, 0, 5),
                substr((string) $c->hora_fin, 0, 5),
            ))
            ->values();
    }

    /**
     * Deja en `citas_afectadas_total` cuántas citas pendientes cayeron en cada
     * bloqueo, con una sola consulta para toda la lista.
     *
     * @param  Collection<int, bloqueo_agenda>  $bloqueos
     */
    public function contarCitasAfectadas(Collection $bloqueos): void
    {
        if ($bloqueos->isEmpty()) {
            return;
        }

        $citas = cita::whereIn('id_medico', $bloqueos->pluck('id_medico')->unique())
            ->whereDate('fecha', '>=', $bloqueos->min(fn (bloqueo_agenda $b) => $b->fecha->toDateString()))
            ->whereDate('fecha', '<=', $bloqueos->max(fn (bloqueo_agenda $b) => $b->fecha->toDateString()))
            ->whereIn('estado', ['AGENDADA', 'EN_ESPERA'])
            ->get(['id_medico', 'fecha', 'hora_inicio', 'hora_fin']);

        foreach ($bloqueos as $b) {
            $b->setAttribute('citas_afectadas_total', $citas->filter(
                fn (cita $c) => $c->id_medico === $b->id_medico
                    && $c->fecha->toDateString() === $b->fecha->toDateString()
                    && $b->solapaCon(substr((string) $c->hora_inicio, 0, 5), substr((string) $c->hora_fin, 0, 5)),
            )->count());
        }
    }

    /**
     * Deja en cada cita pendiente el bloqueo que la afecta (o null) sin hacer una
     * consulta por cita. CitaResource lo expone como `afectada_por_bloqueo`.
     *
     * @param  Collection<int, cita>  $citas
     */
    public function marcarAfectadas(Collection $citas): void
    {
        $pendientes = $citas->whereIn('estado', ['AGENDADA', 'EN_ESPERA']);

        $bloqueos = $pendientes->isEmpty()
            ? collect()
            : bloqueo_agenda::whereIn('id_medico', $pendientes->pluck('id_medico')->unique())
                ->whereDate('fecha', '>=', $pendientes->min(fn (cita $c) => $c->fecha->toDateString()))
                ->whereDate('fecha', '<=', $pendientes->max(fn (cita $c) => $c->fecha->toDateString()))
                ->get()
                ->groupBy(fn (bloqueo_agenda $b) => $b->id_medico.'|'.$b->fecha->toDateString());

        foreach ($citas as $c) {
            $afecta = null;

            if ($pendientes->contains($c)) {
                $afecta = ($bloqueos[$c->id_medico.'|'.$c->fecha->toDateString()] ?? collect())
                    ->first(fn (bloqueo_agenda $b) => $b->solapaCon(
                        substr((string) $c->hora_inicio, 0, 5),
                        substr((string) $c->hora_fin, 0, 5),
                    ));
            }

            $c->setRelation('bloqueoAfectante', $afecta);
        }
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

        $parciales = $this->bloqueosParcialesDe($medicoId, $fecha);
        $esHoy = Carbon::parse($fecha)->isToday();
        $ahora = now()->format('H:i');

        $bloques = [];

        foreach ($this->horariosDe($medicoId, $fecha) as $horario) {
            $cursor = Carbon::parse($horario->hora_inicio);
            $cierre = Carbon::parse($horario->hora_fin);

            while ($cursor->copy()->addMinutes(self::DURACION_BLOQUE_MIN)->lessThanOrEqualTo($cierre)) {
                $fin = $cursor->copy()->addMinutes(self::DURACION_BLOQUE_MIN);
                $horaInicioStr = $cursor->format('H:i');

                // Si la consulta es para el día actual, no ofrecer bloques que ya transcurrieron
                if ($esHoy && $horaInicioStr < $ahora) {
                    $cursor = $fin;
                    continue;
                }

                $libre = $ocupados->every(fn ($c) => ! $this->seSolapan(
                    $horaInicioStr,
                    $fin->format('H:i'),
                    substr((string) $c->hora_inicio, 0, 5),
                    substr((string) $c->hora_fin, 0, 5),
                ));

                $libre = $libre && $parciales->every(
                    fn (bloqueo_agenda $b) => ! $b->solapaCon($cursor->format('H:i'), $fin->format('H:i')),
                );

                if ($libre) {
                    $bloques[] = [
                        'hora_inicio' => $horaInicioStr,
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
     * Permite opcionalmente reasignar la cita a otro médico ($nuevoMedicoId).
     */
    public function reprogramar(
        cita $cita,
        string $fecha,
        string $horaInicio,
        string $horaFin,
        ?string $nuevoMedicoId = null,
        ?string $nuevaEspecialidadId = null,
    ): cita {
        return DB::transaction(function () use ($cita, $fecha, $horaInicio, $horaFin, $nuevoMedicoId, $nuevaEspecialidadId) {
            $medicoDestinoId = $nuevoMedicoId ?? $cita->id_medico;

            // Bloquear a los médicos involucrados para evitar condiciones de carrera
            User::whereIn('id', array_unique([$cita->id_medico, $medicoDestinoId]))
                ->lockForUpdate()
                ->get();

            if (! in_array($cita->tipo_cita, cita::TIPOS_SIN_VALIDACION, true)) {
                $this->asegurarDisponible(
                    $medicoDestinoId,
                    $fecha,
                    $horaInicio,
                    $horaFin,
                    $medicoDestinoId === $cita->id_medico ? $cita->id_cita : null,
                );
            }

            $actualizacion = [
                'id_medico' => $medicoDestinoId,
                'fecha' => $fecha,
                'hora_inicio' => $horaInicio,
                'hora_fin' => $horaFin,
                'estado' => 'AGENDADA',
            ];

            if ($nuevaEspecialidadId) {
                $actualizacion['id_especialidad'] = $nuevaEspecialidadId;
            }

            $cita->update($actualizacion);

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
     * Bloqueo parcial con pacientes ya en la clínica. Se recorren las citas
     * pendientes en orden y una por una: las que cayeron dentro del bloqueo pasan
     * a empezar cuando este termina (una detrás de otra, conservando el orden), y
     * una cita posterior solo se corre si choca con la que acaba de moverse. Las
     * que ya quedaban libres no se tocan.
     *
     * Las emergencias y sobrecupos que no caen en el bloqueo se dejan donde están.
     *
     * @return array{citas: array<int, cita>, fuera_de_horario: array<int, string>}
     *
     * @throws RuntimeException si el bloqueo es de día completo o no afecta ninguna cita
     */
    public function correrCitasTrasBloqueo(bloqueo_agenda $bloqueo): array
    {
        if (! $bloqueo->esParcial()) {
            throw new RuntimeException(
                'Un bloqueo de día completo no se corre: reagenda o cancela las citas.',
            );
        }

        return DB::transaction(function () use ($bloqueo) {
            $medicoId = $bloqueo->id_medico;
            $fecha = $bloqueo->fecha->toDateString();

            User::where('id', $medicoId)->lockForUpdate()->first();

            $pendientes = cita::where('id_medico', $medicoId)
                ->whereDate('fecha', $fecha)
                ->whereIn('estado', ['AGENDADA', 'EN_ESPERA'])
                ->orderBy('hora_inicio')
                ->orderBy('hora_fin')
                ->lockForUpdate()
                ->get();

            $afectadas = $pendientes
                ->filter(fn (cita $c) => $bloqueo->solapaCon(
                    substr((string) $c->hora_inicio, 0, 5),
                    substr((string) $c->hora_fin, 0, 5),
                ))
                ->pluck('id_cita')
                ->all();

            if ($afectadas === []) {
                throw new RuntimeException('Ninguna cita quedó dentro de este bloqueo.');
            }

            // Otros bloqueos del mismo día: una cita corrida no puede caer en ellos.
            $otrosBloqueos = $this->bloqueosParcialesDe($medicoId, $fecha)
                ->reject(fn (bloqueo_agenda $b) => $b->id_bloqueo === $bloqueo->id_bloqueo);

            $libreDesde = $this->aMinutos($bloqueo->horaFinCorta());
            $enZona = false;
            $movidas = [];
            $fueraDeHorario = [];

            foreach ($pendientes as $c) {
                $esAfectada = in_array($c->id_cita, $afectadas, true);

                // Lo anterior a la primera afectada no tiene nada que ver con el bloqueo.
                if (! $enZona && ! $esAfectada) {
                    continue;
                }
                $enZona = true;

                if (! $esAfectada && $c->tipo_cita !== 'REGULAR') {
                    continue;
                }

                $inicio = $this->aMinutos((string) $c->hora_inicio);
                $fin = $this->aMinutos((string) $c->hora_fin);

                // Ya empezaba después de lo ocupado: no estorba y no se mueve.
                if ($inicio >= $libreDesde) {
                    $libreDesde = $fin;

                    continue;
                }

                $duracion = $fin - $inicio;
                $nuevoInicio = $libreDesde;

                do {
                    $salto = false;
                    foreach ($otrosBloqueos as $otro) {
                        if ($otro->solapaCon($this->deMinutos($nuevoInicio), $this->deMinutos($nuevoInicio + $duracion))) {
                            $nuevoInicio = $this->aMinutos($otro->horaFinCorta());
                            $salto = true;
                        }
                    }
                } while ($salto);

                $nuevoFin = $nuevoInicio + $duracion;

                if ($nuevoFin > 24 * 60 - 1) {
                    throw new RuntimeException('Las citas no caben en el resto del día: reagenda algunas.');
                }

                $c->update([
                    'hora_inicio' => $this->deMinutos($nuevoInicio),
                    'hora_fin' => $this->deMinutos($nuevoFin),
                ]);
                $movidas[] = $c;

                if (! $this->dentroDelHorario($medicoId, $fecha, $this->deMinutos($nuevoInicio), $this->deMinutos($nuevoFin))) {
                    $fueraDeHorario[] = $c->id_cita;
                }

                $libreDesde = $nuevoFin;
            }

            return ['citas' => $movidas, 'fuera_de_horario' => $fueraDeHorario];
        });
    }

    /** 'H:i' o 'H:i:s' -> minutos desde la medianoche. */
    private function aMinutos(string $hora): int
    {
        [$h, $m] = array_map('intval', explode(':', substr($hora, 0, 5)));

        return $h * 60 + $m;
    }

    private function deMinutos(int $minutos): string
    {
        return sprintf('%02d:%02d', intdiv($minutos, 60), $minutos % 60);
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
        $bloqueo = $this->bloqueoQueTocaRango($medicoId, $fecha, $horaInicio, $horaFin);

        if ($bloqueo !== null) {
            throw new RuntimeException(
                $bloqueo->esParcial()
                    ? "El médico tiene la agenda bloqueada de {$bloqueo->horaInicioCorta()} a {$bloqueo->horaFinCorta()}."
                    : 'El médico tiene la agenda bloqueada ese día.',
            );
        }

        if (Carbon::parse($fecha)->isToday() && $horaInicio < now()->format('H:i')) {
            throw new RuntimeException('No se pueden agendar citas regulares en horas que ya transcurrieron.');
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
