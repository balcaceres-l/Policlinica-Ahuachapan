import { useState, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import CitasAfectadasModal, {
  type BloqueoGestionable,
} from '@/components/bloqueo/CitasAfectadasModal';
import CancelarCitaModal from '@/components/cita/CancelarCitaModal';
import CitaAvisos from '@/components/cita/CitaAvisos';
import DesplazarAgendaModal from '@/components/cita/DesplazarAgendaModal';
import ReprogramarCitaModal from '@/components/cita/ReprogramarCitaModal';
import SignosVitalesModal from '@/components/cita/SignosVitalesModal';
import TurnoBadge from '@/components/cita/TurnoBadge';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import DataTable, { type Column } from '@/components/ui/DataTable';
import InfoTooltip from '@/components/ui/InfoTooltip';
import Pagination from '@/components/ui/Pagination';
import SearchBar from '@/components/ui/SearchBar';
import { useCitas, useMarcarLlegada } from '@/hooks/cita/useCitas';
import { useMedicos } from '@/hooks/usuario/useUsuarios';
import { bloqueoDeCita, lapsoDeBloqueo } from '@/lib/bloqueo';
import { cn, normalizar } from '@/lib/utils';
import {
  ESTADO_CITA_LABEL,
  TIPO_CITA_CLASE,
  TIPO_CITA_LABEL,
  type Cita,
  type EstadoCita,
  type TipoCita,
} from '@/types/cita.types';

const obtenerFechaLocal = (d = new Date()) => {
  const anio = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
};

const POR_PAGINA = 25;

type PestanaCitas = 'TODAS' | 'EN_ESPERA' | 'EN_ATENCION' | 'AGENDADA' | 'ATENDIDA' | 'CANCELADA';

const PESTANAS: { clave: PestanaCitas; etiqueta: string; icono: string }[] = [
  { clave: 'TODAS', etiqueta: 'Todas', icono: 'ri-list-check' },
  { clave: 'EN_ESPERA', etiqueta: 'Sala de espera', icono: 'ri-user-received-2-line' },
  { clave: 'EN_ATENCION', etiqueta: 'En atención', icono: 'ri-stethoscope-line' },
  { clave: 'AGENDADA', etiqueta: 'Agendadas', icono: 'ri-calendar-event-line' },
  { clave: 'ATENDIDA', etiqueta: 'Atendidas', icono: 'ri-checkbox-circle-line' },
  { clave: 'CANCELADA', etiqueta: 'Canceladas', icono: 'ri-close-circle-line' },
];

const TIPOS_VALIDOS: TipoCita[] = ['REGULAR', 'EMERGENCIA', 'SOBRECUPO', 'SIN_CITA'];

export function CitasRecepcionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const hoyStr = useMemo(() => obtenerFechaLocal(), []);

  // Los filtros viven en la URL: al abrir un expediente y volver, la pantalla queda como estaba.
  const [params, setParams] = useSearchParams();
  const busqueda = params.get('q') ?? '';
  // La fecha nunca queda vacía: sin ella la lista mezclaría todos los días y crecería sin límite.
  const fechaParam = params.get('fecha');
  const fechaFiltro = fechaParam && /^\d{4}-\d{2}-\d{2}$/.test(fechaParam) ? fechaParam : hoyStr;
  const medicoFiltro = params.get('medico') ?? 'TODOS';
  const tipoParam = params.get('tipo') as TipoCita | null;
  const tipoCitaFiltro: TipoCita | 'TODOS' =
    tipoParam && TIPOS_VALIDOS.includes(tipoParam) ? tipoParam : 'TODOS';
  const pestanaParam = params.get('estado') as PestanaCitas | null;
  const pestana: PestanaCitas = PESTANAS.some((t) => t.clave === pestanaParam)
    ? (pestanaParam as PestanaCitas)
    : 'TODAS';
  const pagina = Math.max(1, Number(params.get('pagina')) || 1);

  /** Cambia filtros en la URL. Cualquier cambio de filtro vuelve a la página 1. */
  const cambiarParams = (cambios: Record<string, string | null>, conservarPagina = false) => {
    setParams(
      (previos) => {
        const nuevos = new URLSearchParams(previos);
        Object.entries(cambios).forEach(([clave, valor]) => {
          if (valor === null || valor === '') nuevos.delete(clave);
          else nuevos.set(clave, valor);
        });
        if (!conservarPagina) nuevos.delete('pagina');
        return nuevos;
      },
      { replace: true },
    );
  };

  const setBusqueda = (valor: string) => cambiarParams({ q: valor });
  const setFechaFiltro = (valor: string) => {
    if (!valor) return; // el selector de fecha no se puede dejar en blanco
    cambiarParams({ fecha: valor === hoyStr ? null : valor });
  };

  // Modales
  const [modalDesplazar, setModalDesplazar] = useState(false);
  const [citaAReprogramar, setCitaAReprogramar] = useState<Cita | null>(null);
  const [citaACancelar, setCitaACancelar] = useState<Cita | null>(null);
  const [citaSignosVitales, setCitaSignosVitales] = useState<Cita | null>(null);
  const [bloqueoAGestionar, setBloqueoAGestionar] = useState<BloqueoGestionable | null>(null);

  const { data: medicos = [] } = useMedicos();
  const { data: citas = [], isLoading } = useCitas({ fecha: fechaFiltro });

  const marcarLlegadaMutation = useMarcarLlegada();

  const handleMarcarLlegada = async (cita: Cita) => {
    try {
      await marcarLlegadaMutation.mutateAsync(cita.id);
      toast.success(`Llegada confirmada para ${cita.pacienteNombre}.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar llegada.';
      toast.error(msg);
    }
  };

  // Búsqueda, médico y tipo acotan el conjunto; las pestañas lo dividen por estado.
  const citasBase = useMemo(() => {
    const termino = normalizar(busqueda);

    return citas.filter((c) => {
      const coincideTexto =
        !termino ||
        normalizar(c.pacienteNombre).includes(termino) ||
        normalizar(c.pacienteExpediente).includes(termino) ||
        normalizar(c.medicoNombre).includes(termino);

      const coincideMedico = medicoFiltro === 'TODOS' || c.medico_id === medicoFiltro;
      const coincideTipo = tipoCitaFiltro === 'TODOS' || c.tipo_cita === tipoCitaFiltro;

      return coincideTexto && coincideMedico && coincideTipo;
    });
  }, [citas, busqueda, medicoFiltro, tipoCitaFiltro]);

  const conteos = useMemo(() => {
    const porEstado = (estado: EstadoCita) => citasBase.filter((c) => c.estado === estado).length;
    return {
      TODAS: citasBase.length,
      EN_ESPERA: porEstado('EN_ESPERA'),
      EN_ATENCION: porEstado('EN_ATENCION'),
      AGENDADA: porEstado('AGENDADA'),
      ATENDIDA: porEstado('ATENDIDA'),
      CANCELADA: porEstado('CANCELADA'),
    } satisfies Record<PestanaCitas, number>;
  }, [citasBase]);

  const citasFiltradas = useMemo(() => {
    const delEstado =
      pestana === 'TODAS' ? citasBase : citasBase.filter((c) => c.estado === pestana);

    return [...delEstado].sort((a, b) => {
      // La fila de atención se lee por médico y por orden de llegada.
      if (pestana === 'EN_ESPERA' || pestana === 'EN_ATENCION') {
        return (
          a.medicoNombre.localeCompare(b.medicoNombre) ||
          (a.orden_atencion ?? 0) - (b.orden_atencion ?? 0)
        );
      }
      return a.hora_inicio.localeCompare(b.hora_inicio);
    });
  }, [citasBase, pestana]);

  const totalPaginas = Math.max(1, Math.ceil(citasFiltradas.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const inicio = (paginaActual - 1) * POR_PAGINA;
  const visibles = citasFiltradas.slice(inicio, inicio + POR_PAGINA);

  // Métricas rápidas
  const totalHoy = citas.length;
  const enEspera = citas.filter((c) => c.estado === 'EN_ESPERA').length;
  const atendidas = citas.filter((c) => c.estado === 'ATENDIDA').length;

  const columns: Column<Cita>[] = [
    {
      key: 'horario',
      header: 'Horario',
      className: 'w-44 font-semibold text-ink',
      render: (cita) => (
        <div>
          <span>{cita.hora_inicio} - {cita.hora_fin}</span>
          {cita.fecha !== fechaFiltro && (
            <p className="text-[10px] font-semibold text-brand-600">{cita.fecha}</p>
          )}
          {cita.hora_llegada && (
            <p className="text-[10px] text-muted">Llegó: {cita.hora_llegada.slice(11, 16)}</p>
          )}
          {cita.minutos_retraso > 0 && (
            <p
              className={cn(
                'text-[10px] font-bold',
                cita.retrasada ? 'text-danger' : 'text-warning',
              )}
            >
              <i className="ri-alarm-warning-line mr-0.5 align-middle" />
              {cita.minutos_retraso} min de retraso
            </p>
          )}
          {/* HU-35 — la cita quedó dentro de un bloqueo: hay que contactar al paciente. */}
          {cita.afectada_por_bloqueo && cita.bloqueo && (
            <button
              type="button"
              onClick={() => setBloqueoAGestionar(bloqueoDeCita(cita))}
              title={`Bloqueo: ${cita.bloqueo.motivo || 'sin motivo'}. Clic para gestionar las citas afectadas.`}
              className="mt-1 inline-flex cursor-pointer items-center gap-1 rounded bg-warning-soft px-1.5 py-0.5 text-[10px] font-bold text-warning hover:brightness-95"
            >
              <i className="ri-calendar-close-line" />
              En bloqueo ({lapsoDeBloqueo(cita.bloqueo)})
            </button>
          )}
          <CitaAvisos cita={cita} className="mt-1" />
        </div>
      ),
    },
    {
      key: 'turno',
      header: 'Turno',
      className: 'w-20 text-center',
      render: (cita) => <TurnoBadge cita={cita} />,
    },
    {
      key: 'paciente',
      header: 'Paciente',
      render: (cita) => (
        <div>
          <p className="font-bold text-ink">{cita.pacienteNombre}</p>
          <p className="text-xs text-muted">Exp: {cita.pacienteExpediente}</p>
        </div>
      ),
    },
    {
      key: 'medico',
      header: 'Médico y Especialidad',
      render: (cita) => (
        <div>
          <p className="font-medium text-ink">{cita.medicoNombre}</p>
          <p className="text-xs text-muted">{cita.especialidadNombre ?? 'Consulta General'}</p>
        </div>
      ),
    },
    {
      key: 'tipo',
      header: 'Tipo',
      render: (cita) => (
        <span
          className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${TIPO_CITA_CLASE[cita.tipo_cita]}`}
        >
          {TIPO_CITA_LABEL[cita.tipo_cita]}
        </span>
      ),
    },
    {
      key: 'estado',
      header: 'Estado / Cobro',
      render: (cita) => (
        <div>
          <Badge
            dot
            variant={
              cita.estado === 'ATENDIDA'
                ? 'success'
                : cita.estado === 'EN_ESPERA'
                  ? 'info'
                  : cita.estado === 'CANCELADA'
                    ? 'danger'
                    : 'royal'
            }
          >
            {ESTADO_CITA_LABEL[cita.estado]}
          </Badge>
          {cita.estado === 'ATENDIDA' && (cita.consulta_total != null || cita.consulta_precio != null) && (
            <div className="mt-1">
              <span
                className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800"
                title="Tarifa / Precio fijado por el médico para cobro"
              >
                <i className="ri-money-dollar-circle-line" />
                ${Number(cita.consulta_total ?? cita.consulta_precio).toFixed(2)} USD
              </span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'acciones',
      header: 'Acciones',
      className: 'w-48 text-right',
      render: (cita) => (
        <div className="flex justify-end gap-1">
          {/* Ver expediente clínico completo del paciente */}
          {cita.paciente_id && (
            <button
              type="button"
              onClick={() =>
                navigate(`/secretaria/pacientes/${cita.paciente_id}`, {
                  state: { origen: { ruta: `${location.pathname}${location.search}` } },
                })
              }
              title="Ver expediente clínico y consultas del paciente"
              className="flex size-8 cursor-pointer items-center justify-center rounded-field text-brand-600 transition-colors hover:bg-brand-50 hover:text-brand-800"
            >
              <i className="ri-folder-user-line text-base" />
            </button>
          )}
          {/* Tomar o editar signos vitales solo para citas de hoy en estado AGENDADA o EN_ESPERA */}
          {(cita.estado === 'AGENDADA' || cita.estado === 'EN_ESPERA') && cita.fecha === hoyStr && (
            <button
              type="button"
              onClick={() => setCitaSignosVitales(cita)}
              title={
                cita.signos_vitales
                  ? 'Ver / Editar signos vitales'
                  : 'Tomar signos vitales'
              }
              className={cn(
                'flex size-8 cursor-pointer items-center justify-center rounded-field transition-colors',
                cita.signos_vitales
                  ? 'text-emerald-600 hover:bg-emerald-50'
                  : 'text-brand-600 hover:bg-brand-50',
              )}
            >
              <i className="ri-heart-pulse-line text-base" />
            </button>
          )}

          {/* El botón de marcar llegada está disponible ÚNICAMENTE en citas del día de hoy */}
          {cita.estado === 'AGENDADA' && cita.fecha === hoyStr && (
            <button
              type="button"
              onClick={() => handleMarcarLlegada(cita)}
              title="Marcar llegada del paciente (Cita de hoy)"
              disabled={marcarLlegadaMutation.isPending}
              className="flex size-8 cursor-pointer items-center justify-center rounded-field text-brand-600 transition-colors hover:bg-brand-50"
            >
              <i className="ri-user-shared-line text-base" />
            </button>
          )}

          {cita.estado !== 'CANCELADA' && cita.estado !== 'ATENDIDA' && (
            <button
              type="button"
              onClick={() => setCitaAReprogramar(cita)}
              title="Reprogramar cita"
              className="flex size-8 cursor-pointer items-center justify-center rounded-field text-muted transition-colors hover:bg-canvas hover:text-ink"
            >
              <i className="ri-calendar-line text-base" />
            </button>
          )}

          {cita.estado !== 'CANCELADA' && cita.estado !== 'ATENDIDA' && (
            <button
              type="button"
              onClick={() => setCitaACancelar(cita)}
              title="Cancelar cita"
              className="flex size-8 cursor-pointer items-center justify-center rounded-field text-muted transition-colors hover:bg-danger-soft hover:text-danger"
            >
              <i className="ri-close-circle-line text-base" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      {/* Encabezado */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Citas</h1>
          <p className="mt-1 text-sm text-muted">
            Confirmación de llegadas, sala de espera y seguimiento de las citas. Para agendar una nueva, usa el Calendario global.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <InfoTooltip titulo="¿Cuándo usar «Médico con atraso»?">
            Úsalo cuando un médico llega tarde: corre todas sus citas pendientes del día los minutos que indiques, conservando la duración de cada una.
          </InfoTooltip>
          <Button variant="secondary" icon="ri-time-line" onClick={() => setModalDesplazar(true)}>
            Médico con atraso
          </Button>
        </div>
      </div>

      {/* Tarjetas de métricas rápidas */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-card border border-line bg-surface p-4 shadow-card">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-field bg-brand-50 text-brand-600">
            <i className="ri-calendar-event-line text-xl" />
          </span>
          <div>
            <p className="text-2xl font-bold text-ink">{isLoading ? '–' : totalHoy}</p>
            <p className="text-xs text-muted">Citas en la fecha</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-card border border-line bg-surface p-4 shadow-card">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-field bg-info-soft text-info">
            <i className="ri-user-received-2-line text-xl" />
          </span>
          <div>
            <p className="text-2xl font-bold text-ink">{isLoading ? '–' : enEspera}</p>
            <p className="text-xs text-muted">En sala de espera</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-card border border-line bg-surface p-4 shadow-card">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-field bg-success-soft text-success">
            <i className="ri-checkbox-circle-line text-xl" />
          </span>
          <div>
            <p className="text-2xl font-bold text-ink">{isLoading ? '–' : atendidas}</p>
            <p className="text-xs text-muted">Consultas completadas</p>
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-card border border-line bg-surface p-4 shadow-card">
        <SearchBar
          value={busqueda}
          onChange={setBusqueda}
          placeholder="Buscar paciente, expediente o médico..."
          className="min-w-55 flex-1"
        />

        <div className="flex items-center gap-1">
          <input
            type="date"
            value={fechaFiltro}
            onChange={(e) => setFechaFiltro(e.target.value)}
            className="h-10 rounded-field border border-line bg-surface px-3 text-xs font-semibold text-ink outline-none focus:border-brand-600"
          />
        </div>

        {/* Filtro por Médico */}
        <select
          value={medicoFiltro}
          onChange={(e) =>
            cambiarParams({ medico: e.target.value === 'TODOS' ? null : e.target.value })
          }
          className="h-10 rounded-field border border-line bg-surface px-3 text-xs font-medium text-ink outline-none focus:border-brand-600"
        >
          <option value="TODOS">Todos los Médicos</option>
          {medicos.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombreCompleto}
            </option>
          ))}
        </select>

        {/* Filtro por Tipo de Cita */}
        <select
          value={tipoCitaFiltro}
          onChange={(e) => cambiarParams({ tipo: e.target.value === 'TODOS' ? null : e.target.value })}
          className="h-10 rounded-field border border-line bg-surface px-3 text-xs font-medium text-ink outline-none focus:border-brand-600"
        >
          <option value="TODOS">Todos los Tipos</option>
          <option value="REGULAR">Regular</option>
          <option value="EMERGENCIA">Emergencia</option>
          <option value="SOBRECUPO">Sobrecupo</option>
          <option value="SIN_CITA">Sin cita previa</option>
        </select>
      </div>

      {/* HU-43 — el estado se elige con pestañas; la de sala de espera es la fila de atención por médico. */}
      <div role="tablist" aria-label="Estado de las citas" className="mb-4 flex flex-wrap gap-2">
        {PESTANAS.map((tab) => {
          const activa = tab.clave === pestana;
          return (
            <button
              key={tab.clave}
              type="button"
              role="tab"
              aria-selected={activa}
              onClick={() => cambiarParams({ estado: tab.clave === 'TODAS' ? null : tab.clave })}
              className={cn(
                'inline-flex cursor-pointer items-center gap-2 rounded-field border px-3.5 py-2 text-sm font-semibold transition-colors',
                activa
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-line bg-surface text-ink hover:border-brand-600/40 hover:bg-brand-50',
              )}
            >
              <i className={`${tab.icono} text-base`} aria-hidden="true" />
              {tab.etiqueta}
              <span
                className={cn(
                  'min-w-6 rounded-full px-1.5 py-0.5 text-center text-xs font-bold',
                  activa ? 'bg-white/20 text-white' : 'bg-canvas text-muted',
                )}
              >
                {isLoading ? '–' : conteos[tab.clave]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tabla de Citas */}
      <DataTable
        columns={columns}
        data={visibles}
        keyExtractor={(c) => c.id}
        isLoading={isLoading}
        emptyIcon="ri-calendar-line"
        emptyTitle="Sin citas encontradas"
        emptyMessage={
          pestana === 'EN_ESPERA'
            ? 'Nadie en sala de espera. Los pacientes aparecen aquí en cuanto recepción registra su llegada.'
            : 'No hay citas que coincidan con la fecha, la pestaña o los filtros seleccionados.'
        }
        footer={
          citasFiltradas.length > POR_PAGINA ? (
            <Pagination
              paginaActual={paginaActual}
              totalPaginas={totalPaginas}
              total={citasFiltradas.length}
              desde={inicio + 1}
              hasta={inicio + visibles.length}
              etiqueta="citas"
              onCambiarPagina={(n) => cambiarParams({ pagina: n === 1 ? null : String(n) }, true)}
            />
          ) : undefined
        }
      />

      {/* Modales */}
      <DesplazarAgendaModal
        isOpen={modalDesplazar}
        onClose={() => setModalDesplazar(false)}
        fechaPredeterminada={fechaFiltro}
        medicoIdPredeterminado={medicoFiltro === 'TODOS' ? undefined : medicoFiltro}
      />

      <ReprogramarCitaModal
        cita={citaAReprogramar}
        isOpen={citaAReprogramar !== null}
        onClose={() => setCitaAReprogramar(null)}
      />

      <CancelarCitaModal
        cita={citaACancelar}
        isOpen={citaACancelar !== null}
        onClose={() => setCitaACancelar(null)}
      />

      <SignosVitalesModal
        cita={citaSignosVitales}
        isOpen={citaSignosVitales !== null}
        onClose={() => setCitaSignosVitales(null)}
      />

      <CitasAfectadasModal
        bloqueo={bloqueoAGestionar}
        onClose={() => setBloqueoAGestionar(null)}
      />
    </div>
  );
}

export default CitasRecepcionPage;
