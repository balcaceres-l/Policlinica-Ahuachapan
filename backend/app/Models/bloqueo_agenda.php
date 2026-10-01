<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class bloqueo_agenda extends Model
{
    use HasUuids;

    protected $table = 'bloqueo_agenda';

    protected $primaryKey = 'id_bloqueo';

    public $incrementing = false;

    protected $keyType = 'string';

    public $timestamps = false;

    protected $fillable = [
        'id_medico',
        'fecha',
        'motivo',
        'id_creado_por',
    ];

    protected $casts = [
        'fecha' => 'date',
        'fecha_creacion' => 'datetime',
    ];

    public function medico(): BelongsTo
    {
        return $this->belongsTo(User::class, 'id_medico');
    }
}
