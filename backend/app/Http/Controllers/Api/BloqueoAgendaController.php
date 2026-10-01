<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Controllers\Controller;
use App\Http\Resources\BloqueoAgendaResource;
use App\Http\Resources\CitaResource;
use App\Models\bloqueo_agenda;
use App\Models\cita;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BloqueoAgendaController extends Controller
{
    use RespondsWithJson;

    public function index(Request $request): JsonResponse
    {
        $validado = $request->validate([
            'medico_id' => ['nullable', 'uuid'],
            'desde' => ['nullable', 'date_format:Y-m-d'],
            'hasta' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:desde'],
        ]);

        $bloqueos = bloqueo_agenda::with('medico')
            ->when($validado['medico_id'] ?? null, fn ($q, $id) => $q->where('id_medico', $id))
            ->when($validado['desde'] ?? null, fn ($q, $d) => $q->whereDate('fecha', '>=', $d))
            ->when($validado['hasta'] ?? null, fn ($q, $h) => $q->whereDate('fecha', '<=', $h))
            ->orderBy('fecha')
            ->get();

        return $this->success(BloqueoAgendaResource::collection($bloqueos)->resolve());
    }

    /**
     * Las citas que ya existían ese día no se cancelan: se devuelven para que
     * recepción decida qué hacer con cada una.
     */
    public function store(Request $request): JsonResponse
    {
        $validado = $request->validate([
            'medico_id' => ['required', 'uuid', 'exists:users,id'],
            'fecha' => ['required', 'date_format:Y-m-d'],
            'motivo' => ['nullable', 'string', 'max:255'],
        ]);

        $medico = User::find($validado['medico_id']);
        if ($medico->rol !== 'MEDICO') {
            return $this->failure('El usuario indicado no es médico.', 422);
        }

        $yaExiste = bloqueo_agenda::where('id_medico', $validado['medico_id'])
            ->whereDate('fecha', $validado['fecha'])
            ->exists();

        if ($yaExiste) {
            return $this->failure('Ese día ya está bloqueado para el médico.', 409);
        }

        $bloqueo = bloqueo_agenda::create([
            'id_medico' => $validado['medico_id'],
            'fecha' => $validado['fecha'],
            'motivo' => $validado['motivo'] ?? null,
            'id_creado_por' => $request->user()->id,
        ]);

        $afectadas = cita::with(['paciente', 'medico'])
            ->where('id_medico', $validado['medico_id'])
            ->whereDate('fecha', $validado['fecha'])
            ->whereIn('estado', ['AGENDADA', 'EN_ESPERA'])
            ->orderBy('hora_inicio')
            ->get();

        return $this->success([
            'bloqueo' => (new BloqueoAgendaResource($bloqueo->load('medico')))->resolve(),
            'citasAfectadas' => CitaResource::collection($afectadas)->resolve(),
        ], 'Agenda bloqueada correctamente.', 201);
    }

    public function destroy(bloqueo_agenda $bloqueo): JsonResponse
    {
        $bloqueo->delete();

        return $this->success(null, 'Bloqueo eliminado correctamente.');
    }
}
