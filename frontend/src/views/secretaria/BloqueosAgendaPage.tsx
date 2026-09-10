import { useState } from 'react';
import toast from 'react-hot-toast';
import BloqueoAgendaModal from '@/components/bloqueo/BloqueoAgendaModal';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import DataTable, { type Column } from '@/components/ui/DataTable';
import { useBloqueos, useEliminarBloqueo } from '@/hooks/bloqueo/useBloqueos';
import { useMedicos } from '@/hooks/usuario/useUsuarios';
import { mockMedicos } from '@/services/mockData';
import type { BloqueoAgenda, TipoBloqueo } from '@/types/bloqueo.types';

export function BloqueosAgendaPage() {
  const [medicoFiltro, setMedicoFiltro] = useState<number | 'TODOS'>('TODOS');
  const [fechaFiltro, setFechaFiltro] = useState('');
  const [tipoBloqueoFiltro, setTipoBloqueoFiltro] = useState<TipoBloqueo | 'TODOS'>('TODOS');
  const [modalNuevo, setModalNuevo] = useState(false);

  const { data: medicos = mockMedicos } = useMedicos();
  const { data: bloqueos = [], isLoading } = useBloqueos({
    medicoId: medicoFiltro === 'TODOS' ? undefined : medicoFiltro,
    fecha: fechaFiltro || undefined,
    tipoBloqueo: tipoBloqueoFiltro,
  });
  const eliminarMutation = useEliminarBloqueo();

  const handleEliminar = async (b: BloqueoAgenda) => {
    if (!window.confirm(`¿Deseas desbloquear la fecha ${b.fecha} para ${b.medicoNombre}?`)) {
      return;
    }

    try {
      await eliminarMutation.mutateAsync(b.id);
      toast.success('Bloqueo eliminado correctamente.');
    } catch {
      toast.error('Error al eliminar bloqueo.');
    }
  };

  const columns: Column<BloqueoAgenda>[] = [
    {
      key: 'medico',
      header: 'Médico',
      render: (b) => (
        <div>
          <p className="font-semibold text-ink">{b.medicoNombre}</p>
        </div>
      ),
    },
    {
      key: 'fecha',
      header: 'Fecha Bloqueada',
      className: 'w-36 font-semibold text-danger',
      render: (b) => (
        <span className="inline-flex items-center gap-1.5 rounded-field bg-danger-soft px-2.5 py-1 text-xs font-bold text-danger">
          <i className="ri-calendar-close-line" />
          {b.fecha}
        </span>
      ),
    },
    {
      key: 'tipo',
      header: 'Tipo de Bloqueo',
      className: 'w-36',
      render: (b) => (
        <Badge variant={b.tipo_bloqueo === 'COMPLETO' ? 'danger' : 'warning'}>
          {b.tipo_bloqueo === 'COMPLETO' ? 'Día Completo' : 'Parcial'}
        </Badge>
      ),
    },
    {
      key: 'horario',
      header: 'Horario',
      className: 'w-36 font-medium text-ink',
      render: (b) =>
        b.tipo_bloqueo === 'PARCIAL' && b.hora_inicio && b.hora_fin ? (
          <span className="inline-flex items-center gap-1 rounded bg-warning-soft px-2 py-0.5 text-xs font-semibold text-warning">
            <i className="ri-time-line text-xs" />
            {b.hora_inicio} - {b.hora_fin}
          </span>
        ) : (
          <span className="text-xs text-muted">Todo el día</span>
        ),
    },
    {
      key: 'motivo',
      header: 'Motivo de Ausencia',
      render: (b) => <p className="text-sm text-ink">{b.motivo}</p>,
    },
    {
      key: 'creacion',
      header: 'Registrado El',
      className: 'w-32 text-xs text-muted',
      render: (b) => b.fecha_creacion,
    },
    {
      key: 'acciones',
      header: 'Acciones',
      className: 'w-24 text-right',
      render: (b) => (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => handleEliminar(b)}
            title="Eliminar bloqueo"
            disabled={eliminarMutation.isPending}
            className="flex size-8 cursor-pointer items-center justify-center rounded-field text-muted transition-colors hover:bg-danger-soft hover:text-danger"
          >
            <i className="ri-delete-bin-line text-base" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      {/* Encabezado */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Bloqueos de Agenda</h1>
          <p className="mt-1 text-sm text-muted">
            Gestiona ausencias médicas y fechas inhábiles (completas o por horas) para prevenir agendamientos no deseados.
          </p>
        </div>
        <Button icon="ri-calendar-close-line" onClick={() => setModalNuevo(true)}>
          Registrar Bloqueo
        </Button>
      </div>

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-card border border-line bg-surface p-4 shadow-card">
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted">Médico:</label>
          <select
            value={medicoFiltro}
            onChange={(e) =>
              setMedicoFiltro(e.target.value === 'TODOS' ? 'TODOS' : Number(e.target.value))
            }
            className="h-10 rounded-field border border-line bg-surface px-3 text-xs font-medium text-ink outline-none focus:border-brand-600"
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
          <label className="mb-1 block text-xs font-semibold text-muted">Fecha:</label>
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
                title="Limpiar fecha"
                className="flex size-9 cursor-pointer items-center justify-center rounded-field border border-line text-muted hover:bg-canvas"
              >
                <i className="ri-close-line text-base" />
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-muted">Tipo de Bloqueo:</label>
          <select
            value={tipoBloqueoFiltro}
            onChange={(e) => setTipoBloqueoFiltro(e.target.value as TipoBloqueo | 'TODOS')}
            className="h-10 rounded-field border border-line bg-surface px-3 text-xs font-medium text-ink outline-none focus:border-brand-600"
          >
            <option value="TODOS">Todos los Tipos</option>
            <option value="COMPLETO">Día Completo</option>
            <option value="PARCIAL">Parcial (Por Horas)</option>
          </select>
        </div>
      </div>

      {/* Tabla de Bloqueos */}
      <DataTable
        columns={columns}
        data={bloqueos}
        keyExtractor={(b) => b.id}
        isLoading={isLoading}
        emptyIcon="ri-calendar-check-line"
        emptyTitle="Sin bloqueos activos"
        emptyMessage="No hay fechas bloqueadas que coincidan con los filtros seleccionados."
      />

      <BloqueoAgendaModal isOpen={modalNuevo} onClose={() => setModalNuevo(false)} />
    </div>
  );
}

export default BloqueosAgendaPage;
