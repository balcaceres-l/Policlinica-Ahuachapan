<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Controllers\Controller;
use App\Http\Resources\BloqueoAgendaResource;
use App\Http\Resources\CitaResource;
use App\Models\bloqueo_agenda;
use App\Models\User;
use App\Services\AgendaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class BloqueoAgendaController extends Controller
{
    use RespondsWithJson;

    public function __construct(private readonly AgendaService $agenda) {}

    /**
     * Sirve a la vez de bloqueos vigentes y de historial: no se descartan las
     * fechas pasadas, así que `desde`/`hasta` responde qué médicos faltaron.
     */
    public function index(Request $request): JsonResponse
    {
        $validado = $request->validate([
            'medico_id' => ['nullable', 'uuid'],
            'desde' => ['nullable', 'date_format:Y-m-d'],
            'hasta' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:desde'],
        ]);

        $bloqueos = bloqueo_agenda::with(['medico', 'creadoPor'])
            ->when($validado['medico_id'] ?? null, fn ($q, $id) => $q->where('id_medico', $id))
            ->when($validado['desde'] ?? null, fn ($q, $d) => $q->whereDate('fecha', '>=', $d))
            ->when($validado['hasta'] ?? null, fn ($q, $h) => $q->whereDate('fecha', '<=', $h))
            ->orderBy('fecha')
            ->orderBy('hora_inicio')
            ->get();

        $this->agenda->contarCitasAfectadas($bloqueos);

        return $this->success(BloqueoAgendaResource::collection($bloqueos)->resolve());
    }

    /**
     * Las citas que ya existían en ese lapso no se cancelan ni se mueven: se
     * devuelven para que recepción contacte a cada paciente y decida.
     */
    public function store(Request $request): JsonResponse
    {
        $validado = $request->validate([
            'medico_id' => ['required', 'uuid', 'exists:users,id'],
            'fecha' => ['required', 'date_format:Y-m-d'],
            // Sin horas, el bloqueo es de día completo; con horas, parcial.
            'hora_inicio' => ['nullable', 'date_format:H:i', 'required_with:hora_fin'],
            'hora_fin' => ['nullable', 'date_format:H:i', 'required_with:hora_inicio', 'after:hora_inicio'],
            'motivo' => ['nullable', 'string', 'max:255'],
        ]);

        $medico = User::find($validado['medico_id']);
        if ($medico->rol !== 'MEDICO') {
            return $this->failure('El usuario indicado no es médico.', 422);
        }

        $horaInicio = $validado['hora_inicio'] ?? null;
        $horaFin = $validado['hora_fin'] ?? null;
        $esParcial = $horaInicio !== null;

        // Serializar por médico evita que dos bloqueos simultáneos pasen la
        // comprobación de traslape y se guarden ambos.
        [$bloqueo, $choque] = DB::transaction(function () use ($validado, $horaInicio, $horaFin, $esParcial, $request) {
            User::where('id', $validado['medico_id'])->lockForUpdate()->first();

            $choque = bloqueo_agenda::where('id_medico', $validado['medico_id'])
                ->whereDate('fecha', $validado['fecha'])
                ->get()
                ->first(fn (bloqueo_agenda $b) => $esParcial
                    ? $b->solapaCon($horaInicio, $horaFin)
                    : true);

            if ($choque !== null) {
                return [null, $choque];
            }

            return [bloqueo_agenda::create([
                'id_medico' => $validado['medico_id'],
                'fecha' => $validado['fecha'],
                'hora_inicio' => $horaInicio,
                'hora_fin' => $horaFin,
                'motivo' => $validado['motivo'] ?? null,
                'id_creado_por' => $request->user()->id,
            ])->refresh(), null];
        });

        if ($choque !== null) {
            return $this->failure($this->mensajeDeChoque($choque, $esParcial), 409);
        }

        $afectadas = $this->agenda->citasAfectadas($bloqueo)->load(['paciente', 'medico']);

        return $this->success([
            'bloqueo' => (new BloqueoAgendaResource($bloqueo->load(['medico', 'creadoPor'])))->resolve(),
            'citasAfectadas' => CitaResource::collection($afectadas)->resolve(),
        ], 'Agenda bloqueada correctamente.', 201);
    }

    /** Citas pendientes que hoy siguen dentro del bloqueo. */
    public function citasAfectadas(bloqueo_agenda $bloqueo): JsonResponse
    {
        $citas = $this->agenda->citasAfectadas($bloqueo)->load(['paciente', 'medico']);

        return $this->success(CitaResource::collection($citas)->resolve());
    }

    /**
     * Para pacientes que ya están en la clínica: las citas afectadas pasan a
     * empezar cuando termina el bloqueo, en orden, y solo se corren las
     * siguientes que choquen con ellas.
     */
    public function correrCitas(bloqueo_agenda $bloqueo): JsonResponse
    {
        try {
            $resultado = $this->agenda->correrCitasTrasBloqueo($bloqueo);
        } catch (RuntimeException $e) {
            return $this->failure($e->getMessage(), 422);
        }

        $citas = collect($resultado['citas'])->each->load(['paciente', 'medico']);

        return $this->success([
            'citas' => CitaResource::collection($citas)->resolve(),
            'fueraDeHorario' => $resultado['fuera_de_horario'],
        ], count($citas).' cita(s) corrida(s).');
    }

    public function destroy(bloqueo_agenda $bloqueo): JsonResponse
    {
        // Un bloqueo que ya pasó es el registro de que el médico faltó.
        if ($bloqueo->fecha->lt(today())) {
            return $this->failure(
                'Un bloqueo de una fecha pasada forma parte del historial y no se elimina.',
                422,
            );
        }

        $bloqueo->delete();

        return $this->success(null, 'Bloqueo eliminado correctamente.');
    }

    private function mensajeDeChoque(bloqueo_agenda $existente, bool $nuevoEsParcial): string
    {
        if (! $nuevoEsParcial && ! $existente->esParcial()) {
            return 'Ese día ya está bloqueado para el médico.';
        }

        if (! $nuevoEsParcial) {
            return 'Ya hay un bloqueo parcial ese día; elimínalo antes de bloquear el día completo.';
        }

        return $existente->esParcial()
            ? "Ya existe un bloqueo de {$existente->horaInicioCorta()} a {$existente->horaFinCorta()} que se traslapa con ese horario."
            : 'Ese día ya está bloqueado completo para el médico.';
    }
}
