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
            'motivo' => $this->motivo ?? '',
            'creado_por_id' => $this->id_creado_por,
            'fecha_creacion' => $this->fecha_creacion?->toDateTimeString(),
        ];
    }
}
