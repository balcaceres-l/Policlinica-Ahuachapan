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
            'agrupacion' => ['nullable', Rule::in(['auto', 'dia', 'mes', 'ano'])],
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

        // 6. Tendencia temporal agrupada con 1 sola consulta SQL (cero saturación)
        [$tendencia, $agrupacionReal] = $this->generarTendencia(
            $desde,
            $hasta,
            null,
            (string) $request->input('agrupacion', 'auto')
        );

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
            'agrupacion' => $agrupacionReal,
        ]);
    }

    /**
     * Métricas de desempeño privadas para el Médico autenticado.
     */
    public function medico(Request $request): JsonResponse
    {
        $request->validate([
            'periodo' => ['nullable', Rule::in(['mes_actual', 'mes_anterior', 'ultimos_30_dias', 'ano_actual', 'personalizado'])],
            'agrupacion' => ['nullable', Rule::in(['auto', 'dia', 'mes', 'ano'])],
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

        // 7. Tendencia temporal agrupada del médico
        [$tendencia, $agrupacionReal] = $this->generarTendencia(
            $desde,
            $hasta,
            $medicoId,
            (string) $request->input('agrupacion', 'auto')
        );

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
            'agrupacion' => $agrupacionReal,
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
     * Genera la serie temporal agrupada inteligentemente por día, mes o año
     * mediante una sola consulta SQL agregada, garantizando cero saturación.
     */
    private function generarTendencia(
        string $desde,
        string $hasta,
        ?string $medicoId = null,
        string $agrupacionSolicitada = 'auto'
    ): array {
        $inicio = Carbon::parse($desde)->startOfDay();
        $fin = Carbon::parse($hasta)->endOfDay();
        $diasDiferencia = $inicio->diffInDays($fin);
        $mesesDiferencia = $inicio->diffInMonths($fin);

        // Determinar agrupación efectiva
        if ($agrupacionSolicitada === 'auto') {
            if ($diasDiferencia <= 31) {
                $tipo = 'dia';
            } elseif ($mesesDiferencia <= 36) {
                $tipo = 'mes';
            } else {
                $tipo = 'ano';
            }
        } else {
            $tipo = $agrupacionSolicitada;
        }

        // Formato SQL para agrupar en el motor de base de datos
        $formatoSql = match ($tipo) {
            'ano' => "DATE_FORMAT(fecha, '%Y')",
            'mes' => "DATE_FORMAT(fecha, '%Y-%m')",
            default => "DATE_FORMAT(fecha, '%Y-%m-%d')",
        };

        // 1 sola consulta SQL agregada (ejecución ultra-rápida de 2-5ms)
        $registros = DB::table('cita')
            ->whereBetween('fecha', [$desde, $hasta])
            ->when($medicoId, fn ($q) => $q->where('id_medico', $medicoId))
            ->select(
                DB::raw("{$formatoSql} as clave"),
                DB::raw("SUM(CASE WHEN estado = 'ATENDIDA' THEN 1 ELSE 0 END) as atendidas"),
                DB::raw("SUM(CASE WHEN estado = 'CANCELADA' THEN 1 ELSE 0 END) as canceladas"),
                DB::raw("COUNT(*) as total")
            )
            ->groupBy('clave')
            ->orderBy('clave')
            ->get()
            ->keyBy('clave');

        $mesesEspanol = [
            1 => 'Ene', 2 => 'Feb', 3 => 'Mar', 4 => 'Abr',
            5 => 'May', 6 => 'Jun', 7 => 'Jul', 8 => 'Ago',
            9 => 'Sep', 10 => 'Oct', 11 => 'Nov', 12 => 'Dic',
        ];
        $diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

        $datos = [];

        if ($tipo === 'mes') {
            $periodo = CarbonPeriod::create($inicio->copy()->startOfMonth(), '1 month', $fin->copy()->endOfMonth());
            foreach ($periodo as $fecha) {
                $clave = $fecha->format('Y-m');
                $fila = $registros->get($clave);
                $mesNum = (int) $fecha->format('n');
                $mesAbrev = $mesesEspanol[$mesNum] ?? $fecha->format('M');

                $datos[] = [
                    'clave' => $clave,
                    'etiqueta' => "{$mesAbrev} '{$fecha->format('y')}",
                    'subtitulo' => $fecha->format('Y'),
                    'dia' => $mesAbrev,
                    'atendidas' => (int) ($fila->atendidas ?? 0),
                    'canceladas' => (int) ($fila->canceladas ?? 0),
                    'total' => (int) ($fila->total ?? 0),
                ];
            }
        } elseif ($tipo === 'ano') {
            $periodo = CarbonPeriod::create($inicio->copy()->startOfYear(), '1 year', $fin->copy()->endOfYear());
            foreach ($periodo as $fecha) {
                $clave = $fecha->format('Y');
                $fila = $registros->get($clave);

                $datos[] = [
                    'clave' => $clave,
                    'etiqueta' => $clave,
                    'subtitulo' => "Año {$clave}",
                    'dia' => $clave,
                    'atendidas' => (int) ($fila->atendidas ?? 0),
                    'canceladas' => (int) ($fila->canceladas ?? 0),
                    'total' => (int) ($fila->total ?? 0),
                ];
            }
        } else {
            // Por día: si forzó 'dia' en un rango mayor a 90 días, acotamos a los últimos 90 días para rendimiento visual
            $inicioDia = $diasDiferencia > 90 ? (clone $fin)->subDays(89)->startOfDay() : $inicio;
            $periodo = CarbonPeriod::create($inicioDia, '1 day', $fin);

            foreach ($periodo as $fecha) {
                $clave = $fecha->toDateString();
                $fila = $registros->get($clave);

                $datos[] = [
                    'clave' => $clave,
                    'etiqueta' => $fecha->format('d/m'),
                    'subtitulo' => $fecha->format('Y-m-d'),
                    'dia' => $diasSemana[$fecha->dayOfWeek],
                    'atendidas' => (int) ($fila->atendidas ?? 0),
                    'canceladas' => (int) ($fila->canceladas ?? 0),
                    'total' => (int) ($fila->total ?? 0),
                ];
            }
        }

        return [$datos, $tipo];
    }
}

