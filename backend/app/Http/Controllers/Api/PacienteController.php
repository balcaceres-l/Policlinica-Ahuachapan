<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Controllers\Controller;
use App\Http\Resources\PacienteResource;
use App\Models\paciente;
use App\Models\responsable;
use App\Services\HistorialPaciente;
use Carbon\Carbon;
use Illuminate\Database\UniqueConstraintViolationException;
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
            'pendientes' => ['nullable', 'boolean'],
        ]);

        paciente::actualizarMayoriaDeEdad();

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

        // Por completar: lo registró un médico en una consulta inmediata, o se registró de
        // menor, ya cumplió 18 años y falta su documento propio.
        if ($request->boolean('pendientes')) {
            $query->where(function ($q) {
                $q->where('datos_pendientes', true)
                    ->orWhere(fn ($q2) => $q2->where('estado', 'ACTIVO')
                        ->where('es_menor_edad', false)
                        ->whereNull('dui'));
            });
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
            'registro_rapido' => ['nullable', 'boolean'],
        ]);

        $fechaNac = Carbon::parse($request->fecha_nacimiento);
        $esMenor = $fechaNac->age < 18;
        // Emergencia: no se toman los datos uno por uno. Basta el nombre y la fecha de nacimiento;
        // el registro queda pendiente y recepción lo completa después.
        $rapido = $request->boolean('registro_rapido');

        return DB::transaction(function () use ($request, $esMenor, $rapido) {
            $idResponsable = null;
            $docPaciente = null;
            $telPaciente = null;

            if ($rapido) {
                // Sin documento, teléfono ni responsable: quedan por completar.
            } elseif ($esMenor) {
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

                // Un menor puede tener documento propio (p. ej. pasaporte): es opcional.
                if ($request->filled('dui')) {
                    $request->validate(['dui' => ['string', 'min:6', 'max:15']]);
                    $docPaciente = $this->documentoDelPaciente((string) $request->dui);
                }
            } else {
                // Validación para mayor de edad: documento obligatorio (DUI o Pasaporte)
                $request->validate([
                    'dui' => ['required', 'string', 'min:6', 'max:15'],
                    'telefono' => ['nullable', 'string', 'max:15'],
                ]);

                $docPaciente = $this->documentoDelPaciente((string) $request->dui);

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

            // Dos registros simultáneos pueden calcular el mismo correlativo. La
            // columna es única: si otro lo ganó, se toma el siguiente (HU-42).
            $paciente = null;
            for ($intento = 1; $paciente === null; $intento++) {
                $expediente = sprintf('%s%02d-%d', $prefijo, $correlativo, $anio);
                while (paciente::where('numero_expediente', $expediente)->exists()) {
                    $correlativo++;
                    $expediente = sprintf('%s%02d-%d', $prefijo, $correlativo, $anio);
                }

                try {
                    // El punto de guardado evita que el choque deje inservible
                    // la transacción en motores que la abortan al fallar.
                    $paciente = DB::transaction(fn () => paciente::create([
                        'numero_expediente' => $expediente,
                        'nombre_completo' => $nombreLimpio,
                        'fecha_nacimiento' => $request->fecha_nacimiento,
                        'dui' => $docPaciente,
                        'telefono' => $telPaciente,
                        'direccion' => $request->filled('direccion') ? trim((string) $request->direccion) : null,
                        'es_menor_edad' => $esMenor,
                        'estado' => 'ACTIVO',
                        // Consulta inmediata: lo registra el médico y la recepcionista lo completa.
                        'datos_pendientes' => $rapido || $request->user()->rol === 'MEDICO',
                        'id_responsable' => $idResponsable,
                        'id_registrado_por' => $request->user()->id,
                        'fecha_registro' => now(),
                    ]));
                } catch (UniqueConstraintViolationException $e) {
                    if ($intento >= 5) {
                        throw $e;
                    }
                    $correlativo++;
                }
            }

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
        paciente::actualizarMayoriaDeEdad();
        $paciente->refresh();

        return $this->success(
            (new PacienteResource($paciente->load('responsable')))->resolve()
        );
    }

    /**
     * Actualiza la información del paciente. Exclusivo para RECEPCIONISTA y MEDICO.
     * DUI/Pasaporte y Fecha de Nacimiento no se editan; la única excepción es agregar el
     * documento a quien aún no tiene uno (un menor con pasaporte, o quien ya cumplió 18).
     */
    public function update(Request $request, paciente $paciente): JsonResponse
    {
        $request->validate([
            'nombre_completo' => ['required', 'string', 'min:3', 'max:150'],
            'direccion' => ['nullable', 'string', 'max:250'],
        ]);

        // Si cumplió 18 desde que se registró, se edita ya como adulto.
        paciente::actualizarMayoriaDeEdad();
        $paciente->refresh();

        return DB::transaction(function () use ($request, $paciente) {
            $nombreLimpio = trim((string) $request->nombre_completo);
            $direccionLimpia = $request->filled('direccion') ? trim((string) $request->direccion) : null;

            // Quien no tiene documento propio puede agregarlo, una sola vez: un menor con
            // pasaporte, o quien se registró de menor y ya es adulto. Si ya tiene, no cambia.
            $documentoNuevo = null;
            if (! $paciente->dui && $request->filled('dui')) {
                $request->validate(['dui' => ['string', 'min:6', 'max:15']]);
                $documentoNuevo = $this->documentoDelPaciente((string) $request->dui);
            }

            if ($paciente->es_menor_edad) {
                // Para menores, validar y actualizar responsable si aplica
                if ($paciente->id_responsable && $paciente->responsable) {
                    $request->validate([
                        'responsable_nombre' => ['required', 'string', 'min:3', 'max:150'],
                        'responsable_telefono' => ['required', 'string', 'max:15'],
                        'responsable_parentesco' => ['required', 'string', 'max:50'],
                    ]);

                    $paciente->responsable->update([
                        'nombre_completo' => trim((string) $request->responsable_nombre),
                        'telefono' => trim((string) $request->responsable_telefono),
                        'parentesco' => trim((string) $request->responsable_parentesco),
                    ]);
                }

                // Un menor registrado en emergencia aún no tiene responsable: se puede agregar,
                // con todos sus datos, al editarlo.
                if (! $paciente->id_responsable && ($request->filled('responsable_nombre') || $request->filled('responsable_documento'))) {
                    $request->validate([
                        'responsable_nombre' => ['required', 'string', 'min:3', 'max:150'],
                        'responsable_documento' => ['required', 'string', 'min:6', 'max:15'],
                        'responsable_telefono' => ['required', 'string', 'max:15'],
                        'responsable_parentesco' => ['required', 'string', 'max:50'],
                    ]);

                    $respDoc = trim((string) $request->responsable_documento);
                    if (! preg_match('/^\d{8}-\d$/', $respDoc) && ! preg_match('/^[A-Za-z0-9]{6,15}$/', $respDoc)) {
                        throw ValidationException::withMessages([
                            'responsable_documento' => ['El documento del responsable debe ser un DUI válido (00000000-0) o Pasaporte (6 a 15 caracteres alfanuméricos).'],
                        ]);
                    }

                    $datosResp = [
                        'nombre_completo' => trim((string) $request->responsable_nombre),
                        'telefono' => trim((string) $request->responsable_telefono),
                        'parentesco' => trim((string) $request->responsable_parentesco),
                    ];
                    $responsable = responsable::all()->first(fn ($r) => $r->dui === $respDoc);
                    if ($responsable) {
                        $responsable->update($datosResp);
                    } else {
                        $responsable = responsable::create($datosResp + ['dui' => $respDoc]);
                    }
                    $paciente->id_responsable = $responsable->id_responsable;
                }

                // En menores el teléfono del paciente sigue siendo null
                $paciente->update([
                    'nombre_completo' => $nombreLimpio,
                    'direccion' => $direccionLimpia,
                    ...($documentoNuevo ? ['dui' => $documentoNuevo] : []),
                ]);
            } else {
                // Para adultos: teléfono editable, DUI y fecha_nacimiento inmutables
                $request->validate([
                    'telefono' => ['nullable', 'string', 'max:15'],
                ]);

                $telPaciente = $request->filled('telefono') ? trim((string) $request->telefono) : null;

                $cambios = [
                    'nombre_completo' => $nombreLimpio,
                    'telefono' => $telPaciente,
                    'direccion' => $direccionLimpia,
                ];

                if ($documentoNuevo) {
                    $cambios['dui'] = $documentoNuevo;
                }

                $paciente->update($cambios);
            }

            // La recepcionista revisó el registro (de un médico, o de una emergencia): deja de estar
            // pendiente solo cuando ya tiene lo esencial, el documento (adulto) o el responsable (menor).
            $completo = $paciente->es_menor_edad ? (bool) $paciente->id_responsable : (bool) $paciente->dui;
            if ($paciente->datos_pendientes && $completo && $request->user()->rol === 'RECEPCIONISTA') {
                $paciente->update(['datos_pendientes' => false]);
            }

            return $this->success(
                (new PacienteResource($paciente->fresh()->load('responsable')))->resolve(),
                'Paciente actualizado correctamente.'
            );
        });
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

    /**
     * Historial de citas y atenciones del paciente, con signos vitales,
     * consulta, examen físico, diagnósticos, plan, receta y documentos.
     */
    public function historial(paciente $paciente, HistorialPaciente $historial): JsonResponse
    {
        return $this->success($historial->de($paciente));
    }

    /**
     * Valida el documento de un paciente (DUI o Pasaporte) y que nadie más lo tenga.
     * Sirve tanto al registrar como al agregarlo después.
     */
    private function documentoDelPaciente(string $documento): string
    {
        $doc = trim($documento);

        if (! preg_match('/^\d{8}-\d$/', $doc) && ! preg_match('/^[A-Za-z0-9]{6,15}$/', $doc)) {
            throw ValidationException::withMessages([
                'dui' => ['El documento de identidad debe ser un DUI válido (00000000-0) o Pasaporte (6 a 15 caracteres alfanuméricos).'],
            ]);
        }

        if (paciente::all()->first(fn ($p) => $p->dui === $doc)) {
            throw ValidationException::withMessages([
                'dui' => ['Ya existe un paciente registrado con este documento de identidad.'],
            ]);
        }

        return $doc;
    }
}
