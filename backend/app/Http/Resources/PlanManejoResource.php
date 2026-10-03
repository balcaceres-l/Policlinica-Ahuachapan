<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PlanManejoResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id_plan,
            'consulta_id' => $this->id_consulta,
            'descripcion' => $this->descripcion,
            'indicaciones' => $this->indicaciones,
        ];
    }
}
