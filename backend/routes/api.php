<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BloqueoAgendaController;
use App\Http\Controllers\Api\CatalogoEspecialidadController;
use App\Http\Controllers\Api\Cie11Controller;
use App\Http\Controllers\Api\Cie11ProxyController;
use App\Http\Controllers\Api\CitaController;
use App\Http\Controllers\Api\ConsultaController;
use App\Http\Controllers\Api\DocumentoMedicoController;
use App\Http\Controllers\Api\EspecialidadController;
use App\Http\Controllers\Api\HorarioMedicoController;
use App\Http\Controllers\Api\MedicoEspecialidadController;
use App\Http\Controllers\Api\PacienteController;
use App\Http\Controllers\Api\ResultadoLaboratorioController;
use App\Http\Controllers\Api\SignosVitalesController;
use App\Http\Controllers\Api\UsuarioController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:login');

// HU-44 — proxy hacia la API de la OMS para la herramienta de búsqueda CIE-11. Se
// autentica con el pase de /cie11/pase (no con Sanctum) y agrega el token de la OMS.
Route::match(['GET', 'POST'], '/oms-icd/{ruta}', [Cie11ProxyController::class, 'reenviar'])->where('ruta', '.*');

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
        Route::post('/medicos/{medico}/especialidades', [MedicoEspecialidadController::class, 'store']);
        Route::delete(
            '/medicos/{medico}/especialidades/{especialidad}',
            [MedicoEspecialidadController::class, 'destroy'],
        );
    });

    // HU-34 — horarios: el administrador configura el de cualquier médico; el
    // médico, solo el suyo y sin dejar citas agendadas fuera (ver el controlador).
    Route::middleware('role:ADMINISTRADOR,MEDICO')->group(function () {
        Route::post('/medicos/{medico}/horarios', [HorarioMedicoController::class, 'store']);
        Route::put('/medicos/{medico}/horarios', [HorarioMedicoController::class, 'sincronizar']);
        Route::put('/horarios/{horario}', [HorarioMedicoController::class, 'update']);
        Route::delete('/horarios/{horario}', [HorarioMedicoController::class, 'destroy']);
    });

    // HU-35 — bloqueo de agenda. El médico bloquea la suya solo si no hay citas
    // agendadas en ese lapso; si las hay, lo hace recepción (ver el controlador).
    Route::middleware('role:ADMINISTRADOR,RECEPCIONISTA,MEDICO')->group(function () {
        Route::post('/bloqueos', [BloqueoAgendaController::class, 'store']);
        Route::delete('/bloqueos/{bloqueo}', [BloqueoAgendaController::class, 'destroy']);
    });

    // Consulta de especialidades asignadas a un médico
    Route::get('/medicos/{medico}/especialidades', [MedicoEspecialidadController::class, 'index']);

    // Consulta de horarios asignados a un médico
    Route::get('/medicos/{medico}/horarios', [HorarioMedicoController::class, 'index']);

    // Consulta de bloqueos de agenda (médico ve solo los suyos, admin/recepción ven todos)
    Route::get('/bloqueos', [BloqueoAgendaController::class, 'index']);

    Route::middleware('role:ADMINISTRADOR,RECEPCIONISTA')->group(function () {
        Route::get('/catalogo/especialidades', [CatalogoEspecialidadController::class, 'index']);
        Route::get('/medicos', [UsuarioController::class, 'medicos']);

        // Citas que quedaron dentro de un bloqueo: listarlas y correrlas tras él.
        Route::get('/bloqueos/{bloqueo}/citas-afectadas', [BloqueoAgendaController::class, 'citasAfectadas']);
        Route::patch('/bloqueos/{bloqueo}/correr-citas', [BloqueoAgendaController::class, 'correrCitas']);

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

    // HU-18 — recepción los toma en el triaje y el médico los corrige al atender.
    Route::get('/citas/{cita}/signos-vitales', [SignosVitalesController::class, 'show']);
    Route::put('/citas/{cita}/signos-vitales', [SignosVitalesController::class, 'store']);

    // Pacientes — consulta para personal clínico y recepción.
    // Registrar, editar y marcar fallecido es de RECEPCIONISTA y MEDICO. El médico
    // registra en la consulta inmediata y el paciente queda con datos pendientes.
    Route::get('/pacientes', [PacienteController::class, 'index']);
    Route::get('/pacientes/{paciente}', [PacienteController::class, 'show']);
    Route::get('/pacientes/{paciente}/historial', [PacienteController::class, 'historial']);
    Route::middleware('role:RECEPCIONISTA,MEDICO')->group(function () {
        Route::post('/pacientes', [PacienteController::class, 'store']);
        Route::put('/pacientes/{paciente}', [PacienteController::class, 'update']);
        Route::delete('/pacientes/{paciente}', [PacienteController::class, 'destroy']);
    });

    // HU-44 — bloque y capítulo de un diagnóstico guardado (reportes, expediente).
    Route::get('/cie11/jerarquia', [Cie11Controller::class, 'jerarquia']);

    // HU-23 — el expediente es compartido: médicos y recepción consultan los
    // resultados de laboratorio. Registrarlos (HU-41) es del médico.
    Route::middleware('role:MEDICO,RECEPCIONISTA')->group(function () {
        Route::get('/pacientes/{paciente}/laboratorio', [ResultadoLaboratorioController::class, 'porPaciente']);
        Route::get('/laboratorio/{resultado}/archivo', [ResultadoLaboratorioController::class, 'archivo']);
    });
    Route::middleware('role:MEDICO')->group(function () {
        Route::get('/laboratorio', [ResultadoLaboratorioController::class, 'index']);
        Route::post('/pacientes/{paciente}/laboratorio', [ResultadoLaboratorioController::class, 'store']);
        Route::delete('/laboratorio/{resultado}', [ResultadoLaboratorioController::class, 'destroy']);

        // HU-44 — buscador CIE-11: pase de corta duración para el proxy y versión vigente.
        Route::get('/cie11/pase', [Cie11Controller::class, 'pase'])->middleware('throttle:30,1');
        Route::get('/cie11/configuracion', [Cie11Controller::class, 'configuracion']);
    });

    // HU-39 — el médico abre la consulta eligiendo con qué especialidad atiende.
    Route::middleware('role:MEDICO')->group(function () {
        Route::get(
            '/consultas/especialidades-disponibles',
            [ConsultaController::class, 'especialidadesDisponibles'],
        );
        Route::get('/medico/sala-espera', [ConsultaController::class, 'salaEspera']);
        Route::post('/citas/{cita}/consulta', [ConsultaController::class, 'store']);
        // Consulta inmediata: atender sin cita previa.
        Route::post('/medico/consulta-inmediata', [ConsultaController::class, 'inmediata']);
        Route::get('/consultas/{consulta}', [ConsultaController::class, 'show']);
        Route::put('/consultas/{consulta}', [ConsultaController::class, 'update']);
        Route::patch('/consultas/{consulta}/finalizar', [ConsultaController::class, 'finalizar']);

        // HU-31, HU-32 — constancia y referencia desde la consulta.
        Route::post('/consultas/{consulta}/constancias', [DocumentoMedicoController::class, 'crearConstancia']);
        Route::post('/consultas/{consulta}/referencias', [DocumentoMedicoController::class, 'crearReferencia']);
        Route::get('/referencias/medicos-destino', [DocumentoMedicoController::class, 'medicosDestino']);
    });

    // HU-33 — médico y recepcionista imprimen o descargan los documentos en PDF.
    Route::middleware('role:MEDICO,RECEPCIONISTA')->group(function () {
        Route::get('/consultas/{consulta}/receta/pdf', [DocumentoMedicoController::class, 'pdfReceta']);
        Route::get('/constancias/{constancia}/pdf', [DocumentoMedicoController::class, 'pdfConstancia']);
        Route::get('/referencias/{referencia}/pdf', [DocumentoMedicoController::class, 'pdfReferencia']);
    });
});
