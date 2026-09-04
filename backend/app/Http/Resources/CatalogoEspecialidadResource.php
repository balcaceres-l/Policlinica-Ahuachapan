<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;

class CatalogoEspecialidadResource extends EspecialidadResource
{
    public function toArray(Request $request): array
    {
        return [
            ...parent::toArray($request),
            'medicos' => UsuarioResource::collection($this->whenLoaded('medicos')),
        ];
    }
}
