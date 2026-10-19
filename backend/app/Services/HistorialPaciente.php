<?php

namespace App\Services;

use App\Http\Resources\ConstanciaMedicaResource;
use App\Http\Resources\DiagnosticoResource;
use App\Http\Resources\ReferenciaMedicaResource;
use App\Http\Resources\SignosVitalesResource;
use App\Models\cita;
use App\Models\paciente;
use Illuminate\Support\Collection;

/**
 * Historial de citas y atenciones del paciente, del más reciente al más
 * antiguo: signos vitales, consulta, examen físico, diagnósticos, plan,
 * receta y documentos emitidos. Lo usan el expediente (HU-22) y la
 * referencia interna, que lleva el expediente completo (HU-32).
 */
class HistorialPaciente
{
    /** @return Collection<int, array<string, mixed>> */
    public function de(paciente $paciente): Collection
    {
        $citas = $paciente->citas()
            ->with([
                'medico',
                'especialidad',
                'signosVitales.registradoPor',
                'consulta.especialidad',
                'consulta.examenesFisicos',
                'consulta.diagnosticos',
                'consulta.planManejo',
                'consulta.receta.detalles',
                'consulta.constancias.medico',
                'consulta.referencias.medico',
                'consulta.referencias.medicoDestino',
            ])
            ->orderByDesc('fecha')
            ->orderByDesc('hora_inicio')
            ->get();

        return $citas->map(fn (cita $cita) => $this->entrada($paciente, $cita))->values();
    }

    /** @return array<string, mixed> */
    private function entrada(paciente $paciente, cita $cita): array
    {
        $consulta = $cita->consulta;

        $examenes = $consulta?->examenesFisicos?->map(fn ($ef) => [
            'id' => $ef->id_examen,
            'region_anatomica' => $ef->region_anatomica,
            'hallazgos' => $ef->hallazgos,
        ])->values()->all() ?? [];

        $examenTexto = ! empty($examenes)
            ? collect($examenes)
                ->map(fn ($e) => ($e['region_anatomica'] ? $e['region_anatomica'].': ' : '').$e['hallazgos'])
                ->filter()
                ->implode("\n")
            : null;

        $receta = null;
        if ($consulta?->receta) {
            $receta = [
                'id' => $consulta->receta->id_receta,
                'observaciones_generales' => $consulta->receta->observaciones_generales,
                'detalles' => $consulta->receta->detalles->map(fn ($d) => [
                    'id' => $d->id_detalle,
                    'nombre_medicamento' => $d->nombre_medicamento,
                    'dosis' => $d->dosis,
                    'via_administracion' => $d->via_administracion,
                    'frecuencia' => $d->frecuencia,
                    'duracion' => $d->duracion,
                    'indicaciones' => $d->indicaciones,
                ])->values()->all(),
            ];
        }

        return [
            'id' => $consulta?->id_consulta ?? $cita->id_cita,
            'paciente_id' => $paciente->id_paciente,
            'cita_id' => $cita->id_cita,
            'fecha_hora_inicio' => $consulta?->fecha_hora_inicio?->toDateTimeString()
                ?? ($cita->fecha?->toDateString().' '.substr((string) $cita->hora_inicio, 0, 5)),
            'fecha_hora_fin' => $consulta?->fecha_hora_fin?->toDateTimeString(),
            'medico_id' => $cita->id_medico,
            'medicoNombre' => $cita->medico?->nombre_completo ?? 'Dr. Médico',
            'medicoJvpm' => $cita->medico?->jvpm,
            'especialidad_atencion_id' => $consulta?->id_especialidad_atencion ?? $cita->id_especialidad,
            'especialidadNombre' => $consulta?->especialidad?->nombre ?? $cita->especialidad?->nombre,
            'motivo_consulta' => $consulta?->motivo_consulta,
            'notas_adicionales' => $consulta?->notas_adicionales,
            'examen_fisico' => $examenTexto,
            'examenes_fisicos' => $examenes,
            'diagnosticos' => $consulta
                ? DiagnosticoResource::collection($consulta->diagnosticos)->resolve()
                : [],
            'plan_manejo' => $consulta?->planManejo ? [
                'id' => $consulta->planManejo->id_plan,
                'consulta_id' => $consulta->id_consulta,
                'descripcion' => $consulta->planManejo->descripcion,
                'indicaciones' => $consulta->planManejo->indicaciones ?? $consulta->planManejo->descripcion,
            ] : null,
            'receta' => $receta,
            'constancias' => $consulta
                ? ConstanciaMedicaResource::collection($consulta->constancias)->resolve()
                : [],
            'referencias' => $consulta
                ? ReferenciaMedicaResource::collection($consulta->referencias)->resolve()
                : [],
            'signos_vitales' => $cita->signosVitales
                ? (new SignosVitalesResource($cita->signosVitales))->resolve()
                : null,
            'cita_estado' => $cita->estado,
            'tipo_cita' => $cita->tipo_cita,
            'precio' => $consulta?->precio,
            'total' => $consulta?->total,
        ];
    }
}
