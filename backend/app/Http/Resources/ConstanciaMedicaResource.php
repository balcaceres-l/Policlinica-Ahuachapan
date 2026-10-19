<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** HU-31 */
class ConstanciaMedicaResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id_constancia,
            'consulta_id' => $this->id_consulta,
            'paciente_id' => $this->id_paciente,
            'medico_id' => $this->id_medico,
            'medicoNombre' => $this->whenLoaded('medico', fn () => $this->medico?->nombre_completo),
            'motivo' => $this->motivo,
            'fecha_emision' => $this->fecha_emision?->toDateTimeString(),
        ];
    }
}
