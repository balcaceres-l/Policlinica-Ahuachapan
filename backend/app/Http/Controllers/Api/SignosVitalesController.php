<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Controllers\Controller;
use App\Http\Resources\SignosVitalesResource;
use App\Models\consulta;
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

    public function show(Request $request, consulta $consulta): JsonResponse
    {
        if ($consulta->id_medico !== $request->user()->id) {
            return $this->failure('Esa consulta no es tuya.', 403);
        }

        $signos = signos_vitales::with('registradoPor')
            ->where('id_consulta', $consulta->id_consulta)
            ->first();

        if (! $signos) {
            return $this->success(null, 'La consulta aún no tiene signos vitales.');
        }

        return $this->success((new SignosVitalesResource($signos))->resolve());
    }

    /**
     * Guarda o corrige los signos de la consulta. Es una sola toma por
     * consulta: reenviar el formulario actualiza, no duplica.
     */
    public function store(Request $request, consulta $consulta): JsonResponse
    {
        if ($consulta->id_medico !== $request->user()->id) {
            return $this->failure('Esa consulta no es tuya.', 403);
        }

        if (! $consulta->estaAbierta()) {
            return $this->failure('La consulta ya fue cerrada.', 422);
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
            ['id_consulta' => $consulta->id_consulta],
            $validado,
        );

        return $this->success(
            (new SignosVitalesResource($signos->refresh()->load('registradoPor')))->resolve(),
            'Signos vitales guardados correctamente.',
            $signos->wasRecentlyCreated ? 201 : 200,
        );
    }
}
