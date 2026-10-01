<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Controllers\Controller;
use App\Http\Resources\SignosVitalesResource;
use App\Models\cita;
use App\Models\signos_vitales;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class SignosVitalesController extends Controller
{
    use RespondsWithJson;

    /**
     * Rangos amplios a propósito: solo atajan errores de digitación, no
     * diagnostican. Un valor clínicamente raro pero real debe poder guardarse.
     *
     * @var array<string, array<int, mixed>>
     */
    private const REGLAS = [
        'presion_sistolica' => ['nullable', 'integer', 'between:50,300'],
        'presion_diastolica' => ['nullable', 'integer', 'between:30,200'],
        'frecuencia_cardiaca' => ['nullable', 'integer', 'between:20,250'],
        'frecuencia_respiratoria' => ['nullable', 'integer', 'between:5,80'],
        'temperatura_c' => ['nullable', 'numeric', 'between:30,45'],
        'peso_kg' => ['nullable', 'numeric', 'between:0.5,400'],
        'talla_cm' => ['nullable', 'numeric', 'between:20,250'],
        'saturacion_oxigeno' => ['nullable', 'integer', 'between:50,100'],
        'observaciones' => ['nullable', 'string', 'max:1000'],
    ];

    public function show(Request $request, cita $cita): JsonResponse
    {
        if (! $this->puedeVer($request, $cita)) {
            return $this->failure('No tienes acceso a esa cita.', 403);
        }

        $signos = signos_vitales::with('registradoPor')
            ->where('id_cita', $cita->id_cita)
            ->first();

        if (! $signos) {
            return $this->success(null, 'La cita aún no tiene signos vitales.');
        }

        return $this->success((new SignosVitalesResource($signos))->resolve());
    }

    /**
     * Guarda o corrige los signos de la cita. Recepción los toma en el triaje
     * y el médico puede completarlos o corregirlos al atender, por eso ambos
     * roles escriben sobre el mismo registro.
     */
    public function store(Request $request, cita $cita): JsonResponse
    {
        if (! $this->puedeVer($request, $cita)) {
            return $this->failure('No tienes acceso a esa cita.', 403);
        }

        if (in_array($cita->estado, ['CANCELADA', 'NO_ASISTIO'], true)) {
            return $this->failure('La cita no está en condiciones de registrar signos.', 422);
        }

        $validado = $request->validate(self::REGLAS);

        // `lt:` exigiría que la sistólica venga siempre; se compara aparte
        // porque ambos campos son opcionales por separado.
        $sistolica = $validado['presion_sistolica'] ?? null;
        $diastolica = $validado['presion_diastolica'] ?? null;

        if ($sistolica !== null && $diastolica !== null && $diastolica >= $sistolica) {
            throw ValidationException::withMessages([
                'presion_diastolica' => 'La presión diastólica debe ser menor que la sistólica.',
            ]);
        }

        $validado['imc'] = signos_vitales::calcularImc(
            isset($validado['peso_kg']) ? (float) $validado['peso_kg'] : null,
            isset($validado['talla_cm']) ? (float) $validado['talla_cm'] : null,
        );
        $validado['id_registrado_por'] = $request->user()->id;

        $signos = signos_vitales::updateOrCreate(
            ['id_cita' => $cita->id_cita],
            $validado,
        );

        return $this->success(
            (new SignosVitalesResource($signos->refresh()->load('registradoPor')))->resolve(),
            'Signos vitales guardados correctamente.',
            $signos->wasRecentlyCreated ? 201 : 200,
        );
    }

    /** El médico solo toca su propia agenda; recepción y administración, cualquiera. */
    private function puedeVer(Request $request, cita $cita): bool
    {
        $usuario = $request->user();

        return $usuario->rol !== 'MEDICO' || $usuario->id === $cita->id_medico;
    }
}
