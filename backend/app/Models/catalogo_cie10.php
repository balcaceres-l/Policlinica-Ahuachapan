<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class catalogo_cie10 extends Model
{
    protected $table = 'catalogo_cie10';

    protected $primaryKey = 'codigo';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'codigo',
        'descripcion',
        'titulo_oms',
        'version_oms',
    ];
}
