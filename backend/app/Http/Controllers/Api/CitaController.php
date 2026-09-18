<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Controllers\Controller;
use App\Http\Resources\CitaResource;
use App\Models\cita;
use App\Models\User;
use App\Services\AgendaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use RuntimeException;

class CitaController extends Controller
{
    use RespondsWithJson;

    public function __construct(private readonly AgendaService $agenda) {}

    public function index(Request $request): JsonResponse
    {
        $validado = $request->validate([
            'medico_id' => ['nullable', 'uuid'],
            'paciente_id' => ['nullable', 'uuid'],
            'fecha' => ['nullable', 'date_format:Y-m-d'],
            'desde' => ['nullable', 'date_format:Y-m-d'],
            'hasta' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:desde'],
            'estado' => ['nullable', Rule::in(['AGENDADA', 'EN_ESPERA', 'EN_ATENCION', 'ATENDIDA', 'CANCELADA', 'NO_ASISTIO'])],
        ]);

        $usuario = $request->user();

        $citas = cita::with(['paciente', 'medico', 'especialidad'])
            // Un médico solo ve su propia agenda.
            ->when($usuario->rol === 'MEDICO', fn ($q) => $q->where('id_medico', $usuario->id))
            ->when($validado['medico_id'] ?? null, fn ($q, $id) => $q->where('id_medico', $id))
            ->when($validado['paciente_id'] ?? null, fn ($q, $id) => $q->where('id_paciente', $id))
            ->when($validado['fecha'] ?? null, fn ($q, $f) => $q->whereDate('fecha', $f))
            ->when($validado['desde'] ?? null, fn ($q, $d) => $q->whereDate('fecha', '>=', $d))
            ->when($validado['hasta'] ?? null, fn ($q, $h) => $q->whereDate('fecha', '<=', $h))
            ->when($validado['estado'] ?? null, fn ($q, $e) => $q->where('estado', $e))
            ->orderBy('fecha')
            ->orderBy('hora_inicio')
            ->get();

        return $this->success(CitaResource::collection($citas)->resolve());
    }

