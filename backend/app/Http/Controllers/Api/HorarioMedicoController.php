<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Controllers\Controller;
use App\Http\Resources\HorarioMedicoResource;
use App\Models\cita;
use App\Models\horario_medico;
use App\Models\User;
use App\Services\AgendaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * HU-34 — horarios de los médicos. El administrador configura el de cualquiera;
 * el médico, solo el suyo y sin dejar citas agendadas fuera (esas las
 * reagenda recepción).
 */
class HorarioMedicoController extends Controller
{
    use RespondsWithJson;

    private const DIAS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];

    public function __construct(private readonly AgendaService $agenda) {}

    public function index(Request $request, User $medico): JsonResponse
    {
        if ($medico->rol !== 'MEDICO') {
            return $this->failure('El usuario indicado no es médico.', 422);
        }

        // Si el usuario autenticado es médico, solo puede ver sus propios horarios
        if ($request->user()->rol === 'MEDICO' && $request->user()->id !== $medico->id) {
            return $this->failure('Solo puedes consultar tus propios horarios.', 403);
        }

        $horarios = horario_medico::where('id_medico', $medico->id)
            ->orderByRaw($this->ordenPorDia())
            ->orderBy('hora_inicio')
            ->get();

        return $this->success(HorarioMedicoResource::collection($horarios)->resolve());
    }

    public function store(Request $request, User $medico): JsonResponse
    {
        if ($medico->rol !== 'MEDICO') {
            return $this->failure('El usuario indicado no es médico.', 422);
        }
        if ($rechazo = $this->soloSuHorario($request, $medico->id)) {
            return $rechazo;
        }

        $validado = $request->validate([
            'dia_semana' => ['required', Rule::in(self::DIAS)],
            'hora_inicio' => ['required', 'date_format:H:i'],
            'hora_fin' => ['required', 'date_format:H:i', 'after:hora_inicio'],
        ]);

        if ($this->seSolapaConOtro($medico->id, $validado)) {
            return $this->failure('El tramo se solapa con otro horario del mismo día.', 422);
        }

        $horario = horario_medico::create($validado + ['id_medico' => $medico->id]);

        return $this->success(
            (new HorarioMedicoResource($horario))->resolve(),
            'Horario registrado correctamente.',
            201,
        );
    }

    public function update(Request $request, horario_medico $horario): JsonResponse
    {
        if ($rechazo = $this->soloSuHorario($request, $horario->id_medico)) {
            return $rechazo;
        }

        $validado = $request->validate([
            'dia_semana' => ['required', Rule::in(self::DIAS)],
            'hora_inicio' => ['required', 'date_format:H:i'],
            'hora_fin' => ['required', 'date_format:H:i', 'after:hora_inicio'],
        ]);

        if ($this->seSolapaConOtro($horario->id_medico, $validado, $horario->id_horario)) {
            return $this->failure('El tramo se solapa con otro horario del mismo día.', 422);
        }

        $tramos = $this->tramosDe($horario->id_medico, $horario->id_horario);
        $tramos[] = $validado;
        if ($rechazo = $this->rechazarSiDejaCitasFuera($request, $horario->id_medico, $tramos)) {
            return $rechazo;
        }

        $horario->update($validado);

        return $this->success(
            (new HorarioMedicoResource($horario->refresh()))->resolve(),
            'Horario actualizado correctamente.',
        );
    }

    public function destroy(Request $request, horario_medico $horario): JsonResponse
    {
        if ($rechazo = $this->soloSuHorario($request, $horario->id_medico)) {
            return $rechazo;
        }

        $tramos = $this->tramosDe($horario->id_medico, $horario->id_horario);
        if ($rechazo = $this->rechazarSiDejaCitasFuera($request, $horario->id_medico, $tramos)) {
            return $rechazo;
        }

        $horario->delete();

        return $this->success(null, 'Horario eliminado correctamente.');
    }

    /**
     * Reemplaza la semana completa de un médico. La pantalla de horarios
     * envía toda la parrilla, no tramo por tramo.
     */
    public function sincronizar(Request $request, User $medico): JsonResponse
    {
        if ($medico->rol !== 'MEDICO') {
            return $this->failure('El usuario indicado no es médico.', 422);
        }
        if ($rechazo = $this->soloSuHorario($request, $medico->id)) {
            return $rechazo;
        }

        $validado = $request->validate([
            'horarios' => ['present', 'array'],
            'horarios.*.dia_semana' => ['required', Rule::in(self::DIAS)],
            'horarios.*.hora_inicio' => ['required', 'date_format:H:i'],
            'horarios.*.hora_fin' => ['required', 'date_format:H:i', 'after:horarios.*.hora_inicio'],
        ]);

        foreach ($this->tramosSolapadosEntreSi($validado['horarios']) as $dia) {
            return $this->failure("Hay tramos solapados el día {$dia}.", 422);
        }

        if ($rechazo = $this->rechazarSiDejaCitasFuera($request, $medico->id, $validado['horarios'])) {
            return $rechazo;
        }

        DB::transaction(function () use ($medico, $validado) {
            horario_medico::where('id_medico', $medico->id)->delete();

            foreach ($validado['horarios'] as $tramo) {
                horario_medico::create($tramo + ['id_medico' => $medico->id]);
            }
        });

        return $this->index($request, $medico);
    }

    /** El médico solo puede tocar su propio horario. */
    private function soloSuHorario(Request $request, string $medicoId): ?JsonResponse
    {
        $usuario = $request->user();

        return $usuario->rol === 'MEDICO' && $usuario->id !== $medicoId
            ? $this->failure('Solo puedes modificar tu propio horario.', 403)
            : null;
    }

    /**
     * El médico no puede dejar citas agendadas fuera de su horario: esas las
     * reagenda recepción, que es quien contacta a los pacientes. El
     * administrador sí puede (HU-34: las citas ya confirmadas se respetan).
     *
     * @param  array<int, array<string, string>>  $tramosNuevos
     */
    private function rechazarSiDejaCitasFuera(Request $request, string $medicoId, array $tramosNuevos): ?JsonResponse
    {
        if ($request->user()->rol !== 'MEDICO') {
            return null;
        }

        $fuera = $this->agenda->citasFueraDeHorario($medicoId, $tramosNuevos);
        if ($fuera->isEmpty()) {
            return null;
        }

        $ejemplos = $fuera->take(3)
            ->map(fn (cita $c) => $c->fecha->format('d/m').' '.substr((string) $c->hora_inicio, 0, 5)
                .' ('.$c->paciente?->nombre_completo.')')
            ->implode(', ');
        $mas = $fuera->count() > 3 ? ' y '.($fuera->count() - 3).' más' : '';

        return $this->failure(
            "Ese cambio deja fuera de tu horario {$fuera->count()} cita(s) agendada(s): {$ejemplos}{$mas}. "
            .'Pide a recepción que las reagende y vuelve a intentarlo.',
            422,
        );
    }

    /**
     * Tramos actuales del médico, sin el indicado.
     *
     * @return array<int, array<string, string>>
     */
    private function tramosDe(string $medicoId, ?string $sinIncluir = null): array
    {
        return horario_medico::where('id_medico', $medicoId)
            ->when($sinIncluir, fn ($q) => $q->where('id_horario', '!=', $sinIncluir))
            ->get()
            ->map(fn (horario_medico $h) => [
                'dia_semana' => $h->dia_semana,
                'hora_inicio' => substr((string) $h->hora_inicio, 0, 5),
                'hora_fin' => substr((string) $h->hora_fin, 0, 5),
            ])
            ->all();
    }

    /** @param array<string, string> $tramo */
    private function seSolapaConOtro(string $medicoId, array $tramo, ?string $ignorar = null): bool
    {
        return horario_medico::where('id_medico', $medicoId)
            ->where('dia_semana', $tramo['dia_semana'])
            ->when($ignorar, fn ($q) => $q->where('id_horario', '!=', $ignorar))
            ->where('hora_inicio', '<', $tramo['hora_fin'])
            ->where('hora_fin', '>', $tramo['hora_inicio'])
            ->exists();
    }

    /**
     * @param  array<int, array<string, string>>  $horarios
     * @return array<int, string>
     */
    private function tramosSolapadosEntreSi(array $horarios): array
    {
        $dias = [];

        foreach ($horarios as $i => $a) {
            foreach (array_slice($horarios, $i + 1) as $b) {
                if ($a['dia_semana'] !== $b['dia_semana']) {
                    continue;
                }
                if ($a['hora_inicio'] < $b['hora_fin'] && $a['hora_fin'] > $b['hora_inicio']) {
                    $dias[] = $a['dia_semana'];
                }
            }
        }

        return array_unique($dias);
    }

    private function ordenPorDia(): string
    {
        $casos = [];
        foreach (self::DIAS as $i => $dia) {
            $casos[] = "WHEN '{$dia}' THEN {$i}";
        }

        return 'CASE dia_semana '.implode(' ', $casos).' END';
    }
}
