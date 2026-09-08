<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Controllers\Controller;
use App\Http\Requests\CambiarPasswordRequest;
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

        // Mismo mensaje para usuario inexistente y contraseña incorrecta.
        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            return $this->failure('Usuario o contraseña incorrectos.', 401);
        }

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

    public function changePassword(CambiarPasswordRequest $request): JsonResponse
    {
        $user = $request->user();

        if (! Hash::check($request->validated('password_actual'), $user->password)) {
            return $this->failure('La contraseña actual no es correcta.', 422);
        }

        $user->update(['password' => $request->validated('password')]);

        // Se cierran las otras sesiones y sobrevive la que hizo el cambio.
        $tokenActual = $request->user()->currentAccessToken();
        $user->tokens()->where('id', '!=', $tokenActual->getKey())->delete();

        return $this->success(null, 'Contraseña actualizada correctamente.');
    }
}
