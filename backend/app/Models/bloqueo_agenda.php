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
        'hora_inicio',
        'hora_fin',
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

    public function creadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'id_creado_por');
    }

    /** Sin horas, el bloqueo cubre el día completo. */
    public function esParcial(): bool
    {
        return $this->hora_inicio !== null && $this->hora_fin !== null;
    }

    /** SQLite devuelve 'H:i' y MariaDB 'H:i:s'; se trabaja siempre en 'H:i'. */
    public function horaInicioCorta(): ?string
    {
        return $this->hora_inicio === null ? null : substr((string) $this->hora_inicio, 0, 5);
    }

    public function horaFinCorta(): ?string
    {
        return $this->hora_fin === null ? null : substr((string) $this->hora_fin, 0, 5);
    }

    /** Si el rango [inicio, fin) toca el bloqueo; un bloqueo de día completo toca todo. */
    public function solapaCon(string $inicio, string $fin): bool
    {
        if (! $this->esParcial()) {
            return true;
        }

        return $inicio < $this->horaFinCorta() && $fin > $this->horaInicioCorta();
    }
}
