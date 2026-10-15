<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ResultadoLaboratorioResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id_resultado,
            'paciente_id' => $this->id_paciente,
            'pacienteNombre' => $this->whenLoaded('paciente', fn () => $this->paciente?->nombre_completo),
            'pacienteExpediente' => $this->whenLoaded('paciente', fn () => $this->paciente?->numero_expediente),
            'consulta_id' => $this->id_consulta,
            'nombre_examen' => $this->nombre_examen,
            'fecha_examen' => $this->fecha_examen?->toDateString(),
            'resultado_texto' => $this->resultado_texto,
            // La ruta en disco nunca sale: el archivo se pide por su endpoint.
            'archivo' => $this->tieneArchivo() ? [
                'nombre' => $this->archivo_nombre,
                'mime' => $this->archivo_mime,
                'tamano' => $this->archivo_tamano,
            ] : null,
            'registrado_por_id' => $this->id_registrado_por,
            'registradoPorNombre' => $this->whenLoaded('registradoPor', fn () => $this->registradoPor?->nombre_completo),
            'fecha_registro' => $this->created_at?->toDateTimeString(),
        ];
    }
}
