<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Controllers\Controller;
use App\Http\Resources\HorarioMedicoResource;
use App\Models\horario_medico;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class HorarioMedicoController extends Controller
{
    use RespondsWithJson;

    private const DIAS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];

    public function index(User $medico): JsonResponse
    {
        if ($medico->rol !== 'MEDICO') {
            return $this->failure('El usuario indicado no es médico.', 422);
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
        $validado = $request->validate([
            'dia_semana' => ['required', Rule::in(self::DIAS)],
            'hora_inicio' => ['required', 'date_format:H:i'],
            'hora_fin' => ['required', 'date_format:H:i', 'after:hora_inicio'],
        ]);

        if ($this->seSolapaConOtro($horario->id_medico, $validado, $horario->id_horario)) {
            return $this->failure('El tramo se solapa con otro horario del mismo día.', 422);
        }

        $horario->update($validado);

        return $this->success(
            (new HorarioMedicoResource($horario->refresh()))->resolve(),
            'Horario actualizado correctamente.',
        );
    }

    public function destroy(horario_medico $horario): JsonResponse
    {
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

        $validado = $request->validate([
            'horarios' => ['present', 'array'],
            'horarios.*.dia_semana' => ['required', Rule::in(self::DIAS)],
            'horarios.*.hora_inicio' => ['required', 'date_format:H:i'],
            'horarios.*.hora_fin' => ['required', 'date_format:H:i', 'after:horarios.*.hora_inicio'],
        ]);

        foreach ($this->tramosSolapadosEntreSi($validado['horarios']) as $dia) {
            return $this->failure("Hay tramos solapados el día {$dia}.", 422);
        }

        DB::transaction(function () use ($medico, $validado) {
            horario_medico::where('id_medico', $medico->id)->delete();

            foreach ($validado['horarios'] as $tramo) {
                horario_medico::create($tramo + ['id_medico' => $medico->id]);
            }
        });

        return $this->index($medico);
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
