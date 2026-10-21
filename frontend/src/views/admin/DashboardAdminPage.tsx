import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDashboardAdmin } from '@/hooks/dashboard/useDashboard';
import type { PeriodoFiltro } from '@/types/dashboard.types';
import KpiCard from '@/components/dashboard/KpiCard';
import SelectorPeriodo from '@/components/dashboard/SelectorPeriodo';
import GraficoTendencia from '@/components/dashboard/GraficoTendencia';
import EstadoCitasGrid from '@/components/dashboard/EstadoCitasGrid';
import TopListaCard, { type ItemTopLista } from '@/components/dashboard/TopListaCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export const DashboardAdminPage: React.FC = () => {
  const [periodo, setPeriodo] = useState<PeriodoFiltro>('mes_actual');
  const [desde, setDesde] = useState<string | undefined>();
  const [hasta, setHasta] = useState<string | undefined>();

  const { data, isLoading, isError, refetch } = useDashboardAdmin({
    periodo,
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
        <LoadingSpinner label="Cargando estadísticas de la clínica..." />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-card border border-rose-200 bg-rose-50 p-6 text-center text-rose-800">
        <i className="ri-error-warning-line text-3xl" />
        <h3 className="mt-2 text-base font-bold">Error al cargar estadísticas</h3>
        <p className="mt-1 text-xs text-rose-600">
          No se pudieron consultar los datos del panel administrativo.
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

  const { kpis, citas_por_estado, especialidades_demandadas, top_medicos, tendencia, rango } =
    data;

  // Adaptar especialidades para TopListaCard
  const itemsEspecialidades: ItemTopLista[] = especialidades_demandadas.map((esp) => ({
    id: esp.id,
    titulo: esp.nombre,
    valor: esp.total,
    etiquetaValor: 'citas',
    porcentaje: esp.porcentaje,
  }));

  // Adaptar top médicos para TopListaCard
  const maxConsultas = Math.max(...top_medicos.map((m) => m.consultas_atendidas), 1);
  const itemsTopMedicos: ItemTopLista[] = top_medicos.map((m) => ({
    id: m.id,
    titulo: m.nombre_completo,
    badge: m.jvpm ? `JVPM ${m.jvpm}` : undefined,
    valor: `$${m.total_ingresos.toFixed(2)}`,
    subtitulo: `${m.consultas_atendidas} consultas atendidas`,
    etiquetaValor: 'USD',
    porcentaje: Math.round((m.consultas_atendidas / maxConsultas) * 100),
  }));

  return (
    <div className="space-y-6">
      {/* Cabecera y acciones */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-ink">
              Dashboard Administrativo
            </h1>
            <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
              {rango.periodo}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted">
            Métricas de rendimiento clínico, citas y volumen de atención general
          </p>
        </div>

        {/* Accesos rápidos */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/admin/usuarios"
            className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink shadow-xs transition-colors hover:bg-canvas"
          >
            <i className="ri-group-line text-brand-600" />
            Usuarios
          </Link>
          <Link
            to="/admin/especialidades"
            className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink shadow-xs transition-colors hover:bg-canvas"
          >
            <i className="ri-stethoscope-line text-brand-600" />
            Especialidades
          </Link>
          <Link
            to="/admin/horarios"
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-brand-700"
          >
            <i className="ri-time-line" />
            Horarios Médicos
          </Link>
        </div>
      </div>

      {/* Barra de Filtro de Periodo */}
      <SelectorPeriodo
        periodoActual={periodo}
        desde={desde}
        hasta={hasta}
        onChange={handleCambiarPeriodo}
      />

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          titulo="Consultas Atendidas"
          valor={kpis.consultas_atendidas}
          subtexto={`De un total de ${kpis.total_citas} citas agendadas`}
          icono="ri-calendar-check-line"
          color="success"
          tendencia={{
            texto: `${kpis.tasa_efectividad}% efectividad`,
            positiva: kpis.tasa_efectividad >= 75,
          }}
        />

        <KpiCard
          titulo="Facturación Estimada"
          valor={`$${kpis.ingresos_estimados.toFixed(2)}`}
          subtexto="Ingresos fijados por médicos en consultas"
          icono="ri-money-dollar-circle-line"
          color="brand"
        />

        <KpiCard
          titulo="Nuevos Pacientes"
          valor={kpis.pacientes_nuevos}
          subtexto={`${kpis.pacientes_total} pacientes en el padrón`}
          icono="ri-user-heart-line"
          color="info"
        />

        <KpiCard
          titulo="Médicos Activos"
          valor={kpis.medicos_activos}
          subtexto="Disponibles en el sistema"
          icono="ri-nurse-line"
          color="royal"
        />
      </div>

      {/* Grilla Principal de Gráficos y Listados */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Columna Izquierda: Tendencia y Estados (2 cols) */}
        <div className="space-y-6 lg:col-span-2">
          <GraficoTendencia
            titulo="Tendencia de Citas"
            subtitulo="Comportamiento diario de citas atendidas y canceladas"
            datos={tendencia}
          />

          <EstadoCitasGrid estados={citas_por_estado} />
        </div>

        {/* Columna Derecha: Top Especialidades y Top Médicos (1 col) */}
        <div className="space-y-6">
          <TopListaCard
            titulo="Especialidades Más Demandadas"
            subtitulo="Por volumen de citas en el periodo"
            items={itemsEspecialidades}
            icono="ri-pie-chart-line"
            mensajeVacio="No hay citas agendadas en este periodo."
          />

          <TopListaCard
            titulo="Atención por Médico"
            subtitulo="Consultas atendidas y recaudación"
            items={itemsTopMedicos}
            icono="ri-medal-line"
            mensajeVacio="No hay consultas finalizadas en este periodo."
          />
        </div>
      </div>
    </div>
  );
};

export default DashboardAdminPage;
