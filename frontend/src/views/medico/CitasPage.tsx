import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import FilaAtencion from '@/components/cita/FilaAtencion';
import Badge from '@/components/ui/Badge';
import DataTable, { type Column } from '@/components/ui/DataTable';
import SearchBar from '@/components/ui/SearchBar';
import { useCitas } from '@/hooks/cita/useCitas';
import { lapsoDeBloqueo } from '@/lib/bloqueo';
import { normalizar } from '@/lib/utils';
import { ESTADO_CITA_LABEL, TIPO_CITA_LABEL, type Cita } from '@/types/cita.types';

const fechaLocal = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function CitasPage() {
  const hoy = useMemo(() => fechaLocal(), []);

  const [busqueda, setBusqueda] = useState('');
  const [fecha, setFecha] = useState(hoy);

  // El backend ya limita al médico autenticado a su propia agenda.
  const { data: citas = [], isLoading } = useCitas({ fecha });

  const citaEnAtencion = citas.find((c) => c.estado === 'EN_ATENCION');

  const filtradas = useMemo(() => {
    const termino = normalizar(busqueda);
    if (!termino) return citas;

    return citas.filter(
      (c) =>
        normalizar(c.pacienteNombre).includes(termino) ||
        normalizar(c.pacienteExpediente).includes(termino),
    );
  }, [citas, busqueda]);

  const columnas: Column<Cita>[] = [
    {
      key: 'horario',
      header: 'Horario',
      className: 'w-28 font-semibold text-ink',
      render: (cita) => (
        <div>
          <span>
            {cita.hora_inicio} - {cita.hora_fin}
          </span>
          {cita.minutos_retraso > 0 && (
            <p className="text-[10px] font-bold text-danger">
              <i className="ri-alarm-warning-line mr-0.5 align-middle" />
              {cita.minutos_retraso} min de retraso
            </p>
          )}
          {cita.afectada_por_bloqueo && cita.bloqueo && (
            <p
              className="mt-0.5 text-[10px] font-bold text-warning"
              title="Esta cita cae dentro de un bloqueo de tu agenda; recepción contactará al paciente."
            >
              <i className="ri-calendar-close-line mr-0.5 align-middle" />
              En bloqueo ({lapsoDeBloqueo(cita.bloqueo)})
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'turno',
      header: 'Turno',
      className: 'w-20 text-center',
      render: (cita) =>
        cita.orden_atencion ? (
          <span className="inline-flex size-7 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
            {cita.orden_atencion}
          </span>
        ) : (
          <span className="text-xs text-muted">—</span>
        ),
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
      key: 'tipo',
      header: 'Tipo',
      render: (cita) => (
        <span className="text-xs text-muted">{TIPO_CITA_LABEL[cita.tipo_cita]}</span>
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
      className: 'w-36 text-right',
      render: (cita) => {
        if (cita.estado === 'EN_ATENCION' && cita.consulta_id) {
          return (
            <Link
              to={`/medico/consulta/${cita.consulta_id}`}
              className="inline-flex items-center gap-1.5 rounded-field bg-brand-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-brand-700 transition-colors"
            >
              <i className="ri-play-circle-fill text-sm" />
              Retomar
            </Link>
          );
        }
        if (cita.consulta_id) {
          return (
            <Link
              to={`/medico/consulta/${cita.consulta_id}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 underline hover:text-brand-900"
            >
              <i className="ri-eye-line" />
              Ver consulta
            </Link>
          );
        }
        return <span className="text-xs text-muted">—</span>;
      },
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Mi agenda</h1>
        <p className="mt-1 text-sm text-muted">
          Pacientes del día y orden de atención según su llegada.
        </p>
      </div>

      {/* Banner destacado si hay una consulta activa / pausada para retomar */}
      {citaEnAtencion && (
        <div className="mb-6 rounded-card border-2 border-brand-500 bg-brand-50/80 p-5 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-full bg-brand-600 text-white text-xl shadow-sm">
                <i className="ri-stethoscope-fill" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800">
                    <span className="size-2 rounded-full bg-blue-600 animate-pulse" />
                    Consulta en curso
                  </span>
                  <span className="text-xs text-muted">
                    Horario de cita: {citaEnAtencion.hora_inicio} - {citaEnAtencion.hora_fin}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-ink mt-0.5">
                  {citaEnAtencion.pacienteNombre}
                </h2>
                <p className="text-xs text-muted">
                  Expediente: <span className="font-mono font-semibold text-ink">{citaEnAtencion.pacienteExpediente}</span>
                  {citaEnAtencion.especialidadNombre && (
                    <span> · Especialidad: <span className="font-medium text-ink">{citaEnAtencion.especialidadNombre}</span></span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {citaEnAtencion.consulta_id ? (
                <Link
                  to={`/medico/consulta/${citaEnAtencion.consulta_id}`}
                  className="inline-flex items-center gap-2 rounded-field bg-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-brand-700 transition-colors"
                >
                  <i className="ri-play-circle-fill text-lg" />
                  Retomar Consulta
                </Link>
              ) : (
                <span className="text-xs text-muted italic">Iniciando consulta...</span>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <FilaAtencion citas={citas} mostrarMedico={false} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-card border border-line bg-surface p-4 shadow-card">
        <SearchBar
          value={busqueda}
          onChange={setBusqueda}
          placeholder="Buscar por paciente o expediente..."
          className="min-w-[240px] flex-1"
        />
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="h-10 rounded-field border border-line bg-surface px-3 text-sm text-ink focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-600/10"
        />
      </div>

      <DataTable
        columns={columnas}
        data={filtradas}
        keyExtractor={(c) => c.id}
        isLoading={isLoading}
        emptyIcon="ri-calendar-line"
        emptyTitle="Sin citas para esta fecha"
        emptyMessage="Las citas que recepción agende en tu agenda aparecerán aquí."
      />
    </div>
  );
}

export default CitasPage;
