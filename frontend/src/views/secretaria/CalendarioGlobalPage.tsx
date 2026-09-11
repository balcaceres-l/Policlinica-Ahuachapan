import { useState, useMemo } from 'react';
import AgendarCitaModal from '@/components/cita/AgendarCitaModal';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useBloqueos } from '@/hooks/bloqueo/useBloqueos';
import { useCitas } from '@/hooks/cita/useCitas';
import { useMedicos } from '@/hooks/usuario/useUsuarios';
import { mockMedicos } from '@/services/mockData';
import { ESTADO_CITA_LABEL, TIPO_CITA_LABEL, type EstadoCita } from '@/types/cita.types';
import { getIniciales } from '@/lib/utils';

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

const obtenerFechaLocal = (d = new Date()) => {
  const anio = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
};

export function CalendarioGlobalPage() {
  const hoyStr = useMemo(() => obtenerFechaLocal(), []);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(hoyStr);
  const [modoVista, setModoVista] = useState<ModoVista>('dia');
  const [medicoFiltro, setMedicoFiltro] = useState<number | 'TODOS'>('TODOS');
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoCita | 'TODOS'>('TODOS');

  const [modalAgendar, setModalAgendar] = useState(false);
  const [medicoSeleccionadoParaCita, setMedicoSeleccionadoParaCita] = useState<number | undefined>(
    undefined,
  );

  const { data: medicos = mockMedicos, isLoading: cargandoMedicos } = useMedicos();

  // En modo 'dia' consultamos por fecha específica; en semana/mes consultamos todas para distribuirlas
  const { data: citas = [] } = useCitas(
    modoVista === 'dia' ? { fecha: fechaSeleccionada } : undefined,
  );
  const { data: bloqueos = [] } = useBloqueos();

  const medicosFiltrados = useMemo(() => {
    const lista = medicos.length > 0 ? medicos : mockMedicos;
    if (medicoFiltro === 'TODOS') return lista;
    return lista.filter((m) => m.id === medicoFiltro);
  }, [medicos, medicoFiltro]);

  // Citas filtradas por estado y por médico
  const citasFiltradas = useMemo(() => {
    return citas.filter((c) => {
      const coincideEstado = estadoFiltro === 'TODOS' || c.estado === estadoFiltro;
      const coincideMedico = medicoFiltro === 'TODOS' || c.medico_id === medicoFiltro;
      return coincideEstado && coincideMedico;
    });
  }, [citas, estadoFiltro, medicoFiltro]);

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

  // Cálculo de los 7 días de la semana (Lunes a Domingo) para la vista 'semana'
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

  // Cálculo de días del mes para la vista 'mes'
  const diasMes = useMemo(() => {
    const [y, m] = fechaSeleccionada.split('-').map(Number);
    const primerDiaMes = new Date(y, m - 1, 1);
    const ultimoDiaMes = new Date(y, m, 0);
    const totalDias = ultimoDiaMes.getDate();

    // Desplazamiento del primer día (0=Dom, 1=Lun...)
    const diaInicio = primerDiaMes.getDay();
    const offsetInicio = diaInicio === 0 ? 6 : diaInicio - 1; // 0=Lunes

    return {
      anio: y,
      mesNombre: MESES[m - 1],
      totalDias,
      offsetInicio,
    };
  }, [fechaSeleccionada]);

  const abrirAgendarParaMedico = (mId?: number) => {
    setMedicoSeleccionadoParaCita(mId);
    setModalAgendar(true);
  };

  if (cargandoMedicos && medicos.length === 0) {
    return <LoadingSpinner label="Cargando calendario global..." />;
  }

  return (
    <div className="mx-auto max-w-7xl">
      {/* Encabezado */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Calendario Global</h1>
          <p className="mt-1 text-sm text-muted">
            Monitorea en tiempo real la disponibilidad, citas y turnos de todos los médicos.
          </p>
        </div>
        <Button icon="ri-calendar-check-line" onClick={() => abrirAgendarParaMedico()}>
          Agendar Cita
        </Button>
      </div>

      {/* Barra de control de fecha, vistas y filtros */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-card border border-line bg-surface p-4 shadow-card">
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
            <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-field">
              {diasSemana[0]?.fechaStr} al {diasSemana[6]?.fechaStr}
            </span>
          )}

          {modoVista === 'mes' && (
            <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-field">
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
                modoVista === 'dia' ? 'bg-brand-600 text-white shadow-card' : 'text-muted hover:text-ink'
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
                modoVista === 'mes' ? 'bg-brand-600 text-white shadow-card' : 'text-muted hover:text-ink'
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

          {/* Filtro por médico */}
          <select
            value={medicoFiltro}
            onChange={(e) =>
              setMedicoFiltro(e.target.value === 'TODOS' ? 'TODOS' : Number(e.target.value))
            }
            className="h-9 rounded-field border border-line bg-canvas px-3 text-xs font-medium text-ink outline-none focus:border-brand-600"
          >
            <option value="TODOS">Todos los Médicos ({medicos.length})</option>
            {medicos.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombreCompleto} ({m.cargo})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODO VISTA: DÍA                                               */}
      {/* ============================================================ */}
      {modoVista === 'dia' && (
        <>
          {medicosFiltrados.length === 0 ? (
            <div className="rounded-card border border-line bg-surface shadow-card">
              <EmptyState
                icon="ri-stethoscope-line"
                title="Sin médicos que mostrar"
                message="No hay especialistas registrados o disponibles con el filtro seleccionado."
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {medicosFiltrados.map((medico) => {
                const citasMedico = citasFiltradas.filter((c) => c.medico_id === medico.id);
                const bloqueoDelDia = bloqueos.find(
                  (b) => b.medico_id === medico.id && b.fecha === fechaSeleccionada,
                );

                return (
                  <div
                    key={medico.id}
                    className="flex flex-col rounded-card border border-line bg-surface shadow-card"
                  >
                    {/* Encabezado del médico */}
                    <div className="border-b border-line bg-canvas/70 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-info-soft text-xs font-bold text-info">
                            {getIniciales(medico.nombreCompleto)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-ink">
                              {medico.nombreCompleto}
                            </p>
                            <p className="truncate text-[11px] text-muted">{medico.cargo}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => abrirAgendarParaMedico(medico.id)}
                          title="Agendar cita con este médico"
                          className="flex size-8 cursor-pointer items-center justify-center rounded-field text-muted transition-colors hover:bg-brand-50 hover:text-brand-600"
                        >
                          <i className="ri-add-line text-lg" />
                        </button>
                      </div>
                    </div>

                    {/* Lista de citas o estado de agenda */}
                    <div className="flex-1 p-3 space-y-2.5 min-h-[220px]">
                      {bloqueoDelDia ? (
                        <div className="flex flex-col items-center justify-center rounded-field border border-dashed border-danger/40 bg-danger-soft/40 p-4 text-center">
                          <i className="ri-calendar-close-line text-2xl text-danger mb-1" />
                          <p className="text-xs font-bold text-danger">
                            {bloqueoDelDia.tipo_bloqueo === 'PARCIAL'
                              ? `Bloqueo Parcial (${bloqueoDelDia.hora_inicio} - ${bloqueoDelDia.hora_fin})`
                              : 'Agenda Bloqueada (Día Completo)'}
                          </p>
                          <p className="mt-1 text-[11px] text-danger/80">{bloqueoDelDia.motivo}</p>
                        </div>
                      ) : null}

                      {citasMedico.length === 0 && !bloqueoDelDia ? (
                        <div className="flex h-full flex-col items-center justify-center rounded-field border border-dashed border-line p-6 text-center text-muted">
                          <i className="ri-calendar-check-line text-2xl opacity-40 mb-1" />
                          <p className="text-xs font-medium">Sin citas programadas</p>
                          <button
                            type="button"
                            onClick={() => abrirAgendarParaMedico(medico.id)}
                            className="mt-2 text-[11px] font-semibold text-brand-600 hover:underline"
                          >
                            + Programar cita
                          </button>
                        </div>
                      ) : (
                        citasMedico.map((cita) => {
                          const esCancelada = cita.estado === 'CANCELADA';
                          const esEmergencia = cita.tipo_cita === 'EMERGENCIA';

                          return (
                            <div
                              key={cita.id}
                              className={`rounded-field border p-2.5 transition-all text-xs ${
                                esCancelada
                                  ? 'border-line bg-canvas text-muted opacity-60'
                                  : esEmergencia
                                    ? 'border-danger/40 bg-danger-soft/30 text-ink'
                                    : 'border-line bg-surface hover:border-brand-300'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-ink">
                                  {cita.hora_inicio} - {cita.hora_fin}
                                </span>
                                <Badge
                                  variant={
                                    cita.estado === 'ATENDIDA'
                                      ? 'success'
                                      : cita.estado === 'EN_ESPERA'
                                        ? 'info'
                                        : cita.estado === 'CANCELADA'
                                          ? 'default'
                                          : 'royal'
                                  }
                                >
                                  {ESTADO_CITA_LABEL[cita.estado]}
                                </Badge>
                              </div>
                              <p className="font-semibold text-ink truncate">{cita.pacienteNombre}</p>
                              <p className="text-[11px] text-muted">
                                Exp: {cita.pacienteExpediente}
                              </p>
                              {cita.tipo_cita !== 'REGULAR' && (
                                <div className="mt-1">
                                  <span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase bg-warning-soft text-warning">
                                    {TIPO_CITA_LABEL[cita.tipo_cita]}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ============================================================ */}
      {/* MODO VISTA: SEMANA                                            */}
      {/* ============================================================ */}
      {modoVista === 'semana' && (
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
                    esHoy ? 'bg-brand-600 text-white' : 'bg-canvas text-ink border-line'
                  }`}
                >
                  <p className="text-xs font-bold uppercase">{dia.nombreDia}</p>
                  <p className="text-lg font-extrabold">{dia.numeroDia}</p>
                  <span className="text-[10px] opacity-80">{dia.fechaStr}</span>
                </div>

                <div className="flex-1 p-2 space-y-2 min-h-[220px]">
                  {citasDelDia.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center p-3 text-center text-muted">
                      <p className="text-[11px]">Sin citas</p>
                    </div>
                  ) : (
                    citasDelDia.map((cita) => (
                      <div
                        key={cita.id}
                        className="rounded-field border border-line bg-canvas/70 p-2 text-left text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-ink">{cita.hora_inicio}</span>
                          <span className="text-[10px] font-semibold text-brand-700">
                            {cita.tipo_cita === 'EMERGENCIA' ? 'EMERG.' : cita.tipo_cita}
                          </span>
                        </div>
                        <p className="truncate font-semibold text-ink mt-0.5">
                          {cita.pacienteNombre}
                        </p>
                        <p className="truncate text-[10px] text-muted">{cita.medicoNombre}</p>
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
      {modoVista === 'mes' && (
        <div className="rounded-card border border-line bg-surface shadow-card overflow-hidden">
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
              <div key={`vacio-${i}`} className="min-h-[90px] border-b border-r border-line bg-canvas/30" />
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
                  className={`min-h-[90px] cursor-pointer border-b border-r border-line p-2 transition-colors hover:bg-brand-50/40 ${
                    esHoy ? 'bg-brand-50/70 font-bold' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
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

      <AgendarCitaModal
        isOpen={modalAgendar}
        onClose={() => setModalAgendar(false)}
        fechaPredeterminada={fechaSeleccionada}
        medicoIdPredeterminado={medicoSeleccionadoParaCita}
      />
    </div>
  );
}

export default CalendarioGlobalPage;
