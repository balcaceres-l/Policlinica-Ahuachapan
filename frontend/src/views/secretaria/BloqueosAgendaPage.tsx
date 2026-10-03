import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import BloqueoAgendaModal from '@/components/bloqueo/BloqueoAgendaModal';
import CitasAfectadasModal, {
  type BloqueoGestionable,
} from '@/components/bloqueo/CitasAfectadasModal';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useBloqueos, useEliminarBloqueo } from '@/hooks/bloqueo/useBloqueos';
import { useMedicos } from '@/hooks/usuario/useUsuarios';
import { extraerMensajeError } from '@/lib/apiError';
import { cn } from '@/lib/utils';
import type { BloqueoAgenda, TipoBloqueo } from '@/types/bloqueo.types';

type Vista = 'VIGENTES' | 'HISTORIAL';

/** Días que se muestran de entrada; el resto se pide con "Mostrar más". */
const DIAS_POR_PAGINA = 15;

const fechaLocal = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** "2026-09-21" -> "Lunes, 21 de septiembre de 2026" sin pasar por UTC. */
const fechaLarga = (iso: string): string => {
  const [anio, mes, dia] = iso.split('-').map(Number);
  const texto = new Date(anio, mes - 1, dia).toLocaleDateString('es-SV', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

const CLASE_SELECT =
  'h-10 rounded-field border border-line bg-surface px-3 text-xs font-medium text-ink outline-none focus:border-brand-600';

interface FilaBloqueoProps {
  bloqueo: BloqueoAgenda;
  esPasado: boolean;
  eliminando: boolean;
  onEliminar: (b: BloqueoAgenda) => void;
  onGestionar: (b: BloqueoAgenda) => void;
}

function FilaBloqueo({ bloqueo, esPasado, eliminando, onEliminar, onGestionar }: FilaBloqueoProps) {
  const parcial = bloqueo.tipo_bloqueo === 'PARCIAL';
  const afectadas = bloqueo.citas_afectadas_total ?? 0;

  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{bloqueo.medicoNombre}</p>
        <p className="mt-0.5 text-xs text-muted">{bloqueo.motivo || 'Sin motivo indicado'}</p>
        {bloqueo.creadoPorNombre && (
          <p className="mt-0.5 text-[11px] text-muted">
            Registrado por {bloqueo.creadoPorNombre} · {bloqueo.fecha_creacion}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Badge variant={parcial ? 'warning' : 'danger'}>
          {parcial ? 'Parcial' : 'Día completo'}
        </Badge>
        {parcial && (
          <span className="inline-flex items-center gap-1 rounded bg-warning-soft px-2 py-0.5 text-xs font-semibold text-warning">
            <i className="ri-time-line" />
            {bloqueo.hora_inicio} - {bloqueo.hora_fin}
          </span>
        )}
      </div>

      {/* Solo importa gestionar las citas de un bloqueo que aún no pasa. */}
      {!esPasado && afectadas > 0 && (
        <button
          type="button"
          onClick={() => onGestionar(bloqueo)}
          title="Reagendar, correr o cancelar las citas que quedaron dentro del bloqueo"
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-field border border-warning/40 bg-warning-soft px-2.5 py-1.5 text-xs font-bold text-warning transition-colors hover:brightness-95"
        >
          <i className="ri-alarm-warning-line" />
          {afectadas} {afectadas === 1 ? 'cita afectada' : 'citas afectadas'}
        </button>
      )}

      {/* Un bloqueo pasado es el registro de que el médico faltó: no se borra. */}
      {!esPasado && (
        <button
          type="button"
          onClick={() => onEliminar(bloqueo)}
          title="Eliminar bloqueo"
          disabled={eliminando}
          className="flex size-8 cursor-pointer items-center justify-center rounded-field text-muted transition-colors hover:bg-danger-soft hover:text-danger"
        >
          <i className="ri-delete-bin-line text-base" />
        </button>
      )}
    </li>
  );
}

export function BloqueosAgendaPage() {
  const hoy = useMemo(() => fechaLocal(), []);

  const [vista, setVista] = useState<Vista>('VIGENTES');
  const [medicoFiltro, setMedicoFiltro] = useState<string | 'TODOS'>('TODOS');
  const [tipoFiltro, setTipoFiltro] = useState<TipoBloqueo | 'TODOS'>('TODOS');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [diasVisibles, setDiasVisibles] = useState(DIAS_POR_PAGINA);

  const [modalNuevo, setModalNuevo] = useState(false);
  const [bloqueoAGestionar, setBloqueoAGestionar] = useState<BloqueoGestionable | null>(null);

  const { data: medicos = [] } = useMedicos();
  // Se piden todos y se separan en pantalla: vigentes e historial salen de la misma lista.
  const { data: bloqueos = [], isLoading, isError } = useBloqueos({
    medicoId: medicoFiltro === 'TODOS' ? undefined : medicoFiltro,
  });
  const eliminarMutation = useEliminarBloqueo();

  const cambiarVista = (nueva: Vista) => {
    setVista(nueva);
    setDiasVisibles(DIAS_POR_PAGINA);
  };

  const vigentes = useMemo(() => bloqueos.filter((b) => b.fecha >= hoy), [bloqueos, hoy]);
  const historial = useMemo(() => bloqueos.filter((b) => b.fecha < hoy), [bloqueos, hoy]);

  const citasPorGestionar = useMemo(
    () => vigentes.reduce((total, b) => total + (b.citas_afectadas_total ?? 0), 0),
    [vigentes],
  );

  // Días con sus bloqueos: vigentes del más próximo al más lejano; historial del más reciente al más antiguo.
  const dias = useMemo(() => {
    const base = vista === 'VIGENTES' ? vigentes : historial;

    const filtrados = base.filter(
      (b) =>
        (tipoFiltro === 'TODOS' || b.tipo_bloqueo === tipoFiltro) &&
        (!desde || b.fecha >= desde) &&
        (!hasta || b.fecha <= hasta),
    );

    const porFecha = new Map<string, BloqueoAgenda[]>();
    for (const b of filtrados) {
      porFecha.set(b.fecha, [...(porFecha.get(b.fecha) ?? []), b]);
    }

    const ordenadas = [...porFecha.entries()].sort(([a], [b]) =>
      vista === 'VIGENTES' ? a.localeCompare(b) : b.localeCompare(a),
    );
    return ordenadas;
  }, [vista, vigentes, historial, tipoFiltro, desde, hasta]);

  const hayFiltros = medicoFiltro !== 'TODOS' || tipoFiltro !== 'TODOS' || desde !== '' || hasta !== '';

  const limpiarFiltros = () => {
    setMedicoFiltro('TODOS');
    setTipoFiltro('TODOS');
    setDesde('');
    setHasta('');
    setDiasVisibles(DIAS_POR_PAGINA);
  };

  const handleEliminar = async (b: BloqueoAgenda) => {
    const detalle =
      b.tipo_bloqueo === 'PARCIAL' ? `${b.fecha} (${b.hora_inicio} - ${b.hora_fin})` : b.fecha;

    if (!window.confirm(`¿Deseas desbloquear ${detalle} para ${b.medicoNombre}?`)) {
      return;
    }

    try {
      await eliminarMutation.mutateAsync(b.id);
      toast.success('Bloqueo eliminado correctamente.');
    } catch (err) {
      toast.error(extraerMensajeError(err, 'Error al eliminar bloqueo.'));
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      {/* Encabezado */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Bloqueos de Agenda</h1>
          <p className="mt-1 text-sm text-muted">
            Gestiona ausencias médicas (día completo o por horas), consulta qué médicos faltaron y
            atiende las citas que quedaron dentro de un bloqueo.
          </p>
        </div>
        <Button icon="ri-calendar-close-line" onClick={() => setModalNuevo(true)}>
          Registrar Bloqueo
        </Button>
      </div>

      {/* Resumen */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-card border border-line bg-surface p-4 shadow-card">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-field bg-danger-soft text-danger">
            <i className="ri-calendar-close-line text-xl" />
          </span>
          <div>
            <p className="text-2xl font-bold text-ink">{vigentes.length}</p>
            <p className="text-xs text-muted">Bloqueos vigentes</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-card border border-line bg-surface p-4 shadow-card">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-field bg-warning-soft text-warning">
            <i className="ri-alarm-warning-line text-xl" />
          </span>
          <div>
            <p className="text-2xl font-bold text-ink">{citasPorGestionar}</p>
            <p className="text-xs text-muted">Citas por gestionar</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-card border border-line bg-surface p-4 shadow-card">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-field bg-brand-50 text-brand-600">
            <i className="ri-history-line text-xl" />
          </span>
          <div>
            <p className="text-2xl font-bold text-ink">{historial.length}</p>
            <p className="text-xs text-muted">Ausencias en el historial</p>
          </div>
        </div>
      </div>

      {/* Vigentes / Historial */}
      <div
        className="mb-4 flex flex-wrap gap-2 border-b border-line"
        role="tablist"
        aria-label="Vista de bloqueos"
      >
        {(
          [
            ['VIGENTES', 'Vigentes y próximos', vigentes.length],
            ['HISTORIAL', 'Historial', historial.length],
          ] as const
        ).map(([valor, texto, cantidad]) => (
          <button
            key={valor}
            type="button"
            role="tab"
            aria-selected={vista === valor}
            onClick={() => cambiarVista(valor)}
            className={cn(
              'cursor-pointer border-b-2 px-4 py-3 text-sm font-semibold',
              vista === valor
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-muted hover:text-ink',
            )}
          >
            {texto} ({cantidad})
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-card border border-line bg-surface p-4 shadow-card">
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted">Médico:</label>
          <select
            value={medicoFiltro}
            onChange={(e) => {
              setMedicoFiltro(e.target.value);
              setDiasVisibles(DIAS_POR_PAGINA);
            }}
            className={CLASE_SELECT}
          >
            <option value="TODOS">Todos los Médicos ({medicos.length})</option>
            {medicos.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombreCompleto} — {m.cargo}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-muted">Tipo de Bloqueo:</label>
          <select
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value as TipoBloqueo | 'TODOS')}
            className={CLASE_SELECT}
          >
            <option value="TODOS">Todos los Tipos</option>
            <option value="COMPLETO">Día Completo</option>
            <option value="PARCIAL">Parcial (Por Horas)</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-muted">Desde:</label>
          <input
            type="date"
            value={desde}
            max={hasta || undefined}
            onChange={(e) => setDesde(e.target.value)}
            className={cn(CLASE_SELECT, 'font-semibold')}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-muted">Hasta:</label>
          <input
            type="date"
            value={hasta}
            min={desde || undefined}
            onChange={(e) => setHasta(e.target.value)}
            className={cn(CLASE_SELECT, 'font-semibold')}
          />
        </div>

        {hayFiltros && (
          <Button variant="ghost" size="sm" icon="ri-close-line" onClick={limpiarFiltros}>
            Limpiar
          </Button>
        )}
      </div>

      {/* Lista agrupada por día */}
      {isLoading ? (
        <div className="rounded-card border border-line bg-surface p-10 shadow-card">
          <LoadingSpinner />
        </div>
      ) : isError ? (
        <div className="rounded-card border border-danger/30 bg-danger-soft p-6 text-center text-sm text-danger">
          No se pudieron cargar los bloqueos.
        </div>
      ) : dias.length === 0 ? (
        <div className="rounded-card border border-line bg-surface shadow-card">
          <EmptyState
            icon={vista === 'VIGENTES' ? 'ri-calendar-check-line' : 'ri-history-line'}
            title={vista === 'VIGENTES' ? 'Sin bloqueos vigentes' : 'Sin ausencias en el historial'}
            message="No hay fechas bloqueadas que coincidan con los filtros seleccionados."
          />
        </div>
      ) : (
        <div className="space-y-4">
          {dias.slice(0, diasVisibles).map(([fecha, delDia]) => (
            <section
              key={fecha}
              className="overflow-hidden rounded-card border border-line bg-surface shadow-card"
            >
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-canvas px-4 py-2.5">
                <h2 className="text-sm font-bold text-ink">
                  <i className="ri-calendar-close-line mr-1.5 align-middle text-danger" />
                  {fechaLarga(fecha)}
                  {fecha === hoy && (
                    <span className="ml-2 rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                      Hoy
                    </span>
                  )}
                </h2>
                <span className="text-xs font-semibold text-muted">
                  {new Set(delDia.map((b) => b.medico_id)).size === 1
                    ? '1 médico ausente'
                    : `${new Set(delDia.map((b) => b.medico_id)).size} médicos ausentes`}
                </span>
              </header>
              <ul className="divide-y divide-line">
                {delDia.map((b) => (
                  <FilaBloqueo
                    key={b.id}
                    bloqueo={b}
                    esPasado={b.fecha < hoy}
                    eliminando={eliminarMutation.isPending}
                    onEliminar={handleEliminar}
                    onGestionar={setBloqueoAGestionar}
                  />
                ))}
              </ul>
            </section>
          ))}

          {dias.length > diasVisibles && (
            <div className="text-center">
              <Button
                variant="secondary"
                onClick={() => setDiasVisibles((n) => n + DIAS_POR_PAGINA)}
              >
                Mostrar más ({dias.length - diasVisibles} días)
              </Button>
            </div>
          )}
        </div>
      )}

      <BloqueoAgendaModal
        isOpen={modalNuevo}
        onClose={() => setModalNuevo(false)}
        onCreado={({ bloqueo, citasAfectadas }) => {
          // Si quedaron citas dentro del bloqueo, se abre de una vez para gestionarlas.
          if (citasAfectadas.length > 0) setBloqueoAGestionar(bloqueo);
        }}
      />

      <CitasAfectadasModal
        bloqueo={bloqueoAGestionar}
        onClose={() => setBloqueoAGestionar(null)}
      />
    </div>
  );
}

export default BloqueosAgendaPage;
