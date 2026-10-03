<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class receta_medica extends Model
{
    use HasUuids;

    protected $table = 'receta_medica';

    protected $primaryKey = 'id_receta';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id_consulta',
        'fecha_emision',
        'observaciones_generales',
    ];

    protected $casts = [
        'fecha_emision' => 'datetime',
    ];

    public function consulta(): BelongsTo
    {
        return $this->belongsTo(consulta::class, 'id_consulta', 'id_consulta');
    }

    public function detalles(): HasMany
    {
        return $this->hasMany(detalle_receta::class, 'id_receta', 'id_receta');
    }
}
