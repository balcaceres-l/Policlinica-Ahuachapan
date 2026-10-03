<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Controllers\Controller;
use App\Http\Resources\CitaResource;
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

    public function salaEspera(Request $request): JsonResponse
    {
        $medico = $request->user();
        $hoy = now()->toDateString();

        $citas = cita::with(['paciente', 'especialidad', 'signosVitales.registradoPor', 'consulta'])
            ->where('id_medico', $medico->id)
            ->whereDate('fecha', $hoy)
            ->whereIn('estado', ['AGENDADA', 'EN_ESPERA', 'EN_ATENCION', 'ATENDIDA'])
            ->orderByRaw("CASE 
                WHEN estado = 'EN_ATENCION' THEN 1 
                WHEN estado = 'EN_ESPERA' THEN 2 
                WHEN estado = 'AGENDADA' THEN 3 
                ELSE 4 
            END")
            ->orderBy('orden_atencion')
            ->orderBy('hora_inicio')
            ->get();

        return $this->success(CitaResource::collection($citas)->resolve());
    }

    public function show(Request $request, consulta $consulta): JsonResponse
    {
        if ($consulta->id_medico !== $request->user()->id) {
            return $this->failure('Solo puedes acceder a las consultas de tu propia agenda.', 403);
        }

        return $this->success(
            (new ConsultaResource($consulta->load([
                'medico',
                'especialidad',
                'cita.paciente',
                'cita.signosVitales.registradoPor',
                'examenesFisicos',
                'planManejo',
                'receta.detalles',
            ])))->resolve(),
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
            (new ConsultaResource($consulta->load([
                'medico',
                'especialidad',
                'cita.paciente',
                'cita.signosVitales.registradoPor',
                'examenesFisicos',
                'planManejo',
                'receta.detalles',
            ])))->resolve(),
            'Consulta iniciada correctamente.',
            201,
        );
    }

    /**
     * Guarda el progreso clínico de la consulta: motivo, notas, precio, total,
     * examen físico, plan de manejo y receta médica.
     */
    public function update(Request $request, consulta $consulta): JsonResponse
    {
        if ($consulta->id_medico !== $request->user()->id) {
            return $this->failure('Solo puedes modificar tus propias consultas.', 403);
        }

        if (! $consulta->estaAbierta()) {
            return $this->failure('No se puede modificar una consulta finalizada.', 422);
        }

        $validado = $request->validate([
            'motivo_consulta' => ['nullable', 'string', 'max:1000'],
            'notas_adicionales' => ['nullable', 'string', 'max:2000'],
            'precio' => ['nullable', 'numeric', 'min:0'],
            'total' => ['nullable', 'numeric', 'min:0'],
            'segundos_transcurridos' => ['nullable', 'integer', 'min:0'],
            'en_pausa' => ['nullable', 'boolean'],
            'examenes_fisicos' => ['nullable', 'array'],
            'examenes_fisicos.*.region_anatomica' => ['nullable', 'string', 'max:100'],
            'examenes_fisicos.*.hallazgos' => ['nullable', 'string'],
            'plan_manejo' => ['nullable', 'array'],
            'plan_manejo.descripcion' => ['nullable', 'string'],
            'plan_manejo.indicaciones' => ['nullable', 'string'],
            'receta' => ['nullable', 'array'],
            'receta.observaciones_generales' => ['nullable', 'string'],
            'receta.detalles' => ['nullable', 'array'],
            'receta.detalles.*.nombre_medicamento' => ['required_with:receta.detalles', 'string', 'max:200'],
            'receta.detalles.*.dosis' => ['required_with:receta.detalles', 'string', 'max:100'],
            'receta.detalles.*.via_administracion' => ['nullable', 'string', 'max:50'],
            'receta.detalles.*.frecuencia' => ['required_with:receta.detalles', 'string', 'max:100'],
            'receta.detalles.*.duracion' => ['nullable', 'string', 'max:100'],
            'receta.detalles.*.indicaciones' => ['nullable', 'string'],
        ]);

        DB::transaction(function () use ($consulta, $validado) {
            $camposConsulta = [];
            foreach (['motivo_consulta', 'notas_adicionales', 'precio', 'total', 'segundos_transcurridos', 'en_pausa'] as $campo) {
                if (array_key_exists($campo, $validado)) {
                    $camposConsulta[$campo] = $validado[$campo];
                }
            }

            if (! empty($camposConsulta)) {
                $consulta->update($camposConsulta);
            }

            // Examen físico
            if (array_key_exists('examenes_fisicos', $validado)) {
                $consulta->examenesFisicos()->delete();
                if (is_array($validado['examenes_fisicos'])) {
                    foreach ($validado['examenes_fisicos'] as $ef) {
                        if (! empty($ef['region_anatomica']) || ! empty($ef['hallazgos'])) {
                            $consulta->examenesFisicos()->create([
                                'region_anatomica' => $ef['region_anatomica'] ?? null,
                                'hallazgos' => $ef['hallazgos'] ?? null,
                            ]);
                        }
                    }
                }
            }

            // Plan de manejo
            if (array_key_exists('plan_manejo', $validado)) {
                if ($validado['plan_manejo'] !== null) {
                    $consulta->planManejo()->updateOrCreate(
                        ['id_consulta' => $consulta->id_consulta],
                        [
                            'descripcion' => $validado['plan_manejo']['descripcion'] ?? null,
                            'indicaciones' => $validado['plan_manejo']['indicaciones'] ?? null,
                        ],
                    );
                } else {
                    $consulta->planManejo()->delete();
                }
            }

            // Receta médica y detalles
            if (array_key_exists('receta', $validado)) {
                if ($validado['receta'] !== null) {
                    $receta = $consulta->receta()->updateOrCreate(
                        ['id_consulta' => $consulta->id_consulta],
                        [
                            'observaciones_generales' => $validado['receta']['observaciones_generales'] ?? null,
                        ],
                    );

                    if (isset($validado['receta']['detalles'])) {
                        $receta->detalles()->delete();
                        foreach ($validado['receta']['detalles'] as $det) {
                            $receta->detalles()->create([
                                'nombre_medicamento' => $det['nombre_medicamento'],
                                'dosis' => $det['dosis'],
                                'via_administracion' => $det['via_administracion'] ?? null,
                                'frecuencia' => $det['frecuencia'],
                                'duracion' => $det['duracion'] ?? null,
                                'indicaciones' => $det['indicaciones'] ?? null,
                            ]);
                        }
                    }
                } else {
                    $consulta->receta()->delete();
                }
            }
        });

        return $this->success(
            (new ConsultaResource($consulta->fresh([
                'medico',
                'especialidad',
                'cita.paciente',
                'cita.signosVitales.registradoPor',
                'examenesFisicos',
                'planManejo',
                'receta.detalles',
            ])))->resolve(),
            'Consulta actualizada correctamente.',
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
            'precio' => ['nullable', 'numeric', 'min:0'],
            'total' => ['nullable', 'numeric', 'min:0'],
            'segundos_transcurridos' => ['nullable', 'integer', 'min:0'],
        ]);

        DB::transaction(function () use ($consulta, $validado) {
            $datos = [
                'fecha_hora_fin' => now(),
                'en_pausa' => false,
            ];

            if (array_key_exists('notas_adicionales', $validado)) {
                $datos['notas_adicionales'] = $validado['notas_adicionales'];
            }
            if (array_key_exists('precio', $validado)) {
                $datos['precio'] = $validado['precio'];
            }
            if (array_key_exists('total', $validado)) {
                $datos['total'] = $validado['total'];
            }
            if (array_key_exists('segundos_transcurridos', $validado)) {
                $datos['segundos_transcurridos'] = $validado['segundos_transcurridos'];
            }

            $consulta->update($datos);
            $consulta->cita->update(['estado' => 'ATENDIDA']);
        });

        return $this->success(
            (new ConsultaResource($consulta->fresh([
                'medico',
                'especialidad',
                'cita.paciente',
                'cita.signosVitales.registradoPor',
                'examenesFisicos',
                'planManejo',
                'receta.detalles',
            ])))->resolve(),
            'Consulta finalizada correctamente.',
        );
    }
}
