<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Controllers\Controller;
use App\Http\Resources\ConstanciaMedicaResource;
use App\Http\Resources\ReferenciaMedicaResource;
use App\Models\constancia_medica;
use App\Models\consulta;
use App\Models\referencia_medica;
use App\Models\resultado_laboratorio;
use App\Models\User;
use App\Services\DocumentoPdf;
use App\Services\HistorialPaciente;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

/**
 * Documentos médicos del Sprint 3: receta imprimible (HU-30), constancia
 * (HU-31), referencia interna o externa (HU-32) y su PDF (HU-33).
 */
class DocumentoMedicoController extends Controller
{
    use RespondsWithJson;

    public function __construct(private readonly DocumentoPdf $pdf) {}

    /** HU-31 — la emite el médico que atiende o atendió la consulta. */
    public function crearConstancia(Request $request, consulta $consulta): JsonResponse
    {
        if ($rechazo = $this->soloQuienAtendio($request, $consulta)) {
            return $rechazo;
        }

        $validado = $request->validate([
            'motivo' => ['required', 'string', 'min:5', 'max:2000'],
        ], [
            'motivo.required' => 'Escribe el motivo de la constancia.',
            'motivo.min' => 'El motivo debe tener al menos 5 caracteres.',
        ]);

        $constancia = constancia_medica::create([
            'id_consulta' => $consulta->id_consulta,
            'id_paciente' => $consulta->cita->id_paciente,
            'id_medico' => $request->user()->id,
            'motivo' => trim($validado['motivo']),
            'fecha_emision' => now(),
        ]);

        return $this->success(
            (new ConstanciaMedicaResource($constancia->load('medico')))->resolve(),
            'Constancia generada correctamente.',
            201,
        );
    }

    /**
     * HU-32 — INTERNA hacia otro médico activo de la policlínica (el PDF lleva
     * el expediente completo); EXTERNA hacia un especialista de fuera (el PDF
     * lleva solo lo que el médico escribe).
     */
    public function crearReferencia(Request $request, consulta $consulta): JsonResponse
    {
        if ($rechazo = $this->soloQuienAtendio($request, $consulta)) {
            return $rechazo;
        }

        $validado = $request->validate([
            'tipo' => ['required', Rule::in(referencia_medica::TIPOS)],
            'medico_destino_id' => ['required_if:tipo,INTERNA', 'nullable', 'uuid', 'exists:users,id'],
            'destino' => ['required_if:tipo,EXTERNA', 'nullable', 'string', 'max:200'],
            'especialidad_destino' => ['nullable', 'string', 'max:150'],
            'motivo' => ['required', 'string', 'min:5', 'max:2000'],
            'resumen_clinico' => ['required_if:tipo,EXTERNA', 'nullable', 'string', 'max:5000'],
        ], [
            'medico_destino_id.required_if' => 'Elige el médico de la policlínica al que refieres.',
            'destino.required_if' => 'Indica el especialista o la institución a la que refieres.',
            'resumen_clinico.required_if' => 'Escribe la información clínica que llevará la referencia.',
            'motivo.required' => 'Escribe el motivo de la referencia.',
            'motivo.min' => 'El motivo debe tener al menos 5 caracteres.',
        ]);

        $interna = $validado['tipo'] === 'INTERNA';

        if ($interna) {
            $destino = User::find($validado['medico_destino_id']);
            if ($destino->rol !== 'MEDICO' || $destino->estado !== 'ACTIVO') {
                return $this->failure('El médico de destino no está disponible.', 422);
            }
            if ($destino->id === $request->user()->id) {
                return $this->failure('No puedes referirte un paciente a ti mismo.', 422);
            }
        }

        $referencia = referencia_medica::create([
            'id_consulta' => $consulta->id_consulta,
            'id_paciente' => $consulta->cita->id_paciente,
            'id_medico' => $request->user()->id,
            'tipo' => $validado['tipo'],
            'id_medico_destino' => $interna ? $validado['medico_destino_id'] : null,
            'destino' => $interna ? null : trim($validado['destino']),
            'especialidad_destino' => $validado['especialidad_destino'] ?? null,
            'motivo' => trim($validado['motivo']),
            'resumen_clinico' => isset($validado['resumen_clinico']) ? trim($validado['resumen_clinico']) : null,
            'fecha_emision' => now(),
        ]);

        return $this->success(
            (new ReferenciaMedicaResource($referencia->load(['medico', 'medicoDestino'])))->resolve(),
            'Referencia generada correctamente.',
            201,
        );
    }

