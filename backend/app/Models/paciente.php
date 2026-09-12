<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

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
        'id_responsable',
        'id_registrado_por',
        'fecha_registro',
    ];

    protected $casts = [
        'es_menor_edad' => 'boolean',
        'fecha_nacimiento' => 'date',
        'fecha_registro' => 'datetime',
    ];
}
