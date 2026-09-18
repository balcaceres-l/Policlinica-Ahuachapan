<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BloqueoAgendaController;
use App\Http\Controllers\Api\CatalogoEspecialidadController;
use App\Http\Controllers\Api\CitaController;
use App\Http\Controllers\Api\EspecialidadController;
use App\Http\Controllers\Api\HorarioMedicoController;
use App\Http\Controllers\Api\MedicoEspecialidadController;
use App\Http\Controllers\Api\UsuarioController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:login');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // HU-02 — disponible para los tres roles (RF-02: todos los usuarios).
    Route::patch('/auth/change-password', [AuthController::class, 'changePassword'])
        ->middleware('throttle:6,1');

    Route::middleware('role:ADMINISTRADOR')->group(function () {
        Route::apiResource('usuarios', UsuarioController::class)->except('destroy');
        Route::patch('/usuarios/{usuario}/estado', [UsuarioController::class, 'cambiarEstado']);

        Route::apiResource('especialidades', EspecialidadController::class)
            ->parameters(['especialidades' => 'especialidad'])
            ->except('destroy');
        Route::get('/medicos/{medico}/especialidades', [MedicoEspecialidadController::class, 'index']);
        Route::post('/medicos/{medico}/especialidades', [MedicoEspecialidadController::class, 'store']);
        Route::delete(
            '/medicos/{medico}/especialidades/{especialidad}',
            [MedicoEspecialidadController::class, 'destroy'],
        );

        // HU-34 — los horarios los configura el administrador.
        Route::get('/medicos/{medico}/horarios', [HorarioMedicoController::class, 'index']);
        Route::post('/medicos/{medico}/horarios', [HorarioMedicoController::class, 'store']);
        Route::put('/medicos/{medico}/horarios', [HorarioMedicoController::class, 'sincronizar']);
        Route::put('/horarios/{horario}', [HorarioMedicoController::class, 'update']);
        Route::delete('/horarios/{horario}', [HorarioMedicoController::class, 'destroy']);
    });

    Route::middleware('role:ADMINISTRADOR,RECEPCIONISTA')->group(function () {
        Route::get('/catalogo/especialidades', [CatalogoEspecialidadController::class, 'index']);
        Route::get('/medicos', [UsuarioController::class, 'medicos']);

        // HU-35 — bloqueo de agenda por ausencia del médico.
        Route::get('/bloqueos', [BloqueoAgendaController::class, 'index']);
        Route::post('/bloqueos', [BloqueoAgendaController::class, 'store']);
        Route::delete('/bloqueos/{bloqueo}', [BloqueoAgendaController::class, 'destroy']);

        // HU-13, HU-14, HU-43 — cancelar, reprogramar y orden de atención.
        Route::patch('/citas/{cita}/cancelar', [CitaController::class, 'cancelar']);
        Route::patch('/citas/{cita}/reprogramar', [CitaController::class, 'reprogramar']);
        Route::patch('/citas/{cita}/llegada', [CitaController::class, 'registrarLlegada']);
        Route::patch('/citas/{cita}/mover-al-final', [CitaController::class, 'moverAlFinal']);

        // HU-37 — corre las citas pendientes cuando el médico llega tarde.
        Route::patch(
            '/medicos/{medico}/agenda/desplazar',
            [CitaController::class, 'desplazarPorAtraso'],
        );
    });

    // HU-10, HU-11, HU-12, HU-15, HU-16 — el médico consulta y agenda en su
    // propia agenda; el filtrado por rol ocurre en el controlador.
    Route::get('/citas', [CitaController::class, 'index']);
    Route::post('/citas', [CitaController::class, 'store']);
    Route::get('/agenda/disponibilidad', [CitaController::class, 'disponibilidad']);
});
