<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CitaResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id_cita,
            'paciente_id' => $this->id_paciente,
            'pacienteNombre' => $this->whenLoaded('paciente', fn () => $this->paciente->nombre_completo),
            'pacienteExpediente' => $this->whenLoaded('paciente', fn () => $this->paciente->numero_expediente),
            'medico_id' => $this->id_medico,
            'medicoNombre' => $this->whenLoaded('medico', fn () => $this->medico->nombre_completo),
            'especialidad_id' => $this->id_especialidad,
            'especialidadNombre' => $this->whenLoaded('especialidad', fn () => $this->especialidad?->nombre),
            'fecha' => $this->fecha?->toDateString(),
            'hora_inicio' => substr((string) $this->hora_inicio, 0, 5),
            'hora_fin' => substr((string) $this->hora_fin, 0, 5),
            'tipo_cita' => $this->tipo_cita,
            'estado' => $this->estado,
            'motivo_cancelacion' => $this->motivo_cancelacion,
            'hora_llegada' => $this->hora_llegada?->toDateTimeString(),
            'orden_atencion' => $this->orden_atencion,
            'creado_por_id' => $this->id_creado_por,
            'minutos_retraso' => $this->minutosDeRetraso(),
            'retrasada' => $this->minutosDeRetraso() > config('clinica.retraso_paciente_min'),
        ];
    }

    /**
     * Minutos transcurridos desde la hora agendada mientras el paciente no
     * llega. Solo aplica a citas de hoy que siguen esperando (RF-44).
     */
    private function minutosDeRetraso(): int
    {
        if ($this->estado !== 'AGENDADA' || ! $this->fecha?->isToday()) {
            return 0;
        }

        $agendada = $this->fecha->copy()->setTimeFromTimeString((string) $this->hora_inicio);

        return $agendada->isPast() ? (int) $agendada->diffInMinutes(now()) : 0;
    }
}
