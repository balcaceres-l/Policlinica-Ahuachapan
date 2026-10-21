import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDashboardMedico } from '@/hooks/dashboard/useDashboard';
import type { PeriodoFiltro, TipoAgrupacion } from '@/types/dashboard.types';
import KpiCard from '@/components/dashboard/KpiCard';
import SelectorPeriodo from '@/components/dashboard/SelectorPeriodo';
import GraficoTendencia from '@/components/dashboard/GraficoTendencia';
import EstadoCitasGrid from '@/components/dashboard/EstadoCitasGrid';
import TopListaCard, { type ItemTopLista } from '@/components/dashboard/TopListaCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export const DashboardMedicoPage: React.FC = () => {
  const [periodo, setPeriodo] = useState<PeriodoFiltro>('mes_actual');
  const [agrupacion, setAgrupacion] = useState<TipoAgrupacion>('auto');
  const [desde, setDesde] = useState<string | undefined>();
  const [hasta, setHasta] = useState<string | undefined>();

  const { data, isLoading, isError, refetch } = useDashboardMedico({
    periodo,
    agrupacion,
    desde,
    hasta,
  });

  const handleCambiarPeriodo = (
    nuevoPeriodo: PeriodoFiltro,
    nuevaDesde?: string,
    nuevaHasta?: string,
  ) => {
    setPeriodo(nuevoPeriodo);
    setDesde(nuevaDesde);
    setHasta(nuevaHasta);
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner label="Cargando tu rendimiento clínico..." />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-card border border-rose-200 bg-rose-50 p-6 text-center text-rose-800">
        <i className="ri-error-warning-line text-3xl" />
        <h3 className="mt-2 text-base font-bold">Error al cargar estadísticas</h3>
        <p className="mt-1 text-xs text-rose-600">
          No se pudieron consultar tus métricas individuales de atención.
        </p>
        <button
          onClick={() => refetch()}
          className="mt-4 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const { kpis, citas_por_estado, top_diagnosticos_cie11, tendencia, rango } = data;

  // Adaptar diagnósticos CIE-11 para TopListaCard
  const maxDx = Math.max(...top_diagnosticos_cie11.map((d) => d.total), 1);
  const itemsDiagnosticos: ItemTopLista[] = top_diagnosticos_cie11.map((dx) => ({
    titulo: dx.descripcion,
    badge: dx.codigo !== 'TEXTO_LIBRE' ? dx.codigo : 'Texto libre',
    valor: dx.total,
    etiquetaValor: dx.total === 1 ? 'paciente' : 'pacientes',
    porcentaje: Math.round((dx.total / maxDx) * 100),
  }));

  return (
    <div className="space-y-6">
      {/* Cabecera y accesos rápidos */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-ink">
              Mis Estadísticas y Rendimiento
            </h1>
            <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
              {rango.periodo}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted">
            Métricas personales de tus consultas, diagnósticos CIE-11 y tiempos de atención
          </p>
        </div>

        {/* Accesos rápidos */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/medico/sala-espera"
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-brand-700"
          >
            <i className="ri-user-received-2-line" />
            Sala de Espera
          </Link>
          <Link
            to="/medico/citas"
            className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink shadow-xs transition-colors hover:bg-canvas"
          >
            <i className="ri-calendar-check-line text-brand-600" />
            Mis Citas
          </Link>
          <Link
            to="/medico/horarios"
            className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink shadow-xs transition-colors hover:bg-canvas"
          >
            <i className="ri-calendar-schedule-line text-brand-600" />
            Mi Horario
          </Link>
        </div>
      </div>

      {/* Banner de Jornada de Hoy */}
      <div className="flex flex-col gap-3 rounded-card border border-brand-200 bg-brand-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-xs">
            <i className="ri-sun-line text-xl" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-ink">Jornada de Hoy</h2>
            <p className="text-xs text-muted">Resumen en vivo de tu agenda del día</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-surface px-3 py-1.5 border border-line shadow-xs">
            <span className="text-xs font-medium text-muted">Programadas hoy:</span>
            <span className="font-bold text-ink">{kpis.citas_hoy}</span>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-1.5 border border-amber-200 shadow-xs">
            <span className="text-xs font-medium text-amber-800">En espera:</span>
            <span className="font-bold text-amber-900">{kpis.en_espera_hoy}</span>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1.5 border border-emerald-200 shadow-xs">
            <span className="text-xs font-medium text-emerald-800">Atendidos hoy:</span>
            <span className="font-bold text-emerald-900">{kpis.atendidos_hoy}</span>
          </div>
        </div>
      </div>

      {/* Selector de Periodo */}
      <SelectorPeriodo
        periodoActual={periodo}
        desde={desde}
        hasta={hasta}
        onChange={handleCambiarPeriodo}
      />

      {/* Tarjetas KPI de Rendimiento */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          titulo="Consultas Finalizadas"
          valor={kpis.consultas_atendidas}
          subtexto={`De ${kpis.total_citas} citas agendadas`}
          icono="ri-stethoscope-line"
          color="success"
          tendencia={{
            texto: `${kpis.tasa_asistencia}% asistencia`,
            positiva: kpis.tasa_asistencia >= 80,
          }}
        />

        <KpiCard
          titulo="Honorarios Generados"
          valor={`$${kpis.ingresos_generados.toFixed(2)}`}
          subtexto="Total fijado en consultas finalizadas"
          icono="ri-money-dollar-circle-line"
          color="brand"
        />

        <KpiCard
          titulo="Tiempo Promedio / Consulta"
          valor={kpis.tiempo_promedio_min > 0 ? `${kpis.tiempo_promedio_min} min` : 'N/D'}
          subtexto="Cronometrado automáticamente"
          icono="ri-timer-line"
          color="info"
        />

        <KpiCard
          titulo="Recetas Médicas"
          valor={kpis.total_recetas}
          subtexto="Emitidas en tus atenciones"
          icono="ri-medicine-bottle-line"
          color="royal"
        />
      </div>

      {/* Grilla Principal de Métricas */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Tendencia y Distribución de sus Citas */}
        <div className="space-y-6 lg:col-span-2">
          <GraficoTendencia
            titulo="Mis Consultas"
            subtitulo={
              data.agrupacion === 'mes'
                ? 'Actividad mensual de atención a pacientes'
                : data.agrupacion === 'ano'
                  ? 'Actividad anual de atención a pacientes'
                  : 'Actividad diaria de atención a pacientes'
            }
            datos={tendencia}
            agrupacionActiva={data.agrupacion}
            agrupacionSeleccionada={agrupacion}
            onCambiarAgrupacion={setAgrupacion}
          />

          <EstadoCitasGrid estados={citas_por_estado} />
        </div>

        {/* Top Diagnósticos CIE-11 */}
        <div className="space-y-6">
          <TopListaCard
            titulo="Diagnósticos Más Frecuentes (CIE-11)"
            subtitulo="Clasificación internacional según la OMS"
            items={itemsDiagnosticos}
            icono="ri-survey-line"
            mensajeVacio="Aún no has registrado diagnósticos en este periodo."
          />

          {/* Tarjeta de consejos para el médico */}
          <div className="rounded-card border border-line bg-surface p-5 shadow-card space-y-3">
            <div className="flex items-center gap-2 text-brand-600">
              <i className="ri-lightbulb-line text-lg" />
              <h3 className="text-sm font-bold text-ink">Estándar de Atención</h3>
            </div>
            <p className="text-xs leading-relaxed text-muted">
              La Policlínica Ahuachapaneca sugiere una duración de <strong>20 a 30 minutos</strong> por consulta médica. Tu promedio actual es de{' '}
              <strong className="text-ink">
                {kpis.tiempo_promedio_min > 0 ? `${kpis.tiempo_promedio_min} minutos` : 'tiempo no registrado'}
              </strong>.
            </p>
            <div className="border-t border-line pt-2">
              <Link
                to="/medico/expediente"
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
              >
                Buscar expediente de paciente <i className="ri-arrow-right-line" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardMedicoPage;
