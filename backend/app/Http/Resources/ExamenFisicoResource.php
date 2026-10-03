<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExamenFisicoResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id_examen,
            'consulta_id' => $this->id_consulta,
            'region_anatomica' => $this->region_anatomica,
            'hallazgos' => $this->hallazgos,
        ];
    }
}
