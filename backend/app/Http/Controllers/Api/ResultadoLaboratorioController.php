<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Controllers\Controller;
use App\Http\Resources\ResultadoLaboratorioResource;
use App\Models\consulta;
use App\Models\paciente;
use App\Models\resultado_laboratorio;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ResultadoLaboratorioController extends Controller
{
    use RespondsWithJson;

    private const DISCO = 'local';

    /** Resultados más recientes de todos los pacientes, para la vista del médico. */
    public function index(): JsonResponse
    {
        $resultados = resultado_laboratorio::with(['paciente', 'registradoPor'])
            ->orderByDesc('fecha_examen')
            ->orderByDesc('created_at')
            ->limit(100)
            ->get();

        return $this->success(ResultadoLaboratorioResource::collection($resultados)->resolve());
    }

    /** HU-23 — resultados del paciente en orden cronológico, del más reciente al más antiguo. */
    public function porPaciente(paciente $paciente): JsonResponse
    {
        $resultados = $paciente->resultadosLaboratorio()
            ->with('registradoPor')
            ->orderByDesc('fecha_examen')
            ->orderByDesc('created_at')
            ->get();

        return $this->success(ResultadoLaboratorioResource::collection($resultados)->resolve());
    }

    /** HU-41 — registra un resultado como texto, como adjunto (imagen o PDF) o ambos. */
    public function store(Request $request, paciente $paciente): JsonResponse
    {
        $validado = $request->validate([
            'nombre_examen' => ['required', 'string', 'max:150'],
            'fecha_examen' => ['required', 'date', 'before_or_equal:today'],
            'resultado_texto' => ['nullable', 'string', 'max:5000', 'required_without:archivo'],
            'archivo' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:5120', 'required_without:resultado_texto'],
            'consulta_id' => ['nullable', 'uuid'],
        ], [
            'resultado_texto.required_without' => 'Escribe el resultado o adjunta una imagen o PDF.',
            'archivo.required_without' => 'Escribe el resultado o adjunta una imagen o PDF.',
            'archivo.mimes' => 'El adjunto debe ser una imagen (JPG, PNG, WEBP) o un PDF.',
            'archivo.max' => 'El adjunto no puede superar los 5 MB.',
            'archivo.uploaded' => 'El adjunto supera el tamaño que acepta el servidor.',
            'fecha_examen.before_or_equal' => 'La fecha del examen no puede ser futura.',
        ]);

        $consultaId = $validado['consulta_id'] ?? null;
        if ($consultaId !== null) {
            $esDelPaciente = consulta::where('id_consulta', $consultaId)
                ->whereHas('cita', fn ($query) => $query->where('id_paciente', $paciente->id_paciente))
                ->exists();

            if (! $esDelPaciente) {
                return $this->failure('La consulta indicada no pertenece a este paciente.', 422);
            }
        }

        $archivo = $request->file('archivo');
        $ruta = null;
        if ($archivo) {
            $nombreEnDisco = Str::uuid().'.'.$archivo->extension();
            $ruta = $archivo->storeAs("laboratorio/{$paciente->id_paciente}", $nombreEnDisco, self::DISCO);
        }

        $resultado = resultado_laboratorio::create([
            'id_paciente' => $paciente->id_paciente,
            'id_consulta' => $consultaId,
            'id_registrado_por' => $request->user()->id,
            'nombre_examen' => trim($validado['nombre_examen']),
            'fecha_examen' => $validado['fecha_examen'],
            'resultado_texto' => isset($validado['resultado_texto']) ? trim($validado['resultado_texto']) : null,
            'archivo_ruta' => $ruta,
            'archivo_nombre' => $archivo?->getClientOriginalName(),
            'archivo_mime' => $archivo?->getMimeType(),
            'archivo_tamano' => $archivo?->getSize(),
        ]);

        return $this->success(
            (new ResultadoLaboratorioResource($resultado->load('registradoPor')))->resolve(),
            'Resultado de laboratorio registrado correctamente.',
            201,
        );
    }

    /** Sirve el adjunto. No hay URL pública: siempre pasa por la sesión. */
    public function archivo(resultado_laboratorio $resultado): StreamedResponse|JsonResponse
    {
        if (! $resultado->tieneArchivo() || ! Storage::disk(self::DISCO)->exists($resultado->archivo_ruta)) {
            return $this->failure('Este resultado no tiene un archivo adjunto.', 404);
        }

        return Storage::disk(self::DISCO)->response(
            $resultado->archivo_ruta,
            $resultado->archivo_nombre,
            ['Content-Type' => $resultado->archivo_mime],
            'inline',
        );
    }

    /** Solo quien lo registró puede eliminarlo, para corregir un error de carga. */
    public function destroy(Request $request, resultado_laboratorio $resultado): JsonResponse
    {
        if ($resultado->id_registrado_por !== $request->user()->id) {
            return $this->failure('Solo quien registró el resultado puede eliminarlo.', 403);
        }

        if ($resultado->tieneArchivo()) {
            Storage::disk(self::DISCO)->delete($resultado->archivo_ruta);
        }

        $resultado->delete();

        return $this->success(null, 'Resultado de laboratorio eliminado correctamente.');
    }
}
