import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AgendarCitaModal from '@/components/cita/AgendarCitaModal';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/hooks/auth/useAuth';
import { useBloqueos } from '@/hooks/bloqueo/useBloqueos';
import { useCitas } from '@/hooks/cita/useCitas';
import { useEspecialidadesDeMedico } from '@/hooks/especialidad/useEspecialidades';
import { lapsoDeBloqueo } from '@/lib/bloqueo';
import { obtenerFechaLocal } from '@/lib/utils';
import { ESTADO_CITA_LABEL, TIPO_CITA_LABEL, type EstadoCita } from '@/types/cita.types';

type ModoVista = 'dia' | 'semana' | 'mes';

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const DIAS_SEMANA_ABR = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export function CalendarioPage() {
  const { usuario } = useAuth();
  const hoyStr = useMemo(() => obtenerFechaLocal(), []);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(hoyStr);
  const [modoVista, setModoVista] = useState<ModoVista>('semana');
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoCita | 'TODOS'>('TODOS');
  const [especialidadFiltro, setEspecialidadFiltro] = useState<string | 'TODAS'>('TODAS');

  const [modalAgendar, setModalAgendar] = useState(false);

  // Especialidades asignadas al médico logueado
  const { data: misEspecialidades = [] } = useEspecialidadesDeMedico(usuario?.id ?? null);

  // El backend limita automáticamente al médico logueado
  const { data: citas = [], isLoading: cargandoCitas } = useCitas(
    modoVista === 'dia' ? { fecha: fechaSeleccionada } : undefined,
  );
  const { data: bloqueos = [] } = useBloqueos();

  // Filtrado por estado y por especialidad
  const citasFiltradas = useMemo(() => {
    return citas.filter((c) => {
      const coincideEstado = estadoFiltro === 'TODOS' || c.estado === estadoFiltro;
      const coincideEspecialidad =
        especialidadFiltro === 'TODAS' || c.especialidad_id === especialidadFiltro;
      return coincideEstado && coincideEspecialidad;
    });
  }, [citas, estadoFiltro, especialidadFiltro]);

  // Navegación temporal
  const navegarTemporal = (offset: number) => {
    const [y, m, d] = fechaSeleccionada.split('-').map(Number);
    const date = new Date(y, m - 1, d);

    if (modoVista === 'dia') {
      date.setDate(date.getDate() + offset);
    } else if (modoVista === 'semana') {
      date.setDate(date.getDate() + offset * 7);
    } else if (modoVista === 'mes') {
      date.setMonth(date.getMonth() + offset);
    }

    setFechaSeleccionada(obtenerFechaLocal(date));
  };

  // Cálculo de los 7 días de la semana (Lunes a Domingo)
  const diasSemana = useMemo(() => {
    const [y, m, d] = fechaSeleccionada.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const dayOfWeek = date.getDay(); // 0 = Domingo, 1 = Lunes
    const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Ajustar a Lunes
    const monday = new Date(date.setDate(diff));

    return Array.from({ length: 7 }, (_, i) => {
      const current = new Date(monday);
      current.setDate(monday.getDate() + i);
      return {
        fechaStr: obtenerFechaLocal(current),
        numeroDia: current.getDate(),
        nombreDia: DIAS_SEMANA_ABR[i],
      };
    });
  }, [fechaSeleccionada]);

  // Cálculo de días del mes
  const diasMes = useMemo(() => {
    const [y, m] = fechaSeleccionada.split('-').map(Number);
    const primerDiaMes = new Date(y, m - 1, 1);
    const ultimoDiaMes = new Date(y, m, 0);
    const totalDias = ultimoDiaMes.getDate();

    const diaInicio = primerDiaMes.getDay();
    const offsetInicio = diaInicio === 0 ? 6 : diaInicio - 1; // 0=Lunes

    return {
      anio: y,
      mesNombre: MESES[m - 1],
      totalDias,
      offsetInicio,
    };
  }, [fechaSeleccionada]);

  const bloqueosDelDia = useMemo(() => {
    return bloqueos.filter((b) => b.fecha === fechaSeleccionada);
  }, [bloqueos, fechaSeleccionada]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Encabezado */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Mi Calendario Médico</h1>
          <p className="mt-1 text-sm text-muted">
            Visualiza tus citas agendadas, bloqueos y programa citas para tus especialidades.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/medico/horarios"
            className="inline-flex items-center gap-1.5 rounded-field border border-line bg-surface px-3.5 py-2 text-xs font-semibold text-brand-700 shadow-xs transition-colors hover:bg-brand-50"
          >
            <i className="ri-calendar-schedule-line" />
            Mi Horario Asignado
          </Link>
          <Button icon="ri-calendar-check-line" onClick={() => setModalAgendar(true)}>
            Nueva Cita
          </Button>
        </div>
      </div>

      {/* Barra de control de fecha, vistas y filtros */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-line bg-surface p-4 shadow-card">
        {/* Navegación por fechas */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => navegarTemporal(-1)}
            title="Anterior"
            className="flex size-9 cursor-pointer items-center justify-center rounded-field border border-line text-muted transition-colors hover:bg-canvas hover:text-ink"
          >
            <i className="ri-arrow-left-s-line text-lg" />
          </button>
          <button
            type="button"
            onClick={() => setFechaSeleccionada(hoyStr)}
            className="rounded-field border border-line px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-canvas"
          >
            Hoy
          </button>
          <input
            type="date"
            value={fechaSeleccionada}
            onChange={(e) => setFechaSeleccionada(e.target.value)}
            className="h-9 rounded-field border border-line bg-canvas px-3 text-sm font-semibold text-ink outline-none focus:border-brand-600"
          />
          <button
            type="button"
            onClick={() => navegarTemporal(1)}
            title="Siguiente"
            className="flex size-9 cursor-pointer items-center justify-center rounded-field border border-line text-muted transition-colors hover:bg-canvas hover:text-ink"
          >
            <i className="ri-arrow-right-s-line text-lg" />
          </button>

          {modoVista === 'semana' && (
            <span className="rounded-field bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
              {diasSemana[0]?.fechaStr} al {diasSemana[6]?.fechaStr}
            </span>
          )}

          {modoVista === 'mes' && (
            <span className="rounded-field bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
              {diasMes.mesNombre} {diasMes.anio}
            </span>
          )}
        </div>

        {/* Controles de vista y filtros */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Selector de modo temporal (Día | Semana | Mes) */}
          <div className="flex rounded-field border border-line bg-canvas p-0.5 shadow-xs">
            <button
              type="button"
              onClick={() => setModoVista('dia')}
              className={`cursor-pointer rounded-field px-3 py-1 text-xs font-semibold transition-colors ${
                modoVista === 'dia'
                  ? 'bg-brand-600 text-white shadow-card'
                  : 'text-muted hover:text-ink'
              }`}
            >
              Día
            </button>
            <button
              type="button"
              onClick={() => setModoVista('semana')}
              className={`cursor-pointer rounded-field px-3 py-1 text-xs font-semibold transition-colors ${
                modoVista === 'semana'
                  ? 'bg-brand-600 text-white shadow-card'
                  : 'text-muted hover:text-ink'
              }`}
            >
              Semana
            </button>
            <button
              type="button"
              onClick={() => setModoVista('mes')}
              className={`cursor-pointer rounded-field px-3 py-1 text-xs font-semibold transition-colors ${
                modoVista === 'mes'
                  ? 'bg-brand-600 text-white shadow-card'
                  : 'text-muted hover:text-ink'
              }`}
            >
              Mes
            </button>
          </div>

          {/* Filtro por estado de cita */}
          <select
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value as EstadoCita | 'TODOS')}
            className="h-9 rounded-field border border-line bg-canvas px-3 text-xs font-medium text-ink outline-none focus:border-brand-600"
          >
            <option value="TODOS">Todos los Estados</option>
            <option value="AGENDADA">Agendada</option>
            <option value="EN_ESPERA">En espera</option>
            <option value="EN_ATENCION">En atención</option>
            <option value="ATENDIDA">Atendida</option>
            <option value="CANCELADA">Cancelada</option>
          </select>

          {/* Filtro por especialidad asignada */}
          {misEspecialidades.length > 0 && (
            <select
              value={especialidadFiltro}
              onChange={(e) => setEspecialidadFiltro(e.target.value)}
              className="h-9 rounded-field border border-line bg-canvas px-3 text-xs font-medium text-ink outline-none focus:border-brand-600"
            >
              <option value="TODAS">Todas mis especialidades</option>
              {misEspecialidades.map((esp) => (
                <option key={esp.id} value={esp.id}>
                  {esp.nombre}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {cargandoCitas && <LoadingSpinner label="Cargando citas..." />}

      {/* ============================================================ */}
      {/* MODO VISTA: DÍA                                               */}
      {/* ============================================================ */}
      {!cargandoCitas && modoVista === 'dia' && (
        <div className="space-y-4">
          {/* Bloqueos del día si aplican */}
          {bloqueosDelDia.map((bloqueo) => (
            <div
              key={bloqueo.id}
              className="flex items-center gap-3 rounded-card border border-dashed border-danger/40 bg-danger-soft/40 p-4 text-danger"
            >
              <i className="ri-calendar-close-line text-2xl" />
              <div>
                <p className="text-sm font-bold">
                  {bloqueo.tipo_bloqueo === 'PARCIAL'
                    ? `Bloqueo Parcial de Agenda (${lapsoDeBloqueo(bloqueo)})`
                    : 'Agenda Bloqueada para todo el día'}
                </p>
                <p className="text-xs text-danger/80">{bloqueo.motivo}</p>
              </div>
            </div>
          ))}

          {citasFiltradas.length === 0 ? (
            <div className="rounded-card border border-line bg-surface p-12 text-center shadow-card">
              <EmptyState
                icon="ri-calendar-line"
                title="Sin citas para este día"
                message="No tienes citas agendadas para la fecha seleccionada."
              />
              <div className="mt-4">
                <Button icon="ri-calendar-check-line" onClick={() => setModalAgendar(true)}>
                  Agendar Cita para este día
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {citasFiltradas.map((cita) => {
                const esCancelada = cita.estado === 'CANCELADA';
                const esEnAtencion = cita.estado === 'EN_ATENCION';
                const esEmergencia = cita.tipo_cita === 'EMERGENCIA';

                return (
                  <article
                    key={cita.id}
                    className={`flex flex-wrap items-center justify-between gap-4 rounded-card border p-4 shadow-card transition-all ${
                      esCancelada
                        ? 'border-line bg-canvas opacity-65'
                        : esEnAtencion
                          ? 'border-brand-500 bg-brand-50/60 ring-2 ring-brand-500/20'
                          : 'border-line bg-surface hover:border-brand-300'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Horario */}
                      <div className="w-28 text-center font-mono">
                        <span className="block text-base font-bold text-ink">
                          {cita.hora_inicio}
                        </span>
                        <span className="block text-xs text-muted">a {cita.hora_fin}</span>
                      </div>

                      {/* Información del paciente */}
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-base font-bold text-ink">{cita.pacienteNombre}</h2>
                          <Badge
                            dot
                            variant={
                              cita.estado === 'ATENDIDA'
                                ? 'success'
                                : cita.estado === 'EN_ESPERA'
                                  ? 'info'
                                  : cita.estado === 'EN_ATENCION'
                                    ? 'royal'
                                    : cita.estado === 'CANCELADA'
                                      ? 'danger'
                                      : 'default'
                            }
                          >
                            {ESTADO_CITA_LABEL[cita.estado]}
                          </Badge>
                          {esEmergencia && (
                            <Badge variant="danger">{TIPO_CITA_LABEL[cita.tipo_cita]}</Badge>
                          )}
                          {cita.tipo_cita === 'SOBRECUPO' && (
                            <Badge variant="warning">{TIPO_CITA_LABEL[cita.tipo_cita]}</Badge>
                          )}
                        </div>

                        <p className="mt-1 text-xs text-muted">
                          Expediente:{' '}
                          <span className="font-mono font-semibold text-ink">
                            {cita.pacienteExpediente}
                          </span>
                          {cita.especialidadNombre && (
                            <span>
                              {' · '}
                              Especialidad:{' '}
                              <span className="font-semibold text-brand-700">
                                {cita.especialidadNombre}
                              </span>
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/medico/expediente/${cita.paciente_id}`}
                        className="inline-flex items-center gap-1.5 rounded-field border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-50"
                      >
                        <i className="ri-folder-user-line" />
                        Expediente
                      </Link>

                      {esEnAtencion && cita.consulta_id && (
                        <Link
                          to={`/medico/consulta/${cita.consulta_id}`}
                          className="inline-flex items-center gap-1.5 rounded-field bg-brand-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-brand-700"
                        >
                          <i className="ri-play-circle-fill text-sm" />
                          Retomar Consulta
                        </Link>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* MODO VISTA: SEMANA                                            */}
      {/* ============================================================ */}
      {!cargandoCitas && modoVista === 'semana' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
          {diasSemana.map((dia) => {
            const citasDelDia = citasFiltradas.filter((c) => c.fecha === dia.fechaStr);
            const esHoy = dia.fechaStr === hoyStr;

            return (
              <div
                key={dia.fechaStr}
                className={`flex flex-col rounded-card border bg-surface shadow-card transition-all ${
                  esHoy ? 'border-brand-600 ring-2 ring-brand-600/20' : 'border-line'
                }`}
              >
                <div
                  className={`border-b p-3 text-center ${
                    esHoy ? 'bg-brand-600 text-white' : 'border-line bg-canvas text-ink'
                  }`}
                >
                  <p className="text-xs font-bold uppercase">{dia.nombreDia}</p>
                  <p className="text-lg font-extrabold">{dia.numeroDia}</p>
                  <span className="text-[10px] opacity-80">{dia.fechaStr}</span>
                </div>

                <div className="flex-1 space-y-2 p-2 min-h-55">
                  {citasDelDia.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center p-3 text-center text-muted">
                      <p className="text-[11px]">Sin citas</p>
                      <button
                        type="button"
                        onClick={() => {
                          setFechaSeleccionada(dia.fechaStr);
                          setModalAgendar(true);
                        }}
                        className="mt-1 text-[10px] font-semibold text-brand-600 hover:underline"
                      >
                        + Agendar
                      </button>
                    </div>
                  ) : (
                    citasDelDia.map((cita) => (
                      <div
                        key={cita.id}
                        className="rounded-field border border-line bg-canvas/70 p-2 text-left text-xs transition-colors hover:border-brand-300"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-ink">{cita.hora_inicio}</span>
                          <span
                            className={`rounded px-1.5 py-0.2 text-[9px] font-bold ${
                              cita.estado === 'ATENDIDA'
                                ? 'bg-emerald-100 text-emerald-800'
                                : cita.estado === 'EN_ATENCION'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-brand-100 text-brand-800'
                            }`}
                          >
                            {ESTADO_CITA_LABEL[cita.estado]}
                          </span>
                        </div>
                        <p className="mt-1 truncate font-semibold text-ink">
                          {cita.pacienteNombre}
                        </p>
                        {cita.especialidadNombre && (
                          <p className="truncate text-[10px] text-muted">
                            {cita.especialidadNombre}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================ */}
      {/* MODO VISTA: MES                                               */}
      {/* ============================================================ */}
      {!cargandoCitas && modoVista === 'mes' && (
        <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
          <div className="grid grid-cols-7 border-b border-line bg-canvas text-center">
            {DIAS_SEMANA_ABR.map((d) => (
              <div key={d} className="py-2.5 text-xs font-bold uppercase text-muted">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 auto-rows-fr">
            {/* Espacios vacíos antes del día 1 */}
            {Array.from({ length: diasMes.offsetInicio }).map((_, i) => (
              <div
                key={`vacio-${i}`}
                className="min-h-22.5 border-b border-r border-line bg-canvas/30"
              />
            ))}

            {/* Días del mes */}
            {Array.from({ length: diasMes.totalDias }).map((_, i) => {
              const numDia = i + 1;
              const mesNum = String(fechaSeleccionada.split('-')[1]).padStart(2, '0');
              const diaStr = `${diasMes.anio}-${mesNum}-${String(numDia).padStart(2, '0')}`;
              const citasDia = citasFiltradas.filter((c) => c.fecha === diaStr);
              const esHoy = diaStr === hoyStr;

              return (
                <div
                  key={diaStr}
                  onClick={() => {
                    setFechaSeleccionada(diaStr);
                    setModoVista('dia');
                  }}
                  className={`min-h-22.5 cursor-pointer border-b border-r border-line p-2 transition-colors hover:bg-brand-50/40 ${
                    esHoy ? 'bg-brand-50/70 font-bold' : ''
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span
                      className={`text-xs font-bold ${
                        esHoy
                          ? 'flex size-5 items-center justify-center rounded-full bg-brand-600 text-white'
                          : 'text-ink'
                      }`}
                    >
                      {numDia}
                    </span>
                    {citasDia.length > 0 && (
                      <span className="rounded-full bg-brand-100 px-1.5 py-0.2 text-[10px] font-bold text-brand-700">
                        {citasDia.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    {citasDia.slice(0, 2).map((c) => (
                      <div
                        key={c.id}
                        className="truncate rounded bg-brand-50 px-1 py-0.5 text-[10px] text-brand-800"
                      >
                        {c.hora_inicio} {c.pacienteNombre}
                      </div>
                    ))}
                    {citasDia.length > 2 && (
                      <p className="text-[9px] text-muted">+{citasDia.length - 2} más...</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal para agendar cita */}
      <AgendarCitaModal
        isOpen={modalAgendar}
        onClose={() => setModalAgendar(false)}
        fechaPredeterminada={fechaSeleccionada}
        medicoIdPredeterminado={usuario?.id}
      />
    </div>
  );
}

export default CalendarioPage;
