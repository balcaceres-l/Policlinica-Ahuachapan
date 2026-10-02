<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PacienteResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $tipoDoc = null;
        if ($this->dui) {
            $tipoDoc = preg_match('/^\d{8}-\d$/', (string) $this->dui) ? 'DUI' : 'PASAPORTE';
        }

        $responsableTipoDoc = null;
        if ($this->responsable?->dui) {
            $responsableTipoDoc = preg_match('/^\d{8}-\d$/', (string) $this->responsable->dui) ? 'DUI' : 'PASAPORTE';
        }

        $fechaRegistro = null;
        if ($this->fecha_registro) {
            $fechaRegistro = is_string($this->fecha_registro)
                ? substr($this->fecha_registro, 0, 10)
                : $this->fecha_registro->toDateString();
        }

        return [
            'id' => $this->id_paciente,
            'id_paciente' => $this->id_paciente,
            'numero_expediente' => $this->numero_expediente,
            'numeroExpediente' => $this->numero_expediente,
            'nombre_completo' => $this->nombre_completo,
            'nombreCompleto' => $this->nombre_completo,
            'fecha_nacimiento' => is_string($this->fecha_nacimiento) ? substr($this->fecha_nacimiento, 0, 10) : $this->fecha_nacimiento?->toDateString(),
            'fechaNacimiento' => is_string($this->fecha_nacimiento) ? substr($this->fecha_nacimiento, 0, 10) : $this->fecha_nacimiento?->toDateString(),
            'tipo_documento' => $tipoDoc,
            'tipoDocumento' => $tipoDoc,
            'dui' => $this->dui,
            'telefono' => $this->telefono,
            'direccion' => $this->direccion,
            'es_menor_edad' => (bool) $this->es_menor_edad,
            'esMenorEdad' => (bool) $this->es_menor_edad,
            'estado' => $this->estado ?? 'ACTIVO',
            'id_responsable' => $this->id_responsable,
            'responsable_nombre' => $this->responsable?->nombre_completo,
            'responsableNombre' => $this->responsable?->nombre_completo,
            'responsable_tipo_documento' => $responsableTipoDoc,
            'responsableTipoDocumento' => $responsableTipoDoc,
            'responsable_documento' => $this->responsable?->dui,
            'responsableDocumento' => $this->responsable?->dui,
            'responsable_telefono' => $this->responsable?->telefono,
            'responsableTelefono' => $this->responsable?->telefono,
            'responsable_parentesco' => $this->responsable?->parentesco,
            'responsableParentesco' => $this->responsable?->parentesco,
            'fecha_registro' => $fechaRegistro,
            'fechaRegistro' => $fechaRegistro,
        ];
    }
}
