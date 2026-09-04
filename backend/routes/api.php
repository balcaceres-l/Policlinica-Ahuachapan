<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CatalogoEspecialidadController;
use App\Http\Controllers\Api\EspecialidadController;
use App\Http\Controllers\Api\MedicoEspecialidadController;
use App\Http\Controllers\Api\UsuarioController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:5,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

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
    });

    Route::middleware('role:ADMINISTRADOR,RECEPCIONISTA')->get(
        '/catalogo/especialidades',
        [CatalogoEspecialidadController::class, 'index'],
    );
});
