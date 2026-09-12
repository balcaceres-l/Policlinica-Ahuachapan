<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class responsable extends Model
{
    use HasUuids;

    protected $table = 'responsable';

    protected $primaryKey = 'id_responsable';

    public $incrementing = false;

    protected $keyType = 'string';

    public $timestamps = false;

    protected $fillable = [
        'id_responsable',
        'nombre_completo',
        'dui',
        'telefono',
        'parentesco',
    ];
}
