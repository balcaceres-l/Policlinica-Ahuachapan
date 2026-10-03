<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BloqueoAgendaResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id_bloqueo,
            'medico_id' => $this->id_medico,
            'medicoNombre' => $this->whenLoaded('medico', fn () => $this->medico->nombre_completo),
            'fecha' => $this->fecha?->toDateString(),
            'tipo_bloqueo' => $this->esParcial() ? 'PARCIAL' : 'COMPLETO',
            'hora_inicio' => $this->horaInicioCorta(),
            'hora_fin' => $this->horaFinCorta(),
            'motivo' => $this->motivo ?? '',
            'creado_por_id' => $this->id_creado_por,
            'creadoPorNombre' => $this->whenLoaded('creadoPor', fn () => $this->creadoPor?->nombre_completo),
            'fecha_creacion' => $this->fecha_creacion?->toDateTimeString(),
            // Solo viene cuando el listado la calculó (ver AgendaService::contarCitasAfectadas).
            'citas_afectadas_total' => $this->when(
                $this->resource->getAttribute('citas_afectadas_total') !== null,
                fn () => $this->resource->getAttribute('citas_afectadas_total'),
            ),
        ];
    }
}
