<?php

namespace Tests\Feature\Api;

use App\Mail\RestablecerPasswordMail;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Tests\TestCase;

class RestablecerPasswordTest extends TestCase
{
    use RefreshDatabase;

    private User $usuario;

    protected function setUp(): void
    {
        parent::setUp();

        $this->usuario = User::factory()->create([
            'nombre_completo' => 'Dr. Fernando Alvarenga',
            'usuario' => 'falvarenga@policlinica.com',
            'password' => Hash::make('password123'),
            'rol' => 'MEDICO',
            'estado' => 'ACTIVO',
        ]);
    }

    public function test_usuario_puede_solicitar_restablecimiento_de_password(): void
    {
        Mail::fake();

        $response = $this->postJson('/api/auth/forgot-password', [
            'usuario' => 'falvarenga@policlinica.com',
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true);

        // Verificar que se guardó el token en la base de datos
        $this->assertDatabaseHas('password_reset_tokens', [
            'usuario' => 'falvarenga@policlinica.com',
        ]);

        // Verificar que se envió el correo
        Mail::assertSent(RestablecerPasswordMail::class, function ($mail) {
            return $mail->hasTo('falvarenga@policlinica.com');
        });
    }

    public function test_solicitud_con_usuario_inexistente_no_revela_informacion(): void
    {
        Mail::fake();

        $response = $this->postJson('/api/auth/forgot-password', [
            'usuario' => 'noexiste@policlinica.com',
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true);

        Mail::assertNothingSent();
    }

    public function test_usuario_puede_restablecer_password_con_token_valido(): void
    {
        $tokenPlano = Str::random(64);

        DB::table('password_reset_tokens')->insert([
            'usuario' => $this->usuario->usuario,
            'token' => Hash::make($tokenPlano),
            'created_at' => Carbon::now(),
        ]);

        $response = $this->postJson('/api/auth/reset-password', [
            'usuario' => $this->usuario->usuario,
            'token' => $tokenPlano,
            'password' => 'nuevaPassword2026',
            'password_confirmation' => 'nuevaPassword2026',
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true);

        // Token fue eliminado de la tabla
        $this->assertDatabaseMissing('password_reset_tokens', [
            'usuario' => $this->usuario->usuario,
        ]);

        // Puede iniciar sesión con la nueva contraseña
        $loginResponse = $this->postJson('/api/auth/login', [
            'usuario' => $this->usuario->usuario,
            'password' => 'nuevaPassword2026',
        ]);

        $loginResponse->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_no_se_puede_restablecer_con_token_invalido(): void
    {
        DB::table('password_reset_tokens')->insert([
            'usuario' => $this->usuario->usuario,
            'token' => Hash::make('token_correcto'),
            'created_at' => Carbon::now(),
        ]);

        $response = $this->postJson('/api/auth/reset-password', [
            'usuario' => $this->usuario->usuario,
            'token' => 'token_falso_incorrecto',
            'password' => 'nuevaPassword2026',
            'password_confirmation' => 'nuevaPassword2026',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('success', false);
    }

    public function test_no_se_puede_restablecer_con_token_expirado(): void
    {
        $tokenPlano = Str::random(64);

        DB::table('password_reset_tokens')->insert([
            'usuario' => $this->usuario->usuario,
            'token' => Hash::make($tokenPlano),
            'created_at' => Carbon::now()->subMinutes(61), // Más de 60 min
        ]);

        $response = $this->postJson('/api/auth/reset-password', [
            'usuario' => $this->usuario->usuario,
            'token' => $tokenPlano,
            'password' => 'nuevaPassword2026',
            'password_confirmation' => 'nuevaPassword2026',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('success', false);
    }
}
