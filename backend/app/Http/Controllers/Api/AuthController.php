<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Controllers\Controller;
use App\Http\Resources\UsuarioResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    use RespondsWithJson;

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'usuario' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('usuario', $credentials['usuario'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'usuario' => ['Las credenciales proporcionadas no son válidas.'],
            ]);
        }

        if ($user->estado !== 'ACTIVO') {
            return $this->failure('El usuario se encuentra inactivo.', 403);
        }

        $user->tokens()->delete();
        $token = $user->createToken('frontend')->plainTextToken;

        return $this->success([
            'token' => $token,
            'usuario' => (new UsuarioResource($user))->resolve(),
        ], 'Sesión iniciada correctamente.');
    }

    public function me(Request $request): JsonResponse
    {
        return $this->success((new UsuarioResource($request->user()))->resolve());
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return $this->success(null, 'Sesión cerrada correctamente.');
    }
}
