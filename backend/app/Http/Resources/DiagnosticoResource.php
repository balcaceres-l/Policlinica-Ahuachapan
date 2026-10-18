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
            'codigo_cie11' => $this->codigo_cie11,
            'descripcion' => $this->descripcion,
            'uri_foundation' => $this->uri_foundation,
            'uri_linearizacion' => $this->uri_linearizacion,
            'release_cie11' => $this->release_cie11,
            'es_texto_libre' => $this->codigo_cie11 === null,
        ];
    }
}
