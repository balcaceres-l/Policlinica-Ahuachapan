<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Controllers\Controller;
use App\Http\Resources\EspecialidadResource;
use App\Models\Especialidad;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class EspecialidadController extends Controller
{
    use RespondsWithJson;

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'estado' => ['nullable', Rule::in(['ACTIVA', 'INACTIVA'])],
        ]);

        $especialidades = Especialidad::query()
            ->withCount('medicos')
            ->when(
                $validated['estado'] ?? null,
                fn (Builder $query, string $estado) => $query->where('estado', $estado),
            )
            ->orderBy('nombre')
            ->get();

        return $this->success(EspecialidadResource::collection($especialidades)->resolve());
    }

    public function store(Request $request): JsonResponse
    {
        // `estado` viene del default de la tabla: sin refresh se devuelve null.
        $especialidad = Especialidad::create($this->validatePayload($request))->refresh();
        $especialidad->setAttribute('medicos_count', 0);

        return $this->success(
            (new EspecialidadResource($especialidad))->resolve(),
            'Especialidad registrada correctamente.',
            201,
        );
    }

    public function show(Especialidad $especialidad): JsonResponse
    {
        $especialidad->loadCount('medicos');

        return $this->success((new EspecialidadResource($especialidad))->resolve());
    }

    public function update(Request $request, Especialidad $especialidad): JsonResponse
    {
        $especialidad->update($this->validatePayload($request, $especialidad));
        $especialidad->loadCount('medicos');

        return $this->success(
            (new EspecialidadResource($especialidad))->resolve(),
            'Especialidad actualizada correctamente.',
        );
    }

    private function validatePayload(Request $request, ?Especialidad $especialidad = null): array
    {
        return $request->validate([
            'nombre' => [
                'required',
                'string',
                'min:3',
                'max:60',
                Rule::unique('especialidades', 'nombre')->ignore($especialidad),
            ],
            'descripcion' => ['nullable', 'string', 'max:200'],
            'estado' => ['sometimes', Rule::in(['ACTIVA', 'INACTIVA'])],
        ]);
    }
}
