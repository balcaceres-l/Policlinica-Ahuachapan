<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class consulta extends Model
{
    use HasUuids;

    protected $table = 'consulta';

    protected $primaryKey = 'id_consulta';

    public $incrementing = false;

    protected $keyType = 'string';

    public $timestamps = false;

    protected $fillable = [
        'id_cita',
        'id_medico',
        'id_especialidad_atencion',
        'fecha_hora_inicio',
        'fecha_hora_fin',
        'motivo_consulta',
        'notas_adicionales',
        'precio',
        'total',
    ];

    protected $casts = [
        'fecha_hora_inicio' => 'datetime',
        'fecha_hora_fin' => 'datetime',
        'precio' => 'float',
        'total' => 'float',
    ];

    public function cita(): BelongsTo
    {
        return $this->belongsTo(cita::class, 'id_cita', 'id_cita');
    }

    public function medico(): BelongsTo
    {
        return $this->belongsTo(User::class, 'id_medico');
    }

    public function especialidad(): BelongsTo
    {
        return $this->belongsTo(especialidad::class, 'id_especialidad_atencion');
    }

    public function examenesFisicos(): HasMany
    {
        return $this->hasMany(examen_fisico::class, 'id_consulta', 'id_consulta');
    }

    public function planManejo(): HasOne
    {
        return $this->hasOne(plan_manejo::class, 'id_consulta', 'id_consulta');
    }

    public function receta(): HasOne
    {
        return $this->hasOne(receta_medica::class, 'id_consulta', 'id_consulta');
    }

    public function estaAbierta(): bool
    {
        return $this->fecha_hora_fin === null;
    }

    /** Minutos transcurridos, para la alerta de consulta excedida (HU-40). */
    public function minutosTranscurridos(): int
    {
        $fin = $this->fecha_hora_fin ?? now();

        return (int) $this->fecha_hora_inicio->diffInMinutes($fin);
    }
}
