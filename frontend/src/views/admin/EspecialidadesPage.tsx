import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import type { Column } from '@/components/ui/DataTable';
import { useCrearEspecialidad, useEspecialidades } from '@/hooks/especialidad/useEspecialidades';
import {
  especialidadFormDefaults,
  especialidadSchema,
} from '@/lib/validations/especialidadSchema';
import type { EspecialidadFormValues } from '@/lib/validations/especialidadSchema';
import { cn, normalizar } from '@/lib/utils';
import type { Especialidad } from '@/types/especialidad.types';

export function EspecialidadesPage() {
  const [modalAbierto, setModalAbierto] = useState(false);
  const { data: especialidades = [], isLoading } = useEspecialidades();
  const crear = useCrearEspecialidad();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors },
  } = useForm<EspecialidadFormValues>({
    resolver: zodResolver(especialidadSchema),
    defaultValues: especialidadFormDefaults,
    mode: 'onBlur',
  });

  const descripcion = watch('descripcion');

  const cerrarModal = () => {
    setModalAbierto(false);
    reset(especialidadFormDefaults);
  };

  const onSubmit = (valores: EspecialidadFormValues) => {
    // Regla de negocio: no se permiten nombres duplicados
    const duplicada = especialidades.some(
      (esp) => normalizar(esp.nombre) === normalizar(valores.nombre),
    );

    if (duplicada) {
      setError('nombre', {
        type: 'manual',
        message: 'Ya existe una especialidad registrada con ese nombre.',
      });
      return;
    }

    crear.mutate(
      { nombre: valores.nombre, descripcion: valores.descripcion },
      {
        onSuccess: (nueva) => {
          toast.success(`Especialidad "${nueva.nombre}" registrada correctamente.`);
          cerrarModal();
        },
        onError: (error: Error) => {
          toast.error(error.message || 'No se pudo registrar la especialidad.');
        },
      },
    );
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
        <Button icon="ri-add-line" onClick={() => setModalAbierto(true)}>
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

      <Modal
        isOpen={modalAbierto}
        onClose={cerrarModal}
        title="Nueva Especialidad"
        subtitle="Registra un servicio médico en el catálogo de la policlínica."
        footer={
          <>
            <Button variant="secondary" onClick={cerrarModal} disabled={crear.isPending}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="form-especialidad"
              icon="ri-check-line"
              loading={crear.isPending}
            >
              Registrar
            </Button>
          </>
        }
      >
        <form
          id="form-especialidad"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div>
            <label htmlFor="nombre" className="mb-1.5 block text-sm font-semibold text-ink">
              Nombre de la especialidad <span className="text-danger">*</span>
            </label>
            <input
              id="nombre"
              type="text"
              autoFocus
              placeholder="Ej. Cardiología"
              {...register('nombre')}
              className={cn(
                'h-10 w-full rounded-field border bg-surface px-3 text-sm text-ink placeholder:text-muted',
                'focus:outline-none focus:ring-4',
                errors.nombre
                  ? 'border-danger focus:ring-danger/15'
                  : 'border-line focus:border-brand-400 focus:ring-brand-600/10',
              )}
            />
            {errors.nombre && (
              <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-danger">
                <i className="ri-error-warning-line" />
                {errors.nombre.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="descripcion" className="mb-1.5 block text-sm font-semibold text-ink">
              Descripción <span className="font-normal text-muted">(opcional)</span>
            </label>
            <textarea
              id="descripcion"
              rows={3}
              placeholder="Breve descripción del servicio que se ofrece..."
              {...register('descripcion')}
              className={cn(
                'w-full resize-none rounded-field border bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted',
                'focus:outline-none focus:ring-4',
                errors.descripcion
                  ? 'border-danger focus:ring-danger/15'
                  : 'border-line focus:border-brand-400 focus:ring-brand-600/10',
              )}
            />
            <div className="mt-1.5 flex items-center justify-between">
              {errors.descripcion ? (
                <p className="flex items-center gap-1 text-xs font-medium text-danger">
                  <i className="ri-error-warning-line" />
                  {errors.descripcion.message}
                </p>
              ) : (
                <span />
              )}
              <span className="text-xs text-muted">{descripcion?.length ?? 0}/200</span>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default EspecialidadesPage;
