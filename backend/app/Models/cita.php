<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class cita extends Model
{
    use HasUuids;

    protected $table = 'cita';

    protected $primaryKey = 'id_cita';

    public $incrementing = false;

    protected $keyType = 'string';

    public $timestamps = false;

    protected $fillable = [
        'id_paciente',
        'id_medico',
        'id_especialidad',
        'fecha',
        'hora_inicio',
        'hora_fin',
        'tipo_cita',
        'estado',
        'motivo_cancelacion',
        'hora_llegada',
        'orden_atencion',
        'id_creado_por',
    ];

    protected $casts = [
        'fecha' => 'date',
        'hora_llegada' => 'datetime',
        'orden_atencion' => 'integer',
        'fecha_creacion' => 'datetime',
        'fecha_actualizacion' => 'datetime',
    ];

    /** Estados que siguen ocupando un bloque en la agenda. */
    public const ESTADOS_VIGENTES = ['AGENDADA', 'EN_ESPERA', 'EN_ATENCION', 'ATENDIDA'];

    /** Tipos que pueden solaparse a propósito con una cita regular. */
    public const TIPOS_SIN_VALIDACION = ['EMERGENCIA', 'SOBRECUPO'];

    public function paciente(): BelongsTo
    {
        return $this->belongsTo(paciente::class, 'id_paciente', 'id_paciente');
    }

    public function medico(): BelongsTo
    {
        return $this->belongsTo(User::class, 'id_medico');
    }

    public function especialidad(): BelongsTo
    {
        return $this->belongsTo(especialidad::class, 'id_especialidad');
    }
}
