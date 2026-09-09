import { useState } from 'react';
import ConfirmarEstadoEspecialidadModal from '@/components/especialidad/ConfirmarEstadoEspecialidadModal';
import EspecialidadModal from '@/components/especialidad/EspecialidadModal';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import DataTable from '@/components/ui/DataTable';
import type { Column } from '@/components/ui/DataTable';
import { useEspecialidades } from '@/hooks/especialidad/useEspecialidades';
import { cn } from '@/lib/utils';
import type { Especialidad } from '@/types/especialidad.types';

export function EspecialidadesPage() {
  const { data: especialidades = [], isLoading } = useEspecialidades();

  const [modalAbierto, setModalAbierto] = useState(false);
  const [enEdicion, setEnEdicion] = useState<Especialidad | null>(null);
  const [enCambioEstado, setEnCambioEstado] = useState<Especialidad | null>(null);

  const abrirAlta = () => {
    setEnEdicion(null);
    setModalAbierto(true);
  };

  /** HU-07 */
  const abrirEdicion = (especialidad: Especialidad) => {
    setEnEdicion(especialidad);
    setModalAbierto(true);
  };

  const columnas: Array<Column<Especialidad>> = [
    {
      key: 'nombre',
      header: 'Especialidad',
      render: (esp) => (
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-field bg-brand-50 text-brand-600">
            <i className="ri-stethoscope-line text-base" />
          </span>
          <span className="font-semibold text-ink">{esp.nombre}</span>
        </div>
      ),
    },
    {
      key: 'descripcion',
      header: 'Descripción',
      render: (esp) => (
        <span className="text-muted">
          {esp.descripcion || <span className="italic opacity-60">Sin descripción</span>}
        </span>
      ),
    },
    {
      key: 'medicos',
      header: 'Médicos',
      className: 'w-32',
      render: (esp) => (
        <Badge variant={esp.cantidadMedicos > 0 ? 'info' : 'default'}>
          {esp.cantidadMedicos} {esp.cantidadMedicos === 1 ? 'médico' : 'médicos'}
        </Badge>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      className: 'w-32',
      render: (esp) => (
        <Badge dot variant={esp.estado === 'ACTIVA' ? 'success' : 'danger'}>
          {esp.estado === 'ACTIVA' ? 'Activa' : 'Inactiva'}
        </Badge>
      ),
    },
    {
      key: 'acciones',
      header: 'Acciones',
      className: 'w-28 text-right',
      render: (esp) => (
        <div className="flex justify-end gap-1">
          <button
            type="button"
            onClick={() => abrirEdicion(esp)}
            title="Editar especialidad"
            className="flex size-8 cursor-pointer items-center justify-center rounded-field text-muted transition-colors hover:bg-brand-50 hover:text-brand-600"
          >
            <i className="ri-pencil-line text-base" />
          </button>
          <button
            type="button"
            onClick={() => setEnCambioEstado(esp)}
            title={esp.estado === 'ACTIVA' ? 'Desactivar especialidad' : 'Activar especialidad'}
            className={cn(
              'flex size-8 cursor-pointer items-center justify-center rounded-field',
              'text-muted transition-colors',
              esp.estado === 'ACTIVA'
                ? 'hover:bg-danger-soft hover:text-danger'
                : 'hover:bg-success-soft hover:text-success',
            )}
          >
            <i
              className={cn(
                'text-base',
                esp.estado === 'ACTIVA' ? 'ri-forbid-line' : 'ri-checkbox-circle-line',
              )}
            />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Especialidades Médicas</h1>
          <p className="mt-1 text-sm text-muted">
            Catálogo de servicios que ofrece la Policlínica Ahuachapaneca.
          </p>
        </div>
        <Button icon="ri-add-line" onClick={abrirAlta}>
          Nueva Especialidad
        </Button>
      </div>

      <DataTable
        columns={columnas}
        data={especialidades}
        keyExtractor={(esp) => esp.id}
        isLoading={isLoading}
        emptyIcon="ri-stethoscope-line"
        emptyTitle="Aún no hay especialidades"
        emptyMessage="Registra la primera especialidad para comenzar a construir el catálogo."
      />

      <EspecialidadModal
        isOpen={modalAbierto}
        especialidad={enEdicion}
        onClose={() => setModalAbierto(false)}
      />

      <ConfirmarEstadoEspecialidadModal
        especialidad={enCambioEstado}
        onClose={() => setEnCambioEstado(null)}
      />
    </div>
  );
}

export default EspecialidadesPage;
