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
        $especialidades = Especialidad::query()
            ->where('estado', 'ACTIVA')
            ->withCount('medicos')
            ->with(['medicos' => fn ($query) => $query->orderBy('nombre_completo')])
            ->orderBy('nombre')
            ->get();

        return $this->success(CatalogoEspecialidadResource::collection($especialidades)->resolve());
    }
}
