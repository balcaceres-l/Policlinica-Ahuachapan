<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RecetaMedicaResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id_receta,
            'consulta_id' => $this->id_consulta,
            'fecha_emision' => $this->fecha_emision?->toDateTimeString(),
            'observaciones_generales' => $this->observaciones_generales,
            'detalles' => DetalleRecetaResource::collection($this->whenLoaded('detalles')),
        ];
    }
}
