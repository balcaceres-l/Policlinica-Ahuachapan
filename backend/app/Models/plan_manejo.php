<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class plan_manejo extends Model
{
    use HasUuids;

    protected $table = 'plan_manejo';

    protected $primaryKey = 'id_plan';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id_consulta',
        'descripcion',
        'indicaciones',
    ];

    public function consulta(): BelongsTo
    {
        return $this->belongsTo(consulta::class, 'id_consulta', 'id_consulta');
    }
}
