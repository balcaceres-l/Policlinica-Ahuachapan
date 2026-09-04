<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Controllers\Controller;
use App\Http\Resources\UsuarioResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

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

        // RB-32: mensaje idéntico para usuario inexistente y contraseña incorrecta.
        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            return $this->failure('Usuario o contraseña incorrectos.', 401);
        }

        // RB-01: solo las cuentas activas pueden autenticarse.
        if ($user->estado !== 'ACTIVO') {
            return $this->failure('El usuario se encuentra inactivo.', 403);
        }

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
