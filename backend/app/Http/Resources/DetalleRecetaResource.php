<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DetalleRecetaResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id_detalle,
            'receta_id' => $this->id_receta,
            'nombre_medicamento' => $this->nombre_medicamento,
            'dosis' => $this->dosis,
            'via_administracion' => $this->via_administracion,
            'frecuencia' => $this->frecuencia,
            'duracion' => $this->duracion,
            'indicaciones' => $this->indicaciones,
        ];
    }
}
