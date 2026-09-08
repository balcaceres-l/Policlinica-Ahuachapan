<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Controllers\Controller;
use App\Http\Resources\UsuarioResource;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UsuarioController extends Controller
{
    use RespondsWithJson;

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'rol' => ['nullable', Rule::in(['ADMINISTRADOR', 'MEDICO', 'RECEPCIONISTA'])],
            'estado' => ['nullable', Rule::in(['ACTIVO', 'INACTIVO'])],
            'buscar' => ['nullable', 'string', 'max:100'],
        ]);

        $usuarios = User::query()
            ->when($validated['rol'] ?? null, fn (Builder $query, string $rol) => $query->where('rol', $rol))
            ->when($validated['estado'] ?? null, fn (Builder $query, string $estado) => $query->where('estado', $estado))
            ->when($validated['buscar'] ?? null, function (Builder $query, string $buscar) {
                $query->where(function (Builder $query) use ($buscar) {
                    $query->where('nombre_completo', 'like', "%{$buscar}%")
                        ->orWhere('usuario', 'like', "%{$buscar}%");
                });
            })
            ->orderBy('nombre_completo')
            ->get();

        return $this->success(UsuarioResource::collection($usuarios)->resolve());
    }

    public function store(Request $request): JsonResponse
    {
        $user = User::create($this->validatePayload($request));

        // `estado` viene del default de la tabla: sin refresh se devuelve null.
        return $this->success(
            (new UsuarioResource($user->refresh()))->resolve(),
            'Usuario registrado correctamente.',
            201,
        );
    }

    public function show(User $usuario): JsonResponse
    {
        return $this->success((new UsuarioResource($usuario))->resolve());
    }

    public function update(Request $request, User $usuario): JsonResponse
    {
        $usuario->update($this->validatePayload($request, $usuario));

        return $this->success(
            (new UsuarioResource($usuario->refresh()))->resolve(),
            'Usuario actualizado correctamente.',
        );
    }

    public function cambiarEstado(Request $request, User $usuario): JsonResponse
    {
        $validated = $request->validate([
            'estado' => ['required', Rule::in(['ACTIVO', 'INACTIVO'])],
        ]);

        // Sin password reset, un administrador que se desactiva queda fuera
        // del sistema y solo se recupera tocando la base a mano.
        if ($validated['estado'] === 'INACTIVO' && $usuario->is($request->user())) {
            return $this->failure('No puedes desactivar tu propia cuenta.', 422);
        }

        $usuario->update($validated);

        if ($validated['estado'] === 'INACTIVO') {
            $usuario->tokens()->delete();
        }

        return $this->success(
            (new UsuarioResource($usuario->refresh()))->resolve(),
            'Estado actualizado correctamente.',
        );
    }

    private function validatePayload(Request $request, ?User $user = null): array
    {
        $reglas = [
            'nombre_completo' => ['required', 'string', 'max:150'],
            'usuario' => [
                'required',
                'email',
                'max:150',
                Rule::unique('users', 'usuario')->ignore($user),
            ],
            'cargo' => ['required', 'string', 'max:100'],
            'rol' => ['required', Rule::in(['ADMINISTRADOR', 'MEDICO', 'RECEPCIONISTA'])],
            'estado' => ['sometimes', Rule::in(['ACTIVO', 'INACTIVO'])],
            'telefono' => ['nullable', 'string', 'max:25'],
        ];

        // Solo al crear. Cambiar la contraseña pasa por
        // PATCH /auth/change-password, que exige la actual.
        if (! $user) {
            $reglas['password'] = ['required', 'string', Password::defaults()];
        }

        return $request->validate($reglas);
    }
}
