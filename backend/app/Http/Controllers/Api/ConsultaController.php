<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Controllers\Controller;
use App\Http\Resources\ConsultaResource;
use App\Http\Resources\EspecialidadResource;
use App\Models\cita;
use App\Models\consulta;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ConsultaController extends Controller
{
    use RespondsWithJson;

    /**
     * Especialidades con las que el médico autenticado puede atender. La
     * pantalla las ofrece antes de abrir la consulta (HU-39).
     */
    public function especialidadesDisponibles(Request $request): JsonResponse
    {
        $especialidades = $request->user()
            ->especialidades()
            ->where('estado', 'ACTIVA')
            ->orderBy('nombre')
            ->get();

        return $this->success(EspecialidadResource::collection($especialidades)->resolve());
    }

    public function show(consulta $consulta): JsonResponse
    {
        return $this->success(
            (new ConsultaResource($consulta->load(['medico', 'especialidad', 'cita.paciente'])))
                ->resolve(),
        );
    }

    /**
     * Abre la consulta de una cita. El médico elige con qué especialidad
     * atiende; si solo tiene una asignada, se toma esa sin preguntar.
     */
    public function store(Request $request, cita $cita): JsonResponse
    {
        $medico = $request->user();

        if ($cita->id_medico !== $medico->id) {
            return $this->failure('Solo puedes atender las citas de tu propia agenda.', 403);
        }

        if (in_array($cita->estado, ['CANCELADA', 'NO_ASISTIO'], true)) {
            return $this->failure('La cita no está en condiciones de atenderse.', 422);
        }

        if (consulta::where('id_cita', $cita->id_cita)->exists()) {
            return $this->failure('Esta cita ya tiene una consulta abierta.', 409);
        }

        $asignadas = $medico->especialidades()->where('estado', 'ACTIVA')->pluck('especialidades.id');

        $validado = $request->validate([
            'especialidad_atencion_id' => ['nullable', 'uuid'],
            'motivo_consulta' => ['nullable', 'string', 'max:1000'],
        ]);

        $especialidadId = $validado['especialidad_atencion_id'] ?? null;

        if ($especialidadId === null && $asignadas->count() === 1) {
            $especialidadId = $asignadas->first();
        }

        if ($especialidadId !== null && ! $asignadas->contains($especialidadId)) {
            return $this->failure('Esa especialidad no está asignada al médico.', 422);
        }

        if ($especialidadId === null && $asignadas->count() > 1) {
            return $this->failure('Debes indicar con qué especialidad atiendes la consulta.', 422);
        }

        $consulta = DB::transaction(function () use ($cita, $medico, $especialidadId, $validado) {
            $consulta = consulta::create([
                'id_cita' => $cita->id_cita,
                'id_medico' => $medico->id,
                'id_especialidad_atencion' => $especialidadId,
                'fecha_hora_inicio' => now(),
                'motivo_consulta' => $validado['motivo_consulta'] ?? null,
            ]);

            $cita->update(['estado' => 'EN_ATENCION']);

            return $consulta;
        });

        return $this->success(
            (new ConsultaResource($consulta->load(['medico', 'especialidad', 'cita.paciente'])))
                ->resolve(),
            'Consulta iniciada correctamente.',
            201,
        );
    }

    /**
     * Cierra la consulta. Nunca ocurre solo: exceder el bloque previsto
     * genera alerta pero no cierra la atención.
     */
    public function finalizar(Request $request, consulta $consulta): JsonResponse
    {
        if ($consulta->id_medico !== $request->user()->id) {
            return $this->failure('Solo el médico que la abrió puede cerrar la consulta.', 403);
        }

        if (! $consulta->estaAbierta()) {
            return $this->failure('La consulta ya fue cerrada.', 422);
        }

        $validado = $request->validate([
            'notas_adicionales' => ['nullable', 'string', 'max:2000'],
        ]);

        DB::transaction(function () use ($consulta, $validado) {
            $consulta->update([
                'fecha_hora_fin' => now(),
                'notas_adicionales' => $validado['notas_adicionales'] ?? $consulta->notas_adicionales,
            ]);

            $consulta->cita->update(['estado' => 'ATENDIDA']);
        });

        return $this->success(
            (new ConsultaResource($consulta->refresh()->load(['medico', 'especialidad', 'cita.paciente'])))
                ->resolve(),
            'Consulta finalizada correctamente.',
        );
    }
}