    /** Bloques libres del día, ya descontando bloqueos y citas regulares. */
    public function disponibilidad(Request $request): JsonResponse
    {
        $validado = $request->validate([
            'medico_id' => ['required', 'uuid', 'exists:users,id'],
            'fecha' => ['required', 'date_format:Y-m-d'],
        ]);

        return $this->success([
            'bloqueado' => $this->agenda->estaBloqueado($validado['medico_id'], $validado['fecha']),
            'bloques' => $this->agenda->bloquesDisponibles($validado['medico_id'], $validado['fecha']),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validado = $request->validate([
            'paciente_id' => ['required', 'uuid', 'exists:paciente,id_paciente'],
            'medico_id' => ['required', 'uuid', 'exists:users,id'],
            'especialidad_id' => ['nullable', 'uuid', 'exists:especialidades,id'],
            'fecha' => ['required', 'date_format:Y-m-d'],
            'hora_inicio' => ['required', 'date_format:H:i'],
            'hora_fin' => ['required', 'date_format:H:i', 'after:hora_inicio'],
            'tipo_cita' => ['nullable', Rule::in(['REGULAR', 'EMERGENCIA', 'SOBRECUPO'])],
        ]);

        $usuario = $request->user();

        $medico = User::find($validado['medico_id']);
        if ($medico->rol !== 'MEDICO' || $medico->estado !== 'ACTIVO') {
            return $this->failure('El médico indicado no está disponible.', 422);
        }

        // Un médico solo agenda en su propia agenda.
        if ($usuario->rol === 'MEDICO' && $usuario->id !== $validado['medico_id']) {
            return $this->failure('Solo puedes agendar citas en tu propia agenda.', 403);
        }

        try {
            $cita = $this->agenda->agendar([
                'id_paciente' => $validado['paciente_id'],
                'id_medico' => $validado['medico_id'],
                'id_especialidad' => $validado['especialidad_id'] ?? null,
                'fecha' => $validado['fecha'],
                'hora_inicio' => $validado['hora_inicio'],
                'hora_fin' => $validado['hora_fin'],
                'tipo_cita' => $validado['tipo_cita'] ?? 'REGULAR',
                'id_creado_por' => $usuario->id,
            ]);
        } catch (RuntimeException $e) {
            return $this->failure($e->getMessage(), 409);
        }

        return $this->success(
            (new CitaResource($cita->load(['paciente', 'medico', 'especialidad'])))->resolve(),
            'Cita agendada correctamente.',
            201,
        );
    }

    public function cancelar(Request $request, cita $cita): JsonResponse
    {
        $validado = $request->validate([
            'motivo_cancelacion' => ['required', 'string', 'max:500'],
        ]);

        if (in_array($cita->estado, ['CANCELADA', 'ATENDIDA'], true)) {
            return $this->failure('La cita ya no puede cancelarse.', 422);
        }

        $cita->update([
            'estado' => 'CANCELADA',
            'motivo_cancelacion' => $validado['motivo_cancelacion'],
        ]);

        return $this->success(
            (new CitaResource($cita->refresh()->load(['paciente', 'medico'])))->resolve(),
            'Cita cancelada correctamente.',
        );
    }

    public function reprogramar(Request $request, cita $cita): JsonResponse
    {
        $validado = $request->validate([
            'fecha' => ['required', 'date_format:Y-m-d'],
            'hora_inicio' => ['required', 'date_format:H:i'],
            'hora_fin' => ['required', 'date_format:H:i', 'after:hora_inicio'],
        ]);

        if (in_array($cita->estado, ['ATENDIDA', 'EN_ATENCION'], true)) {
            return $this->failure('Una cita en atención o ya atendida no se reprograma.', 422);
        }

        try {
            $cita = $this->agenda->reprogramar(
                $cita,
                $validado['fecha'],
                $validado['hora_inicio'],
                $validado['hora_fin'],
            );
        } catch (RuntimeException $e) {
            return $this->failure($e->getMessage(), 409);
        }

        return $this->success(
            (new CitaResource($cita->load(['paciente', 'medico'])))->resolve(),
            'Cita reprogramada correctamente.',
        );
    }

    /**
     * El orden de atención se asigna por llegada, no por hora agendada: cada
     * paciente que llega toma el siguiente número libre del día.
     */
    public function registrarLlegada(Request $request, cita $cita): JsonResponse
    {
        if ($cita->estado !== 'AGENDADA') {
            return $this->failure('Solo una cita agendada puede marcarse como llegada.', 422);
        }

        $siguiente = (int) cita::where('id_medico', $cita->id_medico)
            ->whereDate('fecha', $cita->fecha)
            ->max('orden_atencion');

        $cita->update([
            'estado' => 'EN_ESPERA',
            'hora_llegada' => now(),
            'orden_atencion' => $siguiente + 1,
        ]);

        return $this->success(
            (new CitaResource($cita->refresh()->load(['paciente', 'medico'])))->resolve(),
            'Llegada registrada correctamente.',
        );
    }

    /** Mueve al paciente al final de la fila cuando llega con retraso. */
    public function moverAlFinal(Request $request, cita $cita): JsonResponse
    {
        if ($cita->estado !== 'EN_ESPERA') {
            return $this->failure('Solo un paciente en espera puede moverse de lugar.', 422);
        }

        $ultimo = (int) cita::where('id_medico', $cita->id_medico)
            ->whereDate('fecha', $cita->fecha)
            ->max('orden_atencion');

        $cita->update(['orden_atencion' => $ultimo + 1]);

        return $this->success(
            (new CitaResource($cita->refresh()->load(['paciente', 'medico'])))->resolve(),
            'Paciente movido al final de la fila.',
        );
    }
}
