<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EspecialidadResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'nombre' => $this->nombre,
            'descripcion' => $this->descripcion ?? '',
            'estado' => $this->estado,
            'fechaRegistro' => $this->created_at?->toDateString(),
            'cantidadMedicos' => (int) ($this->medicos_count ?? 0),
        ];
    }
}
