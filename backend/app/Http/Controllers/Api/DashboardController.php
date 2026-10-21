<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Controllers\Controller;
use App\Models\cita;
use App\Models\consulta;
use App\Models\paciente;
use App\Models\receta_medica;
use App\Models\User;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class DashboardController extends Controller
{
    use RespondsWithJson;

    /**
     * Resumen estadístico y KPIs para el Administrador.
     */
    public function admin(Request $request): JsonResponse
    {
        $request->validate([
            'periodo' => ['nullable', Rule::in(['mes_actual', 'mes_anterior', 'ultimos_30_dias', 'ano_actual', 'personalizado'])],
            'desde' => ['nullable', 'date_format:Y-m-d'],
            'hasta' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:desde'],
        ]);

        [$desde, $hasta, $periodoNombre] = $this->resolverRango($request);

        // 1. Citas en el rango
        $citasPorEstadoRaw = cita::query()
            ->whereBetween('fecha', [$desde, $hasta])
            ->select('estado', DB::raw('count(*) as total'))
            ->groupBy('estado')
            ->pluck('total', 'estado')
            ->toArray();

        $citasPorEstado = [
            'ATENDIDA' => (int) ($citasPorEstadoRaw['ATENDIDA'] ?? 0),
            'AGENDADA' => (int) ($citasPorEstadoRaw['AGENDADA'] ?? 0),
            'EN_ESPERA' => (int) ($citasPorEstadoRaw['EN_ESPERA'] ?? 0),
            'EN_ATENCION' => (int) ($citasPorEstadoRaw['EN_ATENCION'] ?? 0),
            'CANCELADA' => (int) ($citasPorEstadoRaw['CANCELADA'] ?? 0),
            'NO_ASISTIO' => (int) ($citasPorEstadoRaw['NO_ASISTIO'] ?? 0),
        ];

        $totalCitas = array_sum($citasPorEstado);
        $consultasAtendidas = $citasPorEstado['ATENDIDA'];
        $citasConcluidas = $consultasAtendidas + $citasPorEstado['CANCELADA'] + $citasPorEstado['NO_ASISTIO'];
        $tasaEfectividad = $citasConcluidas > 0
            ? round(($consultasAtendidas / $citasConcluidas) * 100, 1)
            : 100.0;

        // 2. Ingresos estimados (suma de total o precio fijado por médicos)
        $ingresosEstimados = (float) consulta::query()
            ->whereHas('cita', function ($q) use ($desde, $hasta) {
                $q->whereBetween('fecha', [$desde, $hasta])
                  ->where('estado', 'ATENDIDA');
            })
            ->selectRaw('COALESCE(SUM(COALESCE(total, precio, 0)), 0) as total_ingresos')
            ->value('total_ingresos');

        // 3. Pacientes y Médicos
        $pacientesNuevos = paciente::query()
            ->whereBetween('fecha_registro', ["{$desde} 00:00:00", "{$hasta} 23:59:59"])
            ->count();
        $pacientesTotal = paciente::query()->count();
        $medicosActivos = User::query()
            ->where('rol', 'MEDICO')
            ->where('estado', 'ACTIVO')
            ->count();

        // 4. Especialidades más demandadas
        $especialidadesDemandadas = DB::table('cita')
            ->join('especialidades', 'cita.id_especialidad', '=', 'especialidades.id')
            ->whereBetween('cita.fecha', [$desde, $hasta])
            ->select(
                'especialidades.id',
                'especialidades.nombre',
                DB::raw('count(*) as total')
            )
            ->groupBy('especialidades.id', 'especialidades.nombre')
            ->orderByDesc('total')
            ->limit(5)
            ->get()
            ->map(fn ($esp) => [
                'id' => $esp->id,
                'nombre' => $esp->nombre,
                'total' => (int) $esp->total,
                'porcentaje' => $totalCitas > 0 ? round(((int) $esp->total / $totalCitas) * 100, 1) : 0,
            ]);

        // 5. Médicos con mayor volumen de atenciones (solo volumen de consultas, sin montos individuales)
        $topMedicos = DB::table('cita')
            ->join('users', 'cita.id_medico', '=', 'users.id')
            ->whereBetween('cita.fecha', [$desde, $hasta])
            ->where('cita.estado', 'ATENDIDA')
            ->select(
                'users.id',
                'users.nombre_completo',
                'users.jvpm',
                DB::raw('count(cita.id_cita) as consultas_atendidas')
            )
            ->groupBy('users.id', 'users.nombre_completo', 'users.jvpm')
            ->orderByDesc('consultas_atendidas')
            ->limit(5)
            ->get()
            ->map(fn ($m) => [
                'id' => $m->id,
                'nombre_completo' => $m->nombre_completo,
                'jvpm' => $m->jvpm,
                'consultas_atendidas' => (int) $m->consultas_atendidas,
            ]);

        // 6. Tendencia diaria (últimos 7 a 14 días según el rango)
        $tendencia = $this->generarTendenciaDiaria($desde, $hasta);

        return $this->success([
            'rango' => [
                'desde' => $desde,
                'hasta' => $hasta,
                'periodo' => $periodoNombre,
            ],
            'kpis' => [
                'consultas_atendidas' => $consultasAtendidas,
                'total_citas' => $totalCitas,
                'tasa_efectividad' => $tasaEfectividad,
                'ingresos_estimados' => $ingresosEstimados,
                'pacientes_nuevos' => $pacientesNuevos,
                'pacientes_total' => $pacientesTotal,
                'medicos_activos' => $medicosActivos,
            ],
            'citas_por_estado' => $citasPorEstado,
            'especialidades_demandadas' => $especialidadesDemandadas,
            'top_medicos' => $topMedicos,
            'tendencia' => $tendencia,
        ]);
    }

    /**
     * Métricas de desempeño privadas para el Médico autenticado.
     */
    public function medico(Request $request): JsonResponse
    {
        $request->validate([
            'periodo' => ['nullable', Rule::in(['mes_actual', 'mes_anterior', 'ultimos_30_dias', 'ano_actual', 'personalizado'])],
            'desde' => ['nullable', 'date_format:Y-m-d'],
            'hasta' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:desde'],
        ]);

        $medicoId = $request->user()->id;
        [$desde, $hasta, $periodoNombre] = $this->resolverRango($request);
        $hoy = now()->toDateString();

        // 1. Citas del médico en el rango
        $citasPorEstadoRaw = cita::query()
            ->where('id_medico', $medicoId)
            ->whereBetween('fecha', [$desde, $hasta])
            ->select('estado', DB::raw('count(*) as total'))
            ->groupBy('estado')
            ->pluck('total', 'estado')
            ->toArray();

        $citasPorEstado = [
            'ATENDIDA' => (int) ($citasPorEstadoRaw['ATENDIDA'] ?? 0),
            'AGENDADA' => (int) ($citasPorEstadoRaw['AGENDADA'] ?? 0),
            'EN_ESPERA' => (int) ($citasPorEstadoRaw['EN_ESPERA'] ?? 0),
            'EN_ATENCION' => (int) ($citasPorEstadoRaw['EN_ATENCION'] ?? 0),
            'CANCELADA' => (int) ($citasPorEstadoRaw['CANCELADA'] ?? 0),
            'NO_ASISTIO' => (int) ($citasPorEstadoRaw['NO_ASISTIO'] ?? 0),
        ];

        $totalCitas = array_sum($citasPorEstado);
        $consultasAtendidas = $citasPorEstado['ATENDIDA'];
        $citasConcluidas = $consultasAtendidas + $citasPorEstado['CANCELADA'] + $citasPorEstado['NO_ASISTIO'];
        $tasaAsistencia = $citasConcluidas > 0
            ? round(($consultasAtendidas / $citasConcluidas) * 100, 1)
            : 100.0;

        // 2. Operativa de hoy
        $citasHoy = cita::query()
            ->where('id_medico', $medicoId)
            ->whereDate('fecha', $hoy)
            ->count();
        $pacientesEnEsperaHoy = cita::query()
            ->where('id_medico', $medicoId)
            ->whereDate('fecha', $hoy)
            ->where('estado', 'EN_ESPERA')
            ->count();
        $atendidosHoy = cita::query()
            ->where('id_medico', $medicoId)
            ->whereDate('fecha', $hoy)
            ->where('estado', 'ATENDIDA')
            ->count();

        // 3. Tiempo promedio por consulta (minutos)
        $tiempoPromedioSeg = (float) consulta::query()
            ->where('id_medico', $medicoId)
            ->whereHas('cita', function ($q) use ($desde, $hasta) {
                $q->whereBetween('fecha', [$desde, $hasta])
                  ->where('estado', 'ATENDIDA');
            })
            ->where('segundos_transcurridos', '>', 0)
            ->avg('segundos_transcurridos');

        $tiempoPromedioMin = $tiempoPromedioSeg > 0
            ? round($tiempoPromedioSeg / 60, 1)
            : 0;

        // 4. Honorarios / Total recaudado en sus consultas
        $ingresosGenerados = (float) consulta::query()
            ->where('id_medico', $medicoId)
            ->whereHas('cita', function ($q) use ($desde, $hasta) {
                $q->whereBetween('fecha', [$desde, $hasta])
                  ->where('estado', 'ATENDIDA');
            })
            ->selectRaw('COALESCE(SUM(COALESCE(total, precio, 0)), 0) as total_ingresos')
            ->value('total_ingresos');

        // 5. Total de recetas emitidas
        $totalRecetas = receta_medica::query()
            ->whereHas('consulta', function ($q) use ($medicoId, $desde, $hasta) {
                $q->where('id_medico', $medicoId)
                  ->whereHas('cita', function ($c) use ($desde, $hasta) {
                      $c->whereBetween('fecha', [$desde, $hasta]);
                  });
            })
            ->count();

        // 6. Top 5 diagnósticos CIE-11 más frecuentes de este médico
        $topDiagnosticos = DB::table('diagnostico')
            ->join('consulta', 'diagnostico.id_consulta', '=', 'consulta.id_consulta')
            ->join('cita', 'consulta.id_cita', '=', 'cita.id_cita')
            ->where('cita.id_medico', $medicoId)
            ->whereBetween('cita.fecha', [$desde, $hasta])
            ->select(
                DB::raw('COALESCE(diagnostico.codigo_cie11, "TEXTO_LIBRE") as codigo'),
                'diagnostico.descripcion',
                DB::raw('count(*) as total')
            )
            ->groupBy('codigo', 'diagnostico.descripcion')
            ->orderByDesc('total')
            ->limit(5)
            ->get()
            ->map(fn ($d) => [
                'codigo' => $d->codigo,
                'descripcion' => $d->descripcion,
                'total' => (int) $d->total,
            ]);

        // 7. Tendencia diaria del médico
        $tendencia = $this->generarTendenciaDiaria($desde, $hasta, $medicoId);

        return $this->success([
            'rango' => [
                'desde' => $desde,
                'hasta' => $hasta,
                'periodo' => $periodoNombre,
            ],
            'kpis' => [
                'consultas_atendidas' => $consultasAtendidas,
                'total_citas' => $totalCitas,
                'tasa_asistencia' => $tasaAsistencia,
                'tiempo_promedio_min' => $tiempoPromedioMin,
                'ingresos_generados' => $ingresosGenerados,
                'total_recetas' => $totalRecetas,
                'citas_hoy' => $citasHoy,
                'en_espera_hoy' => $pacientesEnEsperaHoy,
                'atendidos_hoy' => $atendidosHoy,
            ],
            'citas_por_estado' => $citasPorEstado,
            'top_diagnosticos_cie11' => $topDiagnosticos,
            'tendencia' => $tendencia,
        ]);
    }

    /**
     * Resuelve las fechas de inicio y fin del periodo solicitado.
     */
    private function resolverRango(Request $request): array
    {
        $periodo = $request->input('periodo', 'mes_actual');

        if ($periodo === 'mes_anterior') {
            $inicio = Carbon::now()->subMonthNoOverflow()->startOfMonth();
            $fin = Carbon::now()->subMonthNoOverflow()->endOfMonth();
            return [$inicio->toDateString(), $fin->toDateString(), 'Mes anterior'];
        }

        if ($periodo === 'ultimos_30_dias') {
            $inicio = Carbon::now()->subDays(29)->startOfDay();
            $fin = Carbon::now()->endOfDay();
            return [$inicio->toDateString(), $fin->toDateString(), 'Últimos 30 días'];
        }

        if ($periodo === 'ano_actual') {
            $inicio = Carbon::now()->startOfYear();
            $fin = Carbon::now()->endOfYear();
            return [$inicio->toDateString(), $fin->toDateString(), 'Año actual'];
        }

        if ($periodo === 'personalizado' && $request->filled('desde') && $request->filled('hasta')) {
            return [$request->input('desde'), $request->input('hasta'), 'Personalizado'];
        }

        // Por defecto: mes en curso
        $inicio = Carbon::now()->startOfMonth();
        $fin = Carbon::now()->endOfMonth();
        return [$inicio->toDateString(), $fin->toDateString(), 'Mes actual'];
    }

    /**
     * Genera una serie temporal agrupada por días (máximo 14 días para visualización clara).
     */
    private function generarTendenciaDiaria(string $desde, string $hasta, ?string $medicoId = null): array
    {
        $inicio = Carbon::parse($desde);
        $fin = Carbon::parse($hasta);

        // Si el rango es mayor a 14 días, tomamos los últimos 14 días hasta $hasta
        if ($inicio->diffInDays($fin) > 14) {
            $inicio = (clone $fin)->subDays(13);
        }

        $periodo = CarbonPeriod::create($inicio, $fin);
        $diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

        $datos = [];
        foreach ($periodo as $fecha) {
            $fechaStr = $fecha->toDateString();

            $query = cita::query()
                ->whereDate('fecha', $fechaStr)
                ->when($medicoId, fn ($q) => $q->where('id_medico', $medicoId));

            $atendidas = (clone $query)->where('estado', 'ATENDIDA')->count();
            $canceladas = (clone $query)->where('estado', 'CANCELADA')->count();
            $total = (clone $query)->count();

            $datos[] = [
                'fecha' => $fechaStr,
                'dia' => $diasSemana[$fecha->dayOfWeek],
                'etiqueta' => $fecha->format('d/m'),
                'atendidas' => $atendidas,
                'canceladas' => $canceladas,
                'total' => $total,
            ];
        }

        return $datos;
    }
}