    /** Médicos activos a los que se puede referir internamente (todos menos uno mismo). */
    public function medicosDestino(Request $request): JsonResponse
    {
        $medicos = User::with(['especialidades' => fn ($q) => $q->where('estado', 'ACTIVA')])
            ->where('rol', 'MEDICO')
            ->where('estado', 'ACTIVO')
            ->where('id', '!=', $request->user()->id)
            ->orderBy('nombre_completo')
            ->get()
            ->map(fn (User $m) => [
                'id' => $m->id,
                'nombre' => $m->nombre_completo,
                'especialidades' => $m->especialidades->pluck('nombre')->values()->all(),
            ]);

        return $this->success($medicos);
    }

    /** HU-30 / HU-33 — receta de la consulta. */
    public function pdfReceta(Request $request, consulta $consulta): Response
    {
        $consulta->load(['receta.detalles', 'cita.paciente', 'medico', 'especialidad']);

        if (! $consulta->receta || $consulta->receta->detalles->isEmpty()) {
            return $this->failure('Esta consulta no tiene receta con medicamentos.', 404);
        }

        $paciente = $consulta->cita->paciente;

        return $this->pdf->responder('receta', [
            'receta' => $consulta->receta,
            'paciente' => $paciente,
            'medico' => $consulta->medico,
            'especialidad' => $consulta->especialidad?->nombre,
            'fecha' => $consulta->receta->fecha_emision ?? $consulta->fecha_hora_inicio,
        ], $this->nombreArchivo('receta', $paciente->numero_expediente), $request->boolean('descargar'));
    }

    /** HU-31 / HU-33 */
    public function pdfConstancia(Request $request, constancia_medica $constancia): Response
    {
        $constancia->load(['paciente', 'medico', 'consulta.especialidad']);

        return $this->pdf->responder('constancia', [
            'constancia' => $constancia,
            'paciente' => $constancia->paciente,
            'medico' => $constancia->medico,
            'especialidad' => $constancia->consulta?->especialidad?->nombre,
            'fecha' => $constancia->fecha_emision,
            'fechaAtencion' => $constancia->consulta?->fecha_hora_inicio,
        ], $this->nombreArchivo('constancia', $constancia->paciente->numero_expediente), $request->boolean('descargar'));
    }

    /** HU-32 / HU-33 — la interna lleva el expediente completo; la externa, no. */
    public function pdfReferencia(
        Request $request,
        referencia_medica $referencia,
        HistorialPaciente $historial,
    ): Response {
        $referencia->load(['paciente.responsable', 'medico', 'medicoDestino', 'consulta.especialidad']);
        $paciente = $referencia->paciente;

        $expediente = $referencia->esInterna()
            ? [
                // Solo atenciones reales: una cita sin consulta no aporta al expediente.
                'historial' => $historial->de($paciente)->filter(fn ($c) => $c['id'] !== $c['cita_id'])->values(),
                'laboratorio' => resultado_laboratorio::where('id_paciente', $paciente->id_paciente)
                    ->orderByDesc('fecha_examen')
                    ->get(),
            ]
            : [];

        return $this->pdf->responder('referencia', [
            'referencia' => $referencia,
            'paciente' => $paciente,
            'medico' => $referencia->medico,
            'especialidad' => $referencia->consulta?->especialidad?->nombre,
            'fecha' => $referencia->fecha_emision,
            ...$expediente,
        ], $this->nombreArchivo('referencia', $paciente->numero_expediente), $request->boolean('descargar'));
    }

    private function soloQuienAtendio(Request $request, consulta $consulta): ?JsonResponse
    {
        return $consulta->id_medico !== $request->user()->id
            ? $this->failure('Solo el médico que atendió la consulta puede emitir este documento.', 403)
            : null;
    }

    private function nombreArchivo(string $tipo, ?string $expediente): string
    {
        return Str::slug($tipo.' '.($expediente ?? '').' '.now()->format('Ymd')).'.pdf';
    }
}
