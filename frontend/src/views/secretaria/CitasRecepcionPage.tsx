import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import AgendarCitaModal from '@/components/cita/AgendarCitaModal';
import AlertaRetrasoPacientes from '@/components/cita/AlertaRetrasoPacientes';
import CancelarCitaModal from '@/components/cita/CancelarCitaModal';
import ReprogramarCitaModal from '@/components/cita/ReprogramarCitaModal';
import ReubicarPorAtrasoModal from '@/components/cita/ReubicarPorAtrasoModal';
import SignosVitalesModal from '@/components/cita/SignosVitalesModal';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import DataTable, { type Column } from '@/components/ui/DataTable';
import SearchBar from '@/components/ui/SearchBar';
import { useCitas, useMarcarLlegada } from '@/hooks/cita/useCitas';
import { useMedicos } from '@/hooks/usuario/useUsuarios';
import { mockMedicos } from '@/services/mockData';
import { cn, minutosTranscurridosDesde, normalizar } from '@/lib/utils';
import {
  ESTADO_CITA_LABEL,
  TIPO_CITA_LABEL,
  type Cita,
  type EstadoCita,
  type TipoCita,
} from '@/types/cita.types';

/** AC-43 de HU-38: umbral desde el que se considera que un paciente está atrasado. */
const UMBRAL_RETRASO_MIN = 20;

const obtenerFechaLocal = (d = new Date()) => {
  const anio = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
};

