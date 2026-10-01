<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Controllers\Controller;
use App\Http\Resources\EspecialidadResource;
use App\Models\Especialidad;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MedicoEspecialidadController extends Controller
{
    use RespondsWithJson;

    public function index(User $medico): JsonResponse
    {
        if ($medico->rol !== 'MEDICO') {
            return $this->failure('El usuario indicado no es médico.', 422);
        }

        $especialidades = $medico->especialidades()
            ->withCount('medicos')
            ->orderBy('nombre')
            ->get();

        return $this->success(EspecialidadResource::collection($especialidades)->resolve());
    }

    public function store(Request $request, User $medico): JsonResponse
    {
        if ($medico->rol !== 'MEDICO') {
            return $this->failure('El usuario indicado no es médico.', 422);
        }

        if ($medico->estado !== 'ACTIVO') {
            return $this->failure('No se pueden asignar especialidades a un médico inactivo.', 422);
        }

        $validated = $request->validate([
            'especialidadId' => ['required', 'uuid', 'exists:especialidades,id'],
        ]);

        $especialidad = Especialidad::findOrFail($validated['especialidadId']);
        if ($especialidad->estado !== 'ACTIVA') {
            return $this->failure('No se puede asignar una especialidad inactiva.', 422);
        }

        $attached = $medico->especialidades()->syncWithoutDetaching([$especialidad->id]);
        if ($attached['attached'] === []) {
            return $this->failure('El médico ya tiene asignada esa especialidad.', 409);
        }

        return $this->success(null, 'Especialidad asignada correctamente.', 201);
    }

    public function destroy(User $medico, Especialidad $especialidad): JsonResponse
    {
        if ($medico->rol !== 'MEDICO') {
            return $this->failure('El usuario indicado no es médico.', 422);
        }

        if ($medico->especialidades()->detach($especialidad->id) === 0) {
            return $this->failure('La especialidad no estaba asignada al médico.', 404);
        }

        return $this->success(null, 'Especialidad retirada correctamente.');
    }
}
