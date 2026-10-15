<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Controllers\Controller;
use App\Models\catalogo_cie10;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CatalogoCie10Controller extends Controller
{
    use RespondsWithJson;

    private const LIMITE = 25;

    /** Palabras que no distinguen un diagnóstico de otro. */
    private const PALABRAS_VACIAS = [
        'con', 'sin', 'del', 'las', 'los', 'una', 'uno', 'unos', 'unas', 'por', 'para', 'que', 'desde',
        'hace', 'dia', 'dias', 'día', 'días', 'semana', 'semanas', 'mes', 'meses', 'muy', 'mas', 'más',
        'paciente', 'presenta', 'refiere', 'tiene', 'como', 'pero', 'the',
    ];

    /**
     * HU-44 — busca códigos CIE-10 a partir de lo que el médico escribió
     * (síntomas o diagnóstico) o directamente por código. El médico escribe
     * frases, no términos del catálogo: basta con que coincida una palabra y
     * primero salen las filas que coinciden con más.
     */
    public function index(Request $request): JsonResponse
    {
        $validado = $request->validate([
            'buscar' => ['required', 'string', 'min:2', 'max:100'],
        ]);

        if (! catalogo_cie10::query()->exists()) {
            return $this->failure(
                'El catálogo CIE-10 aún no está cargado. Puedes registrar el diagnóstico como texto libre.',
                503,
            );
        }

        $palabras = $this->palabrasUtiles($validado['buscar']);
        if ($palabras === []) {
            return $this->success([]);
        }

        $puntaje = [];
        $valores = [];
        foreach ($palabras as $palabra) {
            $termino = addcslashes($palabra, '%_\\');
            // El título oficial de la OMS (inglés) también cuenta: cubre los códigos
            // sin traducción y a quien busque con el término en inglés.
            $puntaje[] = '(CASE WHEN descripcion LIKE ? OR titulo_oms LIKE ? THEN 1 ELSE 0 END)';
            $puntaje[] = '(CASE WHEN codigo LIKE ? THEN 2 ELSE 0 END)';
            array_push($valores, "%{$termino}%", "%{$termino}%", "{$termino}%");
        }

        // "tipo 2", "grado 3"...: el número suelto no se busca, pero la frase
        // completa desempata ("diabetes tipo 2" pone primero E11 y no E10).
        foreach ($this->frasesConNumero($validado['buscar']) as $frase) {
            $puntaje[] = '(CASE WHEN descripcion LIKE ? THEN 3 ELSE 0 END)';
            $valores[] = '%'.addcslashes($frase, '%_\\').'%';
        }

        $resultados = catalogo_cie10::query()
            ->where(function (Builder $query) use ($palabras) {
                foreach ($palabras as $palabra) {
                    $termino = addcslashes($palabra, '%_\\');
                    $query->orWhere('descripcion', 'like', "%{$termino}%")
                        ->orWhere('titulo_oms', 'like', "%{$termino}%")
                        ->orWhere('codigo', 'like', "{$termino}%");
                }
            })
            ->orderByRaw(implode(' + ', $puntaje).' DESC', $valores)
            ->orderBy('codigo')
            ->limit(self::LIMITE)
            ->get(['codigo', 'descripcion']);

        return $this->success($resultados->map(fn (catalogo_cie10 $fila) => [
            'codigo' => $fila->codigo,
            'descripcion' => $fila->descripcion,
        ])->all());
    }

    /**
     * Separa el texto en palabras y descarta las que no aportan a la búsqueda:
     * conectores, números sueltos y palabras de dos letras o menos.
     *
     * @return list<string>
     */
    private function palabrasUtiles(string $texto): array
    {
        $palabras = preg_split('/[^\pL\pN.]+/u', mb_strtolower(trim($texto)), -1, PREG_SPLIT_NO_EMPTY);

        $utiles = array_filter($palabras, function (string $palabra) {
            $palabra = trim($palabra, '.');

            return mb_strlen($palabra) >= 3
                && ! in_array($palabra, self::PALABRAS_VACIAS, true)
                && ! ctype_digit($palabra);
        });

        return array_values(array_unique(array_map(fn (string $p) => trim($p, '.'), $utiles)));
    }

    /**
     * Pares "palabra número" tal como los escribió el médico.
     *
     * @return list<string>
     */
    private function frasesConNumero(string $texto): array
    {
        preg_match_all('/(\pL{3,})\s+(\d{1,2})\b/u', mb_strtolower($texto), $coincidencias, PREG_SET_ORDER);

        return array_map(fn (array $m) => $m[1].' '.$m[2], $coincidencias);
    }
}
