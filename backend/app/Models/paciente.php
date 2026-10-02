<?php

namespace App\Models;

use App\Casts\SafeEncrypted;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class paciente extends Model
{
    use HasUuids;

    protected $table = 'paciente';

    protected $primaryKey = 'id_paciente';

    public $incrementing = false;

    protected $keyType = 'string';

    public $timestamps = false;

    protected $fillable = [
        'id_paciente',
        'numero_expediente',
        'nombre_completo',
        'fecha_nacimiento',
        'dui',
        'telefono',
        'direccion',
        'es_menor_edad',
        'estado',
        'id_responsable',
        'id_registrado_por',
        'fecha_registro',
    ];

    protected $casts = [
        'nombre_completo' => SafeEncrypted::class,
        'dui' => SafeEncrypted::class,
        'telefono' => SafeEncrypted::class,
        'direccion' => SafeEncrypted::class,
        'es_menor_edad' => 'boolean',
        'fecha_nacimiento' => 'date',
        'fecha_registro' => 'datetime',
    ];

    /**
     * Filtra solo los pacientes activos (excluyendo fallecidos).
     */
    public function scopeActivos(Builder $query): Builder
    {
        return $query->where('estado', 'ACTIVO');
    }

    public function responsable(): BelongsTo
    {
        return $this->belongsTo(responsable::class, 'id_responsable', 'id_responsable');
    }

    public function citas(): HasMany
    {
        return $this->hasMany(cita::class, 'id_paciente', 'id_paciente');
    }

    public function registradoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'id_registrado_por', 'id');
    }
}
