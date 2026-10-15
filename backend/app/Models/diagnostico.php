<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class diagnostico extends Model
{
    use HasUuids;

    protected $table = 'diagnostico';

    protected $primaryKey = 'id_diagnostico';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id_consulta',
        'codigo_cie10',
        'descripcion',
    ];

    public function consulta(): BelongsTo
    {
        return $this->belongsTo(consulta::class, 'id_consulta', 'id_consulta');
    }
}
