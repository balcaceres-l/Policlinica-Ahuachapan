<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class horario_medico extends Model
{
    use HasUuids;

    protected $table = 'horario_medico';

    protected $primaryKey = 'id_horario';

    public $incrementing = false;

    protected $keyType = 'string';

    public $timestamps = false;

    protected $fillable = [
        'id_medico',
        'dia_semana',
        'hora_inicio',
        'hora_fin',
    ];

    public function medico(): BelongsTo
    {
        return $this->belongsTo(User::class, 'id_medico');
    }
}
