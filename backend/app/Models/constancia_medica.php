<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** HU-31 — constancia médica emitida desde una consulta. */
class constancia_medica extends Model
{
    use HasUuids;

    protected $table = 'constancia_medica';

    protected $primaryKey = 'id_constancia';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id_consulta',
        'id_paciente',
        'id_medico',
        'motivo',
        'fecha_emision',
    ];

    protected $casts = [
        'fecha_emision' => 'datetime',
    ];

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
}
