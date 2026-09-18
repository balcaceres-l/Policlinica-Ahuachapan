import { useMemo, useState } from 'react';
import FilaAtencion from '@/components/cita/FilaAtencion';
import Badge from '@/components/ui/Badge';
import DataTable, { type Column } from '@/components/ui/DataTable';
import SearchBar from '@/components/ui/SearchBar';
import { useCitas } from '@/hooks/cita/useCitas';
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
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Mi agenda</h1>
        <p className="mt-1 text-sm text-muted">
          Pacientes del día y orden de atención según su llegada.
        </p>
      </div>

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
