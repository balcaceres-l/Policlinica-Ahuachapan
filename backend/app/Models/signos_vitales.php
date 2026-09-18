<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class signos_vitales extends Model
{
    use HasUuids;

    protected $table = 'signos_vitales';

    protected $primaryKey = 'id_signos';

    public $incrementing = false;

    protected $keyType = 'string';

    public $timestamps = false;

    protected $fillable = [
        'id_consulta',
        'presion_sistolica',
        'presion_diastolica',
        'frecuencia_cardiaca',
        'frecuencia_respiratoria',
        'temperatura_c',
        'peso_kg',
        'talla_cm',
        'imc',
        'saturacion_oxigeno',
        'observaciones',
        'id_registrado_por',
    ];

    protected $casts = [
        'presion_sistolica' => 'integer',
        'presion_diastolica' => 'integer',
        'frecuencia_cardiaca' => 'integer',
        'frecuencia_respiratoria' => 'integer',
        'saturacion_oxigeno' => 'integer',
        'temperatura_c' => 'float',
        'peso_kg' => 'float',
        'talla_cm' => 'float',
        'imc' => 'float',
        'fecha_registro' => 'datetime',
    ];

    public function consulta(): BelongsTo
    {
        return $this->belongsTo(consulta::class, 'id_consulta', 'id_consulta');
    }

    public function registradoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'id_registrado_por');
    }

    /** IMC = peso / talla². Null si falta cualquiera de los dos. */
    public static function calcularImc(?float $pesoKg, ?float $tallaCm): ?float
    {
        if (! $pesoKg || ! $tallaCm) {
            return null;
        }

        $metros = $tallaCm / 100;

        return round($pesoKg / ($metros ** 2), 1);
    }
}
