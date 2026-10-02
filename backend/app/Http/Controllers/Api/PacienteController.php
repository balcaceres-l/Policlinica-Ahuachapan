<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Controllers\Controller;
use App\Http\Resources\PacienteResource;
use App\Models\paciente;
use App\Models\responsable;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class PacienteController extends Controller
{
    use RespondsWithJson;

    /**
     * Listado de pacientes con filtros de estado y búsqueda por texto.
     * Por defecto se muestran solo los pacientes activos.
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'estado' => ['nullable', Rule::in(['ACTIVO', 'FALLECIDO', 'TODOS'])],
            'categoria' => ['nullable', Rule::in(['TODOS', 'ADULTO', 'MENOR'])],
            'buscar' => ['nullable', 'string', 'max:100'],
        ]);

        $estadoFiltro = $validated['estado'] ?? 'ACTIVO';
        $categoriaFiltro = $validated['categoria'] ?? 'TODOS';
        $buscar = $validated['buscar'] ?? null;

        $query = paciente::with('responsable');

        // Por defecto muestra solo ACTIVO, a menos que sea FALLECIDO o TODOS
        if ($estadoFiltro !== 'TODOS') {
            $query->where('estado', $estadoFiltro ?: 'ACTIVO');
        }

        if ($categoriaFiltro === 'ADULTO') {
            $query->where('es_menor_edad', false);
        } elseif ($categoriaFiltro === 'MENOR') {
            $query->where('es_menor_edad', true);
        }

        $pacientes = $query->orderByDesc('fecha_registro')->get();

        // Búsqueda en memoria sobre los atributos ya descifrados
        if (! empty($buscar)) {
            $termino = mb_strtolower(trim($buscar));
            $pacientes = $pacientes->filter(function (paciente $p) use ($termino) {
                return str_contains(mb_strtolower((string) $p->numero_expediente), $termino)
                    || str_contains(mb_strtolower((string) $p->nombre_completo), $termino)
                    || str_contains(mb_strtolower((string) $p->dui), $termino)
                    || ($p->responsable && (
                        str_contains(mb_strtolower((string) $p->responsable->nombre_completo), $termino)
                        || str_contains(mb_strtolower((string) $p->responsable->dui), $termino)
                    ));
            })->values();
        }

        return $this->success(PacienteResource::collection($pacientes)->resolve());
    }

    /**
     * Registro de nuevo paciente. Exclusivo para RECEPCIONISTA y MEDICO.
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'nombre_completo' => ['required', 'string', 'min:3', 'max:150'],
            'fecha_nacimiento' => ['required', 'date', 'before_or_equal:today'],
            'direccion' => ['nullable', 'string', 'max:250'],
        ]);

        $fechaNac = Carbon::parse($request->fecha_nacimiento);
        $esMenor = $fechaNac->age < 18;

        return DB::transaction(function () use ($request, $esMenor) {
            $idResponsable = null;
            $docPaciente = null;
            $telPaciente = null;

            if ($esMenor) {
                // Validación estricta para menor de edad
                $request->validate([
                    'responsable_nombre' => ['required', 'string', 'min:3', 'max:150'],
                    'responsable_documento' => ['required', 'string', 'min:6', 'max:15'],
                    'responsable_telefono' => ['required', 'string', 'max:15'],
                    'responsable_parentesco' => ['required', 'string', 'max:50'],
                ]);

                $respDoc = trim((string) $request->responsable_documento);
                $esDui = preg_match('/^\d{8}-\d$/', $respDoc);
                $esPasaporte = preg_match('/^[A-Za-z0-9]{6,15}$/', $respDoc);

                if (! $esDui && ! $esPasaporte) {
                    throw ValidationException::withMessages([
                        'responsable_documento' => ['El documento del responsable debe ser un DUI válido (00000000-0) o Pasaporte (6 a 15 caracteres alfanuméricos).'],
                    ]);
                }

                // Buscar o registrar responsable (reutilización si ya existe por documento)
                $responsable = responsable::all()->first(fn ($r) => $r->dui === $respDoc);

                if (! $responsable) {
                    $responsable = responsable::create([
                        'nombre_completo' => trim((string) $request->responsable_nombre),
                        'dui' => $respDoc,
                        'telefono' => trim((string) $request->responsable_telefono),
                        'parentesco' => trim((string) $request->responsable_parentesco),
                    ]);
                } else {
                    $responsable->update([
                        'nombre_completo' => trim((string) $request->responsable_nombre),
                        'telefono' => trim((string) $request->responsable_telefono),
                        'parentesco' => trim((string) $request->responsable_parentesco),
                    ]);
                }

                $idResponsable = $responsable->id_responsable;
            } else {
                // Validación para mayor de edad: documento obligatorio (DUI o Pasaporte)
                $request->validate([
                    'dui' => ['required', 'string', 'min:6', 'max:15'],
                    'telefono' => ['nullable', 'string', 'max:15'],
                ]);

                $docPaciente = trim((string) $request->dui);
                $esDui = preg_match('/^\d{8}-\d$/', $docPaciente);
                $esPasaporte = preg_match('/^[A-Za-z0-9]{6,15}$/', $docPaciente);

                if (! $esDui && ! $esPasaporte) {
                    throw ValidationException::withMessages([
                        'dui' => ['El documento de identidad debe ser un DUI válido (00000000-0) o Pasaporte (6 a 15 caracteres alfanuméricos).'],
                    ]);
                }

                // Verificar unicidad del documento en pacientes
                $duplicado = paciente::all()->first(fn ($p) => $p->dui === $docPaciente);
                if ($duplicado) {
                    throw ValidationException::withMessages([
                        'dui' => ['Ya existe un paciente registrado con este documento de identidad.'],
                    ]);
                }

                $telPaciente = $request->filled('telefono') ? trim((string) $request->telefono) : null;
            }

            // Generar número de expediente correlativo XX00-YYYY
            $nombreLimpio = trim((string) $request->nombre_completo);
            $palabras = preg_split('/\s+/', $nombreLimpio);
            $ini1 = mb_strtoupper(mb_substr($palabras[0] ?? 'X', 0, 1));
            $ini2 = mb_strtoupper(mb_substr($palabras[1] ?? ($palabras[0][1] ?? 'X'), 0, 1));
            $prefijo = "{$ini1}{$ini2}";
            $anio = now()->year;

            $correlativo = paciente::where('numero_expediente', 'LIKE', "{$prefijo}%-{$anio}")->count() + 1;
            $expediente = sprintf('%s%02d-%d', $prefijo, $correlativo, $anio);
            while (paciente::where('numero_expediente', $expediente)->exists()) {
                $correlativo++;
                $expediente = sprintf('%s%02d-%d', $prefijo, $correlativo, $anio);
            }

            $paciente = paciente::create([
                'numero_expediente' => $expediente,
                'nombre_completo' => $nombreLimpio,
                'fecha_nacimiento' => $request->fecha_nacimiento,
                'dui' => $docPaciente,
                'telefono' => $telPaciente,
                'direccion' => $request->filled('direccion') ? trim((string) $request->direccion) : null,
                'es_menor_edad' => $esMenor,
                'estado' => 'ACTIVO',
                'id_responsable' => $idResponsable,
                'id_registrado_por' => $request->user()->id,
                'fecha_registro' => now(),
            ]);

            return $this->success(
                (new PacienteResource($paciente->load('responsable')))->resolve(),
                'Paciente registrado correctamente.',
                201
            );
        });
    }

    /**
     * Consulta detallada de un paciente.
     */
    public function show(paciente $paciente): JsonResponse
    {
        return $this->success(
            (new PacienteResource($paciente->load('responsable')))->resolve()
        );
    }

    /**
     * Soft delete: marca al paciente como FALLECIDO en lugar de borrar la fila.
     * Exclusivo para RECEPCIONISTA y MEDICO.
     */
    public function destroy(paciente $paciente): JsonResponse
    {
        $paciente->update(['estado' => 'FALLECIDO']);

        return $this->success(
            (new PacienteResource($paciente->refresh()->load('responsable')))->resolve(),
            'Paciente marcado como fallecido correctamente.'
        );
    }
}
