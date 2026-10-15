<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DiagnosticoResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id_diagnostico,
            'consulta_id' => $this->id_consulta,
            'codigo_cie10' => $this->codigo_cie10,
            'descripcion' => $this->descripcion,
            'es_texto_libre' => $this->codigo_cie10 === null,
        ];
    }
}
