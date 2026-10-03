<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class examen_fisico extends Model
{
    use HasUuids;

    protected $table = 'examen_fisico';

    protected $primaryKey = 'id_examen';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id_consulta',
        'region_anatomica',
        'hallazgos',
    ];

    public function consulta(): BelongsTo
    {
        return $this->belongsTo(consulta::class, 'id_consulta', 'id_consulta');
    }
}
