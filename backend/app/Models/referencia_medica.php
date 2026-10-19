<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** HU-32 — referencia médica interna (otro médico de la policlínica) o externa. */
class referencia_medica extends Model
{
    use HasUuids;

    public const TIPOS = ['INTERNA', 'EXTERNA'];

    protected $table = 'referencia_medica';

    protected $primaryKey = 'id_referencia';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id_consulta',
        'id_paciente',
        'id_medico',
        'tipo',
        'id_medico_destino',
        'destino',
        'especialidad_destino',
        'motivo',
        'resumen_clinico',
        'fecha_emision',
    ];

    protected $casts = [
        'fecha_emision' => 'datetime',
    ];

    public function esInterna(): bool
    {
        return $this->tipo === 'INTERNA';
    }

    public function consulta(): BelongsTo
    {
        return $this->belongsTo(consulta::class, 'id_consulta', 'id_consulta');
    }

    public function paciente(): BelongsTo
    {
        return $this->belongsTo(paciente::class, 'id_paciente', 'id_paciente');
    }

    public function medico(): BelongsTo
    {
        return $this->belongsTo(User::class, 'id_medico');
    }

    public function medicoDestino(): BelongsTo
    {
        return $this->belongsTo(User::class, 'id_medico_destino');
    }
}
