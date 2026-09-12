<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class historial_clinico extends Model
{
    use HasUuids;

    protected $table = 'historial_clinico';

    protected $primaryKey = 'id_historial';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id_historial',
        'id_paciente',
        'historial_familiar',
        'historial_personal',
    ];
}
