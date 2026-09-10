import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import {
  useActualizarEspecialidad,
  useCrearEspecialidad,
} from '@/hooks/especialidad/useEspecialidades';
import { extraerMensajeError } from '@/lib/apiError';
import { cn } from '@/lib/utils';
import {
  especialidadFormDefaults,
  especialidadSchema,
  type EspecialidadFormValues,
} from '@/lib/validations/especialidadSchema';
import type { Especialidad } from '@/types/especialidad.types';

interface EspecialidadModalProps {
  isOpen: boolean;
  /** `null` = registro de una especialidad nueva; con valor = edición. */
  especialidad: Especialidad | null;
  onClose: () => void;
}

/** HU-07 — registro y edición de especialidades médicas. */
export function EspecialidadModal({ isOpen, especialidad, onClose }: EspecialidadModalProps) {
  const crear = useCrearEspecialidad();
  const actualizar = useActualizarEspecialidad();
  const editando = especialidad !== null;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EspecialidadFormValues>({
    resolver: zodResolver(especialidadSchema),
    defaultValues: especialidadFormDefaults,
    mode: 'onBlur',
  });

  const descripcion = watch('descripcion');

  // El mismo modal sirve para alta y edición: hay que recargar los valores
  // cada vez que se abre con una especialidad distinta.
  useEffect(() => {
    if (!isOpen) return;

    reset(
      especialidad
        ? { nombre: especialidad.nombre, descripcion: especialidad.descripcion }
        : especialidadFormDefaults,
    );
  }, [isOpen, especialidad, reset]);

  const cerrar = () => {
    reset(especialidadFormDefaults);
    onClose();
  };

  const onSubmit = async (valores: EspecialidadFormValues) => {
    try {
      if (especialidad) {
        const actualizada = await actualizar.mutateAsync({
          id: especialidad.id,
          payload: valores,
        });
        toast.success(`Especialidad "${actualizada.nombre}" actualizada correctamente.`);
      } else {
        const nueva = await crear.mutateAsync(valores);
        toast.success(`Especialidad "${nueva.nombre}" registrada correctamente.`);
      }
      cerrar();
    } catch (error) {
      setError('root', {
        message: extraerMensajeError(error, 'No se pudo guardar la especialidad.'),
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={cerrar}
      title={editando ? 'Editar Especialidad' : 'Nueva Especialidad'}
      subtitle={
        editando
          ? 'Actualiza el nombre o la descripción del servicio.'
          : 'Registra un servicio médico en el catálogo de la policlínica.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={cerrar} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="form-especialidad"
            icon="ri-check-line"
            loading={isSubmitting}
          >
            {editando ? 'Guardar cambios' : 'Registrar'}
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
            disabled={isSubmitting}
            placeholder="Ej. Cardiología"
            {...register('nombre')}
            className={cn(
              'h-10 w-full rounded-field border bg-surface px-3 text-sm text-ink placeholder:text-muted',
              'focus:outline-none focus:ring-4 disabled:opacity-60',
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
            disabled={isSubmitting}
            placeholder="Breve descripción del servicio que se ofrece..."
            {...register('descripcion')}
            className={cn(
              'w-full resize-none rounded-field border bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted',
              'focus:outline-none focus:ring-4 disabled:opacity-60',
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

        {/* Nombre duplicado u otro rechazo del servidor */}
        {errors.root && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-field bg-danger-soft px-3 py-2.5 text-sm text-danger"
          >
            <i className="ri-error-warning-line mt-0.5 shrink-0" />
            <span>{errors.root.message}</span>
          </div>
        )}
      </form>
    </Modal>
  );
}

export default EspecialidadModal;
