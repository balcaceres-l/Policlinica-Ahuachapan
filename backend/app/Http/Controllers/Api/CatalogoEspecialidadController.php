<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Controllers\Controller;
use App\Http\Resources\CatalogoEspecialidadResource;
use App\Models\Especialidad;
use Illuminate\Http\JsonResponse;

class CatalogoEspecialidadController extends Controller
{
    use RespondsWithJson;

    public function index(): JsonResponse
    {
        // Recepción usa este catálogo para agendar, así que solo debe ver
        // médicos que puedan atender. El listado del administrador sí muestra
        // los inactivos, porque ahí interesa la asignación completa.
        $soloActivos = fn ($query) => $query->where('estado', 'ACTIVO');

        $especialidades = Especialidad::query()
            ->where('estado', 'ACTIVA')
            ->withCount(['medicos' => $soloActivos])
            ->with(['medicos' => fn ($query) => $soloActivos($query)->orderBy('nombre_completo')])
            ->orderBy('nombre')
            ->get();

        return $this->success(CatalogoEspecialidadResource::collection($especialidades)->resolve());
    }
}
