import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/hooks/auth/useAuth';
import { useBloqueos } from '@/hooks/bloqueo/useBloqueos';
import { useEspecialidadesDeMedico } from '@/hooks/especialidad/useEspecialidades';
import { useHorariosDeMedico } from '@/hooks/horario/useHorarios';
import { lapsoDeBloqueo } from '@/lib/bloqueo';
import { DIA_LABEL, DIAS_SEMANA, formatearHora } from '@/lib/constants/dias';
import { getIniciales } from '@/lib/utils';
import type { HorarioMedico } from '@/types/horario.types';

export function MiHorarioPage() {
  const { usuario } = useAuth();
  const medicoId = usuario?.id ?? null;

  const { data: horarios = [], isLoading: cargandoHorarios } = useHorariosDeMedico(medicoId);
  const { data: especialidades = [], isLoading: cargandoEspecialidades } =
    useEspecialidadesDeMedico(medicoId);
  const { data: bloqueos = [], isLoading: cargandoBloqueos } = useBloqueos();

  // Calcular horas trabajadas en un tramo 'HH:mm'
  const calcularHorasTramo = (inicio: string, fin: string): number => {
    const [hIni, mIni] = inicio.split(':').map(Number);
    const [hFin, mFin] = fin.split(':').map(Number);
    const minutos = hFin * 60 + mFin - (hIni * 60 + mIni);
    return Math.max(0, minutos / 60);
  };

  // Métricas del horario del médico
  const metricas = useMemo(() => {
    const diasConHorario = new Set(horarios.map((h) => h.dia_semana));
    let totalHoras = 0;
    for (const h of horarios) {
      totalHoras += calcularHorasTramo(h.hora_inicio, h.hora_fin);
    }
    const citasEstimadas = Math.floor(totalHoras * 2); // Bloques de 30 min

    return {
      diasLaborables: diasConHorario.size,
      totalHoras: totalHoras % 1 === 0 ? totalHoras : totalHoras.toFixed(1),
      citasEstimadas,
    };
  }, [horarios]);

  // Agrupar horarios por día de la semana
  const horariosPorDia = useMemo(() => {
    const mapa = new Map<string, HorarioMedico[]>();
    for (const dia of DIAS_SEMANA) {
      mapa.set(dia, []);
    }
    for (const h of horarios) {
      mapa.get(h.dia_semana)?.push(h);
    }
    for (const [, lista] of mapa) {
      lista.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
    }
    return mapa;
  }, [horarios]);

  const isLoading = cargandoHorarios || cargandoEspecialidades || cargandoBloqueos;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Encabezado y Accesos Rápidos */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-ink">Mi Horario de Atención</h1>
            <Badge variant="royal">Asignado por Administración</Badge>
          </div>
          <p className="mt-1 text-sm text-muted">
            Consulta los turnos y jornadas laborales configuradas para tu atención clínica en la policlínica.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/medico/calendario"
            className="inline-flex items-center gap-1.5 rounded-field border border-line bg-surface px-3.5 py-2 text-xs font-semibold text-brand-700 shadow-xs transition-colors hover:bg-brand-50"
          >
            <i className="ri-calendar-line" />
            Mi Calendario
          </Link>
          <Link
            to="/medico/citas"
            className="inline-flex items-center gap-1.5 rounded-field border border-line bg-surface px-3.5 py-2 text-xs font-semibold text-brand-700 shadow-xs transition-colors hover:bg-brand-50"
          >
            <i className="ri-calendar-check-line" />
            Mis Citas
          </Link>
        </div>
      </div>

      {isLoading && <LoadingSpinner label="Cargando horario asignado..." />}

      {!isLoading && (
        <>
          {/* Tarjeta del Médico y Nota Administrativa */}
          <div className="rounded-card border border-line bg-surface p-5 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand-100 text-lg font-bold text-brand-800">
                  {getIniciales(usuario?.nombreCompleto || 'Dr.')}
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold text-ink">{usuario?.nombreCompleto}</h2>
                    <Badge variant="success">Activo</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    {usuario?.cargo || 'Médico Especialista'}
                    {usuario?.telefono ? ` · Tel: ${usuario.telefono}` : ''}
                  </p>

                  {/* Especialidades asignadas */}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-semibold text-muted">Especialidades:</span>
                    {especialidades.length === 0 ? (
                      <span className="text-xs italic text-muted">Consulta General</span>
                    ) : (
                      especialidades.map((esp) => (
                        <Badge key={esp.id} variant="info">
                          {esp.nombre}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Aviso informativo de administración */}
            <div className="mt-4 flex items-start gap-3 rounded-field border border-blue-100 bg-blue-50/60 p-3.5 text-xs text-blue-900">
              <i className="ri-information-line text-base text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Horario institucional administrado</p>
                <p className="mt-0.5 text-blue-800">
                  Tus horarios son asignados de acuerdo a la planificación médica de la policlínica.
                  Para solicitar reprogramaciones de turnos, ajustes de jornada o permisos especiales,
                  favor comunicarlo con la administración de la clínica.
                </p>
              </div>
            </div>
          </div>

          {/* Tarjetas de Métricas de la Jornada */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-card border border-line bg-surface p-4 shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-muted">Días Laborables</span>
                <span className="flex size-8 items-center justify-center rounded-field bg-brand-50 text-brand-600">
                  <i className="ri-calendar-event-line" />
                </span>
              </div>
              <p className="mt-2 text-2xl font-extrabold text-ink">{metricas.diasLaborables} días</p>
              <p className="mt-0.5 text-xs text-muted">de 7 días por semana</p>
            </div>

            <div className="rounded-card border border-line bg-surface p-4 shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-muted">Carga Semanal</span>
                <span className="flex size-8 items-center justify-center rounded-field bg-emerald-50 text-emerald-600">
                  <i className="ri-time-line" />
                </span>
              </div>
              <p className="mt-2 text-2xl font-extrabold text-ink">{metricas.totalHoras} hrs</p>
              <p className="mt-0.5 text-xs text-muted">horas programadas por semana</p>
            </div>

            <div className="rounded-card border border-line bg-surface p-4 shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-muted">Capacidad Estimada</span>
                <span className="flex size-8 items-center justify-center rounded-field bg-royal-soft text-royal">
                  <i className="ri-stethoscope-line" />
                </span>
              </div>
              <p className="mt-2 text-2xl font-extrabold text-ink">~{metricas.citasEstimadas} citas</p>
              <p className="mt-0.5 text-xs text-muted">bloques regulares de 30 minutos</p>
            </div>
          </div>

          {/* Parrilla Semanal de Horarios (Lunes a Domingo) */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-ink flex items-center gap-2">
              <i className="ri-calendar-schedule-line text-brand-600" />
              Jornada semanal programada
            </h2>

            {horarios.length === 0 ? (
              <div className="rounded-card border border-line bg-surface shadow-card p-6">
                <EmptyState
                  icon="ri-calendar-close-line"
                  title="Sin horarios asignados"
                  message="La administración aún no ha configurado horarios de atención para tu cuenta médica."
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {DIAS_SEMANA.map((dia) => {
                  const tramos = horariosPorDia.get(dia) ?? [];
                  const esLaborable = tramos.length > 0;

                  return (
                    <div
                      key={dia}
                      className={`flex flex-col rounded-card border bg-surface p-4 shadow-card transition-all ${
                        esLaborable
                          ? 'border-brand-200 hover:border-brand-400'
                          : 'border-line/70 bg-canvas/40 opacity-70'
                      }`}
                    >
                      <div className="flex items-center justify-between border-b border-line pb-2.5">
                        <span className="text-sm font-bold text-ink">{DIA_LABEL[dia]}</span>
                        <Badge variant={esLaborable ? 'success' : 'default'} dot={esLaborable}>
                          {esLaborable ? 'Laborable' : 'Día libre'}
                        </Badge>
                      </div>

                      <div className="mt-3 flex-1 space-y-2">
                        {esLaborable ? (
                          tramos.map((t) => {
                            const horas = calcularHorasTramo(t.hora_inicio, t.hora_fin);
                            return (
                              <div
                                key={t.id}
                                className="rounded-field border border-brand-100 bg-brand-50/50 p-2 text-xs font-semibold text-brand-900"
                              >
                                <div className="flex items-center justify-between">
                                  <span>
                                    {formatearHora(t.hora_inicio)} – {formatearHora(t.hora_fin)}
                                  </span>
                                  <span className="text-[10px] text-brand-600">
                                    {horas % 1 === 0 ? horas : horas.toFixed(1)} hrs
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="flex h-16 items-center justify-center text-xs text-muted italic">
                            Sin jornada programada
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Bloqueos o Ausencias Registradas */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-ink flex items-center gap-2">
              <i className="ri-calendar-event-fill text-danger" />
              Bloqueos de agenda y permisos registrados
            </h2>

            {bloqueos.length === 0 ? (
              <div className="rounded-card border border-line bg-surface p-4 shadow-card text-xs text-muted text-center">
                <i className="ri-checkbox-circle-line text-lg text-emerald-600 mr-1.5 align-middle" />
                No tienes bloqueos de agenda ni ausencias programadas en el sistema.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {bloqueos.map((b) => (
                  <div
                    key={b.id}
                    className="rounded-card border border-dashed border-danger/40 bg-danger-soft/30 p-4 text-xs text-ink shadow-xs"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-danger">
                        {b.tipo_bloqueo === 'PARCIAL' ? 'Bloqueo Parcial' : 'Día Completo'}
                      </span>
                      <span className="font-semibold text-muted">{b.fecha}</span>
                    </div>
                    {b.tipo_bloqueo === 'PARCIAL' && (
                      <p className="font-mono text-muted mb-1">{lapsoDeBloqueo(b)}</p>
                    )}
                    <p className="text-muted">
                      <span className="font-semibold text-ink">Motivo:</span> {b.motivo || 'Sin motivo detallado'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default MiHorarioPage;
