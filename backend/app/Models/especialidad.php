<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Especialidad extends Model
{
    use HasUuids;

    protected $table = 'especialidades';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'nombre',
        'descripcion',
        'estado',
    ];

    public function medicos(): BelongsToMany
    {
        return $this->belongsToMany(User::class)->withTimestamps();
    }
}
