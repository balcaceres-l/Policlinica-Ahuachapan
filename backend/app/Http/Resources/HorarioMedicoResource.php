<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class HorarioMedicoResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id_horario,
            'medico_id' => $this->id_medico,
            'dia_semana' => $this->dia_semana,
            'hora_inicio' => substr((string) $this->hora_inicio, 0, 5),
            'hora_fin' => substr((string) $this->hora_fin, 0, 5),
        ];
    }
}
