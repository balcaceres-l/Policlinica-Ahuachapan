<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Controllers\Controller;
use App\Http\Requests\CambiarPasswordRequest;
use App\Http\Resources\UsuarioResource;
use App\Mail\RestablecerPasswordMail;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

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

    /**
     * Solicita enlace de restablecimiento de contraseña por correo.
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate([
            'usuario' => ['required', 'string'],
        ]);

        $user = User::where('usuario', $request->input('usuario'))->first();

        // Por seguridad, si el usuario no existe o está inactivo, devolvemos el mismo mensaje genérico
        if (! $user || $user->estado !== 'ACTIVO') {
            return $this->success(
                null,
                'Si el usuario o correo está registrado en el sistema, recibirás las instrucciones en breve.'
            );
        }

        // Generar token criptográficamente seguro
        $tokenPlano = Str::random(64);

        DB::table('password_reset_tokens')->updateOrInsert(
            ['usuario' => $user->usuario],
            [
                'token' => Hash::make($tokenPlano),
                'created_at' => Carbon::now(),
            ]
        );

        $frontendUrl = rtrim((string) env('FRONTEND_URL', 'http://localhost:5173'), '/');
        $urlRestablecimiento = "{$frontendUrl}/restablecer-password?token={$tokenPlano}&usuario=" . urlencode($user->usuario);

        try {
            Mail::to($user->usuario)->send(
                new RestablecerPasswordMail($user->nombre_completo, $urlRestablecimiento)
            );
        } catch (\Throwable $e) {
            Log::error('Error al enviar correo de restablecimiento: ' . $e->getMessage());

            return $this->failure(
                'No se pudo enviar el correo de recuperación. Por favor contacta al administrador o intenta de nuevo.',
                500
            );
        }

        return $this->success(
            null,
            'Hemos enviado las instrucciones para restablecer tu contraseña a tu correo institucional.'
        );
    }

    /**
     * Valida el token y actualiza la contraseña del usuario.
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'usuario' => ['required', 'string'],
            'token' => ['required', 'string'],
            'password' => ['required', 'string', 'confirmed', Password::defaults()],
        ], [
            'password.confirmed' => 'La confirmación de la contraseña no coincide.',
        ]);

        $registro = DB::table('password_reset_tokens')
            ->where('usuario', $validated['usuario'])
            ->first();

        if (! $registro) {
            return $this->failure(
                'El enlace de restablecimiento es inválido o ya ha sido utilizado.',
                422
            );
        }

        // Verificar expiración (60 minutos)
        if (Carbon::parse($registro->created_at)->addMinutes(60)->isPast()) {
            DB::table('password_reset_tokens')->where('usuario', $validated['usuario'])->delete();

            return $this->failure(
                'El enlace de restablecimiento ha expirado. Por favor solicita uno nuevo.',
                422
            );
        }

        // Validar hash del token
        if (! Hash::check($validated['token'], $registro->token)) {
            return $this->failure(
                'El token de seguridad es inválido.',
                422
            );
        }

        $user = User::where('usuario', $validated['usuario'])->first();
        if (! $user) {
            return $this->failure('Usuario no encontrado.', 404);
        }

        $user->update([
            'password' => $validated['password'],
        ]);

        // Revocar todas las sesiones activas por seguridad
        $user->tokens()->delete();

        // Eliminar token usado
        DB::table('password_reset_tokens')->where('usuario', $validated['usuario'])->delete();

        return $this->success(
            null,
            'Tu contraseña ha sido restablecida correctamente. Ya puedes iniciar sesión con tu nueva contraseña.'
        );
    }
}
