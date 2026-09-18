<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SignosVitalesResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id_signos,
            'consulta_id' => $this->id_consulta,
            'presion_sistolica' => $this->presion_sistolica,
            'presion_diastolica' => $this->presion_diastolica,
            'frecuencia_cardiaca' => $this->frecuencia_cardiaca,
            'frecuencia_respiratoria' => $this->frecuencia_respiratoria,
            'temperatura_c' => $this->temperatura_c,
            'peso_kg' => $this->peso_kg,
            'talla_cm' => $this->talla_cm,
            'imc' => $this->imc,
            'saturacion_oxigeno' => $this->saturacion_oxigeno,
            'observaciones' => $this->observaciones,
            'registrado_por_id' => $this->id_registrado_por,
            'registradoPorNombre' => $this->whenLoaded(
                'registradoPor',
                fn () => $this->registradoPor->nombre_completo,
            ),
            'fecha_registro' => $this->fecha_registro?->toDateTimeString(),
        ];
    }
}
