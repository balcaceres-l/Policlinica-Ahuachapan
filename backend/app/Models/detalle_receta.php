<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class detalle_receta extends Model
{
    use HasUuids;

    protected $table = 'detalle_receta';

    protected $primaryKey = 'id_detalle';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id_receta',
        'nombre_medicamento',
        'dosis',
        'via_administracion',
        'frecuencia',
        'duracion',
        'indicaciones',
    ];

    public function receta(): BelongsTo
    {
        return $this->belongsTo(receta_medica::class, 'id_receta', 'id_receta');
    }
}
