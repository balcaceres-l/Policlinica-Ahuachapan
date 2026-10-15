<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class resultado_laboratorio extends Model
{
    use HasUuids;

    protected $table = 'resultado_laboratorio';

    protected $primaryKey = 'id_resultado';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id_paciente',
        'id_consulta',
        'id_registrado_por',
        'nombre_examen',
        'fecha_examen',
        'resultado_texto',
        'archivo_ruta',
        'archivo_nombre',
        'archivo_mime',
        'archivo_tamano',
    ];

    protected $casts = [
        'fecha_examen' => 'date',
        'archivo_tamano' => 'integer',
    ];

    public function paciente(): BelongsTo
    {
        return $this->belongsTo(paciente::class, 'id_paciente', 'id_paciente');
    }

    public function consulta(): BelongsTo
    {
        return $this->belongsTo(consulta::class, 'id_consulta', 'id_consulta');
    }

    public function registradoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'id_registrado_por');
    }

    public function tieneArchivo(): bool
    {
        return $this->archivo_ruta !== null;
    }
}
