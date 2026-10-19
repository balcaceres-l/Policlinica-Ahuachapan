<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UsuarioResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'nombreCompleto' => $this->nombre_completo,
            'usuario' => $this->usuario,
            'rol' => $this->rol,
            'estado' => $this->estado,
            'telefono' => $this->telefono,
            'jvpm' => $this->jvpm,
            'jvpe' => $this->jvpe,
            'fechaRegistro' => $this->created_at?->toDateString(),
            'horarios' => HorarioMedicoResource::collection($this->whenLoaded('horarios')),
        ];
    }
}
