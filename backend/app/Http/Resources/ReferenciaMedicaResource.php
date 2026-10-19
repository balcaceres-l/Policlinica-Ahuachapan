<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** HU-32 */
class ReferenciaMedicaResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id_referencia,
            'consulta_id' => $this->id_consulta,
            'paciente_id' => $this->id_paciente,
            'medico_id' => $this->id_medico,
            'medicoNombre' => $this->whenLoaded('medico', fn () => $this->medico?->nombre_completo),
            'tipo' => $this->tipo,
            'medico_destino_id' => $this->id_medico_destino,
            'medicoDestinoNombre' => $this->whenLoaded('medicoDestino', fn () => $this->medicoDestino?->nombre_completo),
            'destino' => $this->destino,
            'especialidad_destino' => $this->especialidad_destino,
            'motivo' => $this->motivo,
            'resumen_clinico' => $this->resumen_clinico,
            'fecha_emision' => $this->fecha_emision?->toDateTimeString(),
        ];
    }
}
