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

    /**
     * Hora límite (en minutos desde la medianoche) hasta la que se puede correr una cita:
     * 23:00. Una cita cuyo fin pasaría de ahí no se mueve; recepción la reagenda o la cancela.
     */
    public const LIMITE_NOCTURNO_MIN = 23 * 60;

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

        $this->marcarEstadoDeHorario($citas);
    }

    /**
     * Datos mínimos de las citas que no se pudieron correr (no caben antes de las 23:00),
     * para que recepción vea de quiénes se trata sin otra consulta.
     *
     * @param  array<int, string>  $ids
     * @return array<int, array{id: string, pacienteNombre: ?string, pacienteExpediente: ?string, hora_inicio: string, hora_fin: string}>
     */
    public function detalleSinEspacio(array $ids): array
    {
        if ($ids === []) {
            return [];
        }

        return cita::with('paciente')->whereIn('id_cita', $ids)->orderBy('hora_inicio')->get()
            ->map(fn (cita $c) => [
                'id' => $c->id_cita,
                'pacienteNombre' => $c->paciente?->nombre_completo,
                'pacienteExpediente' => $c->paciente?->numero_expediente,
                'hora_inicio' => substr((string) $c->hora_inicio, 0, 5),
                'hora_fin' => substr((string) $c->hora_fin, 0, 5),
            ])->all();
    }

    /**
     * Marca en cada cita regular pendiente si quedó fuera del horario del médico (por ejemplo
     * tras correrla) o si choca con otra cita regular del mismo médico. Las emergencias,
     * sobrecupos y consultas sin cita no dependen del horario. Si el médico no tiene ningún
     * horario configurado no se marca nada: no hay jornada contra la cual comparar.
     *
     * @param  Collection<int, cita>  $citas
     */
    private function marcarEstadoDeHorario(Collection $citas): void
    {
        $pendiente = fn (cita $c) => $c->tipo_cita === 'REGULAR' && in_array($c->estado, ['AGENDADA', 'EN_ESPERA'], true);
        $regulares = $citas->filter($pendiente);

        $horarios = collect();
        $mismas = collect();

        if ($regulares->isNotEmpty()) {
            $medicos = $regulares->pluck('id_medico')->unique()->values();
            $fechas = $regulares->map(fn (cita $c) => $c->fecha->toDateString())->unique()->values();

            $horarios = horario_medico::whereIn('id_medico', $medicos)->get()
                ->groupBy(fn (horario_medico $h) => $h->id_medico);

            // Todas las pendientes regulares de esos médicos y días: un choque se detecta
            // aunque el listado esté filtrado por estado o por otro criterio.
            $mismas = cita::where('tipo_cita', 'REGULAR')
                ->whereIn('estado', ['AGENDADA', 'EN_ESPERA'])
                ->whereIn('id_medico', $medicos)
                ->whereDate('fecha', '>=', $fechas->min())
                ->whereDate('fecha', '<=', $fechas->max())
                ->get(['id_cita', 'id_medico', 'fecha', 'hora_inicio', 'hora_fin'])
                ->groupBy(fn (cita $c) => $c->id_medico.'|'.$c->fecha->toDateString());
        }

        foreach ($citas as $c) {
            $fuera = false;
            $choca = false;

            if ($pendiente($c)) {
                $ini = substr((string) $c->hora_inicio, 0, 5);
                $fin = substr((string) $c->hora_fin, 0, 5);
                $dia = self::DIAS[$c->fecha->dayOfWeek];
                $delMedico = $horarios[$c->id_medico] ?? collect();

                if ($delMedico->isNotEmpty()) {
                    $fuera = ! $delMedico->contains(
                        fn (horario_medico $h) => $h->dia_semana === $dia
                            && $ini >= substr((string) $h->hora_inicio, 0, 5)
                            && $fin <= substr((string) $h->hora_fin, 0, 5),
                    );
                }

                $choca = ($mismas[$c->id_medico.'|'.$c->fecha->toDateString()] ?? collect())->contains(
                    fn (cita $o) => $o->id_cita !== $c->id_cita
                        && substr((string) $o->hora_inicio, 0, 5) < $fin
                        && substr((string) $o->hora_fin, 0, 5) > $ini,
                );
            }

            $c->setAttribute('fuera_de_horario', $fuera);
            $c->setAttribute('empalmada', $choca);
        }
    }

    /**
     * Citas pendientes del médico, de hoy en adelante, que su horario actual
     * cubre y el horario propuesto dejaría fuera. Solo las regulares: las
     * emergencias, sobrecupos y consultas sin cita no dependen del horario.
     *
     * @param  array<int, array{dia_semana: string, hora_inicio: string, hora_fin: string}>  $tramosNuevos
     * @return Collection<int, cita>
     */
    public function citasFueraDeHorario(string $medicoId, array $tramosNuevos): Collection
    {
        $actuales = horario_medico::where('id_medico', $medicoId)
            ->get()
            ->map(fn (horario_medico $h) => [
                'dia_semana' => $h->dia_semana,
                'hora_inicio' => substr((string) $h->hora_inicio, 0, 5),
                'hora_fin' => substr((string) $h->hora_fin, 0, 5),
            ])
            ->all();

        return cita::with('paciente')
            ->where('id_medico', $medicoId)
            ->whereDate('fecha', '>=', now()->toDateString())
            ->whereIn('estado', ['AGENDADA', 'EN_ESPERA'])
            ->where('tipo_cita', 'REGULAR')
            ->orderBy('fecha')
            ->orderBy('hora_inicio')
            ->get()
            ->filter(function (cita $c) use ($actuales, $tramosNuevos) {
                $dia = $this->diaSemanaDe($c->fecha->toDateString());
                $inicio = substr((string) $c->hora_inicio, 0, 5);
                $fin = substr((string) $c->hora_fin, 0, 5);

                return $this->tramosCubren($actuales, $dia, $inicio, $fin)
                    && ! $this->tramosCubren($tramosNuevos, $dia, $inicio, $fin);
            })
            ->values();
    }

    /** @param  array<int, array{dia_semana: string, hora_inicio: string, hora_fin: string}>  $tramos */
    private function tramosCubren(array $tramos, string $dia, string $inicio, string $fin): bool
    {
        foreach ($tramos as $tramo) {
            if ($tramo['dia_semana'] === $dia
                && $inicio >= substr($tramo['hora_inicio'], 0, 5)
                && $fin <= substr($tramo['hora_fin'], 0, 5)) {
                return true;
            }
        }

        return false;
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

            $tipo = $datos['tipo_cita'] ?? 'REGULAR';
            $esExcepcion = in_array($tipo, cita::TIPOS_SIN_VALIDACION, true);

            if ($tipo === 'SOBRECUPO') {
                $this->asegurarSobrecupo($datos['id_medico'], $datos['fecha'], $datos['hora_inicio'], $datos['hora_fin']);
            } elseif (! $esExcepcion) {
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

            if ($cita->tipo_cita === 'SOBRECUPO') {
                $this->asegurarSobrecupo(
                    $medicoDestinoId,
                    $fecha,
                    $horaInicio,
                    $horaFin,
                    $cita->id_cita,
                );
            } elseif (! in_array($cita->tipo_cita, cita::TIPOS_SIN_VALIDACION, true)) {
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
                // Una cita reprogramada a mano deja de estar "corrida".
                'hora_inicio_original' => null,
                'corrida_por' => null,
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
     * duración de cada una y respeta el orden. Las que quedan fuera de la jornada
     * pero antes de las 23:00 se corren igual y se devuelven señaladas; las que
     * terminarían después de las 23:00 NO se mueven (no hay citas de madrugada) y se
     * devuelven como `sin_espacio` para que recepción las reagende o las cancele.
     *
     * @return array{citas: array<int, cita>, fuera_de_horario: array<int, string>, sin_espacio: array<int, string>}
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
            $sinEspacio = [];
            $movidas = [];

            foreach ($citas as $c) {
                $inicio = $this->aMinutos((string) $c->hora_inicio) + $minutos;
                $fin = $this->aMinutos((string) $c->hora_fin) + $minutos;

                if ($fin > self::LIMITE_NOCTURNO_MIN) {
                    $sinEspacio[] = $c->id_cita;

                    continue;
                }

                $c->update([
                    'hora_inicio_original' => $c->hora_inicio_original ?? $c->hora_inicio,
                    'corrida_por' => 'ATRASO',
                    'hora_inicio' => $this->deMinutos($inicio),
                    'hora_fin' => $this->deMinutos($fin),
                ]);
                $movidas[] = $c;

                if (! $this->dentroDelHorario($medicoId, $fecha, $this->deMinutos($inicio), $this->deMinutos($fin))) {
                    $fueraDeHorario[] = $c->id_cita;
                }
            }

            return ['citas' => $movidas, 'fuera_de_horario' => $fueraDeHorario, 'sin_espacio' => $sinEspacio];
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
     * Una cita que al correrla terminaría después de las 23:00 no se mueve, y tampoco las
     * siguientes que tendrían que correrse: se devuelven como `sin_espacio` para que recepción
     * las reagende o las cancele. Con `$simular` solo se calcula el plan, sin guardar nada.
     *
     * @return array{citas: array<int, cita>, fuera_de_horario: array<int, string>, sin_espacio: array<int, string>, plan: array<int, array{cita: cita, nuevo_inicio: string, nuevo_fin: string, fuera_de_horario: bool}>}
     *
     * @throws RuntimeException si el bloqueo es de día completo o no afecta ninguna cita
     */
    public function correrCitasTrasBloqueo(bloqueo_agenda $bloqueo, bool $simular = false): array
    {
        if (! $bloqueo->esParcial()) {
            throw new RuntimeException(
                'Un bloqueo de día completo no se corre: reagenda o cancela las citas.',
            );
        }

        return $this->correrTrasVentana(
            $bloqueo->id_medico,
            $bloqueo->fecha->toDateString(),
            $bloqueo->horaInicioCorta(),
            $bloqueo->horaFinCorta(),
            ignorarBloqueoId: $bloqueo->id_bloqueo,
            excluirCitaId: null,
            simular: $simular,
            vacioEsError: true,
            origen: 'BLOQUEO',
        );
    }

    /**
     * Una emergencia ocupa su horario aunque haya otra cita: las citas regulares que chocan con ella
     * se corren detrás, una por una y en orden, igual que tras un bloqueo parcial (mismo límite de
     * las 23:00). La emergencia no se mueve. Si nada choca, no hay nada que correr.
     *
     * @return array{citas: array<int, cita>, fuera_de_horario: array<int, string>, sin_espacio: array<int, string>, plan: array<int, array{cita: cita, nuevo_inicio: string, nuevo_fin: string, fuera_de_horario: bool}>}
     */
    public function correrCitasTrasEmergencia(cita $emergencia, bool $simular = false): array
    {
        return $this->correrTrasVentana(
            $emergencia->id_medico,
            $emergencia->fecha->toDateString(),
            substr((string) $emergencia->hora_inicio, 0, 5),
            substr((string) $emergencia->hora_fin, 0, 5),
            ignorarBloqueoId: null,
            excluirCitaId: $emergencia->id_cita,
            simular: $simular,
            vacioEsError: false,
            origen: 'EMERGENCIA',
        );
    }

    /**
     * Cómo queda la corrida para responder al frontend: cada cita movida con su horario actual y el nuevo.
     *
     * @param  array{plan: array<int, array{cita: cita, nuevo_inicio: string, nuevo_fin: string, fuera_de_horario: bool, antes_inicio?: string, antes_fin?: string}>}  $resultado
     * @return array<int, array<string, mixed>>
     */
    public function planParaRespuesta(array $resultado): array
    {
        return collect($resultado['plan'])->map(function (array $p) {
            $p['cita']->loadMissing('paciente');

            return [
                'id' => $p['cita']->id_cita,
                'pacienteNombre' => $p['cita']->paciente?->nombre_completo,
                'pacienteExpediente' => $p['cita']->paciente?->numero_expediente,
                // La hora de antes, aunque la corrida ya se haya guardado.
                'hora_inicio' => $p['antes_inicio'] ?? substr((string) $p['cita']->hora_inicio, 0, 5),
                'hora_fin' => $p['antes_fin'] ?? substr((string) $p['cita']->hora_fin, 0, 5),
                'nuevo_inicio' => $p['nuevo_inicio'],
                'nuevo_fin' => $p['nuevo_fin'],
                'fueraDeHorario' => $p['fuera_de_horario'],
            ];
        })->values()->all();
    }

    /**
     * Libera una ventana de horario (un bloqueo parcial o una emergencia) corriendo las citas pendientes
     * que caen dentro de ella y las siguientes que choquen con ellas. Ver correrCitasTrasBloqueo.
     */
    private function correrTrasVentana(
        string $medicoId,
        string $fecha,
        string $desde,
        string $hasta,
        ?string $ignorarBloqueoId,
        ?string $excluirCitaId,
        bool $simular,
        bool $vacioEsError,
        string $origen,
    ): array {
        return DB::transaction(function () use ($medicoId, $fecha, $desde, $hasta, $ignorarBloqueoId, $excluirCitaId, $simular, $vacioEsError, $origen) {
            User::where('id', $medicoId)->lockForUpdate()->first();

            $pendientes = cita::where('id_medico', $medicoId)
                ->whereDate('fecha', $fecha)
                ->whereIn('estado', ['AGENDADA', 'EN_ESPERA'])
                ->when($excluirCitaId, fn ($q, $id) => $q->where('id_cita', '!=', $id))
                ->orderBy('hora_inicio')
                ->orderBy('hora_fin')
                ->lockForUpdate()
                ->get();

            $afectadas = $pendientes
                // Una emergencia solo desplaza a las citas regulares; las demás excepciones se quedan.
                ->filter(fn (cita $c) => ($excluirCitaId === null || $c->tipo_cita === 'REGULAR')
                    && substr((string) $c->hora_inicio, 0, 5) < $hasta
                    && substr((string) $c->hora_fin, 0, 5) > $desde)
                ->pluck('id_cita')
                ->all();

            if ($afectadas === []) {
                if ($vacioEsError) {
                    throw new RuntimeException('Ninguna cita quedó dentro de este bloqueo.');
                }

                return ['citas' => [], 'fuera_de_horario' => [], 'sin_espacio' => [], 'plan' => []];
            }

            // Otros bloqueos del mismo día: una cita corrida no puede caer en ellos.
            $otrosBloqueos = $this->bloqueosParcialesDe($medicoId, $fecha)
                ->reject(fn (bloqueo_agenda $b) => $b->id_bloqueo === $ignorarBloqueoId);

            $libreDesde = $this->aMinutos($hasta);
            $enZona = false;
            $movidas = [];
            $plan = [];
            $fueraDeHorario = [];
            $sinEspacio = [];
            $sinCupo = false;

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

                // Desde la primera que no cabe, las siguientes que habría que mover tampoco caben
                // (siguen el mismo orden); se dejan donde están para no desordenar la agenda.
                if ($sinCupo) {
                    $sinEspacio[] = $c->id_cita;

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

                if ($nuevoFin > self::LIMITE_NOCTURNO_MIN) {
                    $sinCupo = true;
                    $sinEspacio[] = $c->id_cita;

                    continue;
                }

                $fuera = ! $this->dentroDelHorario($medicoId, $fecha, $this->deMinutos($nuevoInicio), $this->deMinutos($nuevoFin));

                $plan[] = [
                    'cita' => $c,
                    'antes_inicio' => substr((string) $c->hora_inicio, 0, 5),
                    'antes_fin' => substr((string) $c->hora_fin, 0, 5),
                    'nuevo_inicio' => $this->deMinutos($nuevoInicio),
                    'nuevo_fin' => $this->deMinutos($nuevoFin),
                    'fuera_de_horario' => $fuera,
                ];

                if (! $simular) {
                    $c->update([
                        // Se guarda la hora de la primera vez, aunque se corra más de una vez.
                        'hora_inicio_original' => $c->hora_inicio_original ?? $c->hora_inicio,
                        'corrida_por' => $origen,
                        'hora_inicio' => $this->deMinutos($nuevoInicio),
                        'hora_fin' => $this->deMinutos($nuevoFin),
                    ]);
                }
                $movidas[] = $c;

                if ($fuera) {
                    $fueraDeHorario[] = $c->id_cita;
                }

                $libreDesde = $nuevoFin;
            }

            return [
                'citas' => $movidas,
                'fuera_de_horario' => $fueraDeHorario,
                'sin_espacio' => $sinEspacio,
                'plan' => $plan,
            ];
        });
    }

    /** Hora en que termina la última cita vigente del médico ese día ('H:i'), o null si no tiene. */
    public function finDeLaUltimaCita(string $medicoId, string $fecha, ?string $ignorarCitaId = null): ?string
    {
        $fin = cita::where('id_medico', $medicoId)
            ->whereDate('fecha', $fecha)
            ->whereIn('estado', cita::ESTADOS_VIGENTES)
            ->when($ignorarCitaId, fn ($q, $id) => $q->where('id_cita', '!=', $id))
            ->max('hora_fin');

        return $fin ? substr((string) $fin, 0, 5) : null;
    }

    /**
     * Un sobrecupo es un paciente extra que el médico acepta ver además de su jornada: puede quedar
     * fuera de su horario, pero siempre después de la última cita del día y nunca encima de otra, ni
     * en un bloqueo, ni terminando después de las 23:00.
     *
     * @throws RuntimeException
     */
    private function asegurarSobrecupo(
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

        if ($this->aMinutos($horaFin) > self::LIMITE_NOCTURNO_MIN) {
            throw new RuntimeException('Un sobrecupo no puede terminar después de las 11 p. m.');
        }

        if (Carbon::parse($fecha)->isToday() && $horaInicio < now()->format('H:i')) {
            throw new RuntimeException('No se puede agendar un sobrecupo en una hora que ya transcurrió hoy.');
        }

        $ultima = $this->finDeLaUltimaCita($medicoId, $fecha, $ignorarCitaId);
        if ($ultima !== null && $horaInicio < $ultima) {
            throw new RuntimeException(
                "Un sobrecupo va después de la última cita del médico ese día, que termina a las {$ultima}. Elige una hora desde ahí.",
            );
        }
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
