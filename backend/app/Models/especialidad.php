<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Especialidad extends Model
{
    protected $table = 'especialidades';

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
