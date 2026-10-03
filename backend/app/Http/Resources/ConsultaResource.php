<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ConsultaResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id_consulta,
            'cita_id' => $this->id_cita,
            'medico_id' => $this->id_medico,
            'medicoNombre' => $this->whenLoaded('medico', fn () => $this->medico->nombre_completo),
            'medicoTelefono' => $this->whenLoaded('medico', fn () => $this->medico->telefono),
            'medicoCargo' => $this->whenLoaded('medico', fn () => $this->medico->cargo),
            'especialidad_atencion_id' => $this->id_especialidad_atencion,
            'especialidadNombre' => $this->whenLoaded(
                'especialidad',
                fn () => $this->especialidad?->nombre,
            ),
            'fecha_hora_inicio' => $this->fecha_hora_inicio?->toDateTimeString(),
            'fecha_hora_fin' => $this->fecha_hora_fin?->toDateTimeString(),
            'motivo_consulta' => $this->motivo_consulta,
            'notas_adicionales' => $this->notas_adicionales,
            'precio' => $this->precio !== null ? (float) $this->precio : null,
            'total' => $this->total !== null ? (float) $this->total : null,
            'abierta' => $this->estaAbierta(),
            'minutos_transcurridos' => $this->minutosTranscurridos(),
            'segundos_transcurridos' => (int) ($this->segundos_transcurridos ?? 0),
            'en_pausa' => (bool) ($this->en_pausa ?? false),
            'signos_vitales' => new SignosVitalesResource(
                $this->whenLoaded('cita', fn () => $this->cita->signosVitales),
            ),
            'paciente' => $this->whenLoaded(
                'cita',
                fn () => [
                    'id' => $this->cita->id_paciente,
                    'nombre' => $this->cita->paciente?->nombre_completo,
                    'expediente' => $this->cita->paciente?->numero_expediente,
                    'fecha_nacimiento' => $this->cita->paciente?->fecha_nacimiento?->format('Y-m-d'),
                    'dui' => $this->cita->paciente?->dui,
                    'telefono' => $this->cita->paciente?->telefono,
                ],
            ),
            'examenes_fisicos' => ExamenFisicoResource::collection($this->whenLoaded('examenesFisicos')),
            'plan_manejo' => $this->whenLoaded('planManejo', fn () => $this->planManejo ? (new PlanManejoResource($this->planManejo))->resolve() : null),
            'receta' => $this->whenLoaded('receta', fn () => $this->receta ? (new RecetaMedicaResource($this->receta))->resolve() : null),
        ];
    }
}