export function CitasRecepcionPage() {
  const hoyStr = useMemo(() => obtenerFechaLocal(), []);

  const [busqueda, setBusqueda] = useState('');
  const [fechaFiltro, setFechaFiltro] = useState(hoyStr);
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoCita | 'TODOS'>('TODOS');
  const [medicoFiltro, setMedicoFiltro] = useState<number | 'TODOS'>('TODOS');
  const [tipoCitaFiltro, setTipoCitaFiltro] = useState<TipoCita | 'TODOS'>('TODOS');

  // Modales
  const [modalAgendar, setModalAgendar] = useState(false);
  const [modalReubicarAtraso, setModalReubicarAtraso] = useState(false);
  const [citaAReprogramar, setCitaAReprogramar] = useState<Cita | null>(null);
  const [citaACancelar, setCitaACancelar] = useState<Cita | null>(null);
  const [citaSignosVitales, setCitaSignosVitales] = useState<Cita | null>(null);

  const { data: medicos = mockMedicos } = useMedicos();
  const { data: citas = [], isLoading } = useCitas({
    fecha: fechaFiltro || undefined,
    estado: estadoFiltro,
  });

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

  const citasFiltradas = useMemo(() => {
    const termino = normalizar(busqueda);

    return citas.filter((c) => {
      const coincideTexto =
        !termino ||
        normalizar(c.pacienteNombre).includes(termino) ||
        normalizar(c.pacienteExpediente).includes(termino) ||
        normalizar(c.medicoNombre).includes(termino);

      const coincideMedico =
        medicoFiltro === 'TODOS' || c.medico_id === medicoFiltro;

      const coincideTipo =
        tipoCitaFiltro === 'TODOS' || c.tipo_cita === tipoCitaFiltro;

      return coincideTexto && coincideMedico && coincideTipo;
    });
  }, [citas, busqueda, medicoFiltro, tipoCitaFiltro]);

  // Métricas rápidas
  const totalHoy = citas.length;
  const enEspera = citas.filter((c) => c.estado === 'EN_ESPERA').length;
  const atendidas = citas.filter((c) => c.estado === 'ATENDIDA').length;

  const columns: Column<Cita>[] = [
    {
      key: 'horario',
      header: 'Horario',
      className: 'w-28 font-semibold text-ink',
      render: (cita) => {
        // HU-38: marca visualmente la cita de hoy que superó los 20 min de retraso.
        const conRetraso =
          cita.estado === 'AGENDADA' &&
          !cita.hora_llegada &&
          cita.fecha === hoyStr &&
          minutosTranscurridosDesde(cita.hora_inicio) > UMBRAL_RETRASO_MIN;

        return (
          <div>
            <span>{cita.hora_inicio} - {cita.hora_fin}</span>
            {cita.fecha !== hoyStr && (
              <p className="text-[10px] text-brand-600 font-semibold">{cita.fecha}</p>
            )}
            {cita.hora_llegada && (
              <p className="text-[10px] text-muted">Llegó: {cita.hora_llegada}</p>
            )}
            {conRetraso && (
              <p className="mt-0.5 flex items-center gap-1 text-[10px] font-bold uppercase text-danger">
                <i className="ri-alarm-warning-line" /> Con retraso
              </p>
            )}
          </div>
        );
      },
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
          className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${
            cita.tipo_cita === 'EMERGENCIA'
              ? 'bg-danger-soft text-danger'
              : cita.tipo_cita === 'SOBRECUPO'
                ? 'bg-warning-soft text-warning'
                : 'bg-brand-50 text-brand-700'
          }`}
        >
          {TIPO_CITA_LABEL[cita.tipo_cita]}
        </span>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (cita) => (
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
      ),
    },
    {
      key: 'acciones',
      header: 'Acciones',
      className: 'w-44 text-right',
      render: (cita) => (
        <div className="flex justify-end gap-1">
          {/* Tomar signos vitales para citas con estado AGENDADA */}
          {cita.estado === 'AGENDADA' && (
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
          <h1 className="text-2xl font-bold text-ink">Citas y Agendamiento</h1>
          <p className="mt-1 text-sm text-muted">
            Registro de citas, confirmación de sala de espera y control del flujo de pacientes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            icon="ri-time-line"
            onClick={() => setModalReubicarAtraso(true)}
          >
            Registrar atraso de médico
          </Button>
          <Button icon="ri-calendar-check-line" onClick={() => setModalAgendar(true)}>
            Nueva Cita
          </Button>
        </div>
      </div>

      {/* Alerta de retraso del paciente (HU-38) */}
      <AlertaRetrasoPacientes />

      {/* Tarjetas de métricas rápidas */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-card border border-line bg-surface p-4 shadow-card">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-field bg-brand-50 text-brand-600">
            <i className="ri-calendar-event-line text-xl" />
          </span>
          <div>
            <p className="text-2xl font-bold text-ink">{totalHoy}</p>
            <p className="text-xs text-muted">Citas en la fecha</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-card border border-line bg-surface p-4 shadow-card">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-field bg-info-soft text-info">
            <i className="ri-user-received-2-line text-xl" />
          </span>
          <div>
            <p className="text-2xl font-bold text-ink">{enEspera}</p>
            <p className="text-xs text-muted">En sala de espera</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-card border border-line bg-surface p-4 shadow-card">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-field bg-success-soft text-success">
            <i className="ri-checkbox-circle-line text-xl" />
          </span>
          <div>
            <p className="text-2xl font-bold text-ink">{atendidas}</p>
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
          className="min-w-[220px] flex-1"
        />

        <div className="flex items-center gap-1">
          <input
            type="date"
            value={fechaFiltro}
            onChange={(e) => setFechaFiltro(e.target.value)}
            className="h-10 rounded-field border border-line bg-surface px-3 text-xs font-semibold text-ink outline-none focus:border-brand-600"
          />
          {fechaFiltro && (
            <button
              type="button"
              onClick={() => setFechaFiltro('')}
              title="Ver todas las fechas"
              className="flex size-9 cursor-pointer items-center justify-center rounded-field border border-line text-muted hover:bg-canvas"
            >
              <i className="ri-close-line text-base" />
            </button>
          )}
        </div>

        {/* Filtro por Médico */}
        <select
          value={medicoFiltro}
          onChange={(e) =>
            setMedicoFiltro(e.target.value === 'TODOS' ? 'TODOS' : Number(e.target.value))
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
          onChange={(e) => setTipoCitaFiltro(e.target.value as TipoCita | 'TODOS')}
          className="h-10 rounded-field border border-line bg-surface px-3 text-xs font-medium text-ink outline-none focus:border-brand-600"
        >
          <option value="TODOS">Todos los Tipos</option>
          <option value="REGULAR">Regular</option>
          <option value="EMERGENCIA">Emergencia</option>
          <option value="SOBRECUPO">Sobrecupo</option>
        </select>

        {/* Filtro por Estado */}
        <select
          value={estadoFiltro}
          onChange={(e) => setEstadoFiltro(e.target.value as EstadoCita | 'TODOS')}
          className="h-10 rounded-field border border-line bg-surface px-3 text-xs font-medium text-ink outline-none focus:border-brand-600"
        >
          <option value="TODOS">Todos los Estados</option>
          <option value="AGENDADA">Agendada</option>
          <option value="EN_ESPERA">En espera</option>
          <option value="EN_ATENCION">En atención</option>
          <option value="ATENDIDA">Atendida</option>
          <option value="CANCELADA">Cancelada</option>
        </select>
      </div>

      {/* Tabla de Citas */}
      <DataTable
        columns={columns}
        data={citasFiltradas}
        keyExtractor={(c) => c.id}
        isLoading={isLoading}
        emptyIcon="ri-calendar-line"
        emptyTitle="Sin citas encontradas"
        emptyMessage="No hay citas registradas que coincidan con la fecha o filtros seleccionados."
      />

      {/* Modales */}
      <AgendarCitaModal
        isOpen={modalAgendar}
        onClose={() => setModalAgendar(false)}
        fechaPredeterminada={fechaFiltro || hoyStr}
      />

      <ReprogramarCitaModal
        cita={citaAReprogramar}
        isOpen={citaAReprogramar !== null}
        onClose={() => setCitaAReprogramar(null)}
      />

      <ReubicarPorAtrasoModal
        isOpen={modalReubicarAtraso}
        onClose={() => setModalReubicarAtraso(false)}
        fechaPredeterminada={fechaFiltro || hoyStr}
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
    </div>
  );
}

export default CitasRecepcionPage;
