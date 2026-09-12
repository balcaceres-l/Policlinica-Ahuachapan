import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { useActualizarHorario, useCrearHorario } from '@/hooks/horario/useHorarios';
import { extraerMensajeError } from '@/lib/apiError';
import { DIA_LABEL, DIAS_SEMANA, HORARIO_BASE_TEXTO } from '@/lib/constants/dias';
import {
  horarioFormDefaults,
  horarioSchema,
  type HorarioFormValues,
} from '@/lib/validations/horarioSchema';
import type { HorarioMedico } from '@/types/horario.types';

interface HorarioModalProps {
  isOpen: boolean;
  /** Médico dueño del bloque; el modal solo se abre con uno seleccionado. */
  medicoId: string;
  /** `null` = alta de un bloque nuevo; con valor = edición de ese bloque. */
  horario: HorarioMedico | null;
  onClose: () => void;
}

const CLASE_CAMPO =
  'h-11 w-full rounded-field border border-line bg-surface px-3 text-sm text-ink outline-none ' +
  'transition-colors placeholder:text-muted focus:border-brand-600 focus:ring-4 ' +
  'focus:ring-brand-600/15 disabled:opacity-60';

/** HU-34 — alta y edición de un bloque horario de atención. */
export function HorarioModal({ isOpen, medicoId, horario, onClose }: HorarioModalProps) {
  const crear = useCrearHorario();
  const actualizar = useActualizarHorario();
  const editando = horario !== null;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<HorarioFormValues>({
    resolver: zodResolver(horarioSchema),
    defaultValues: horarioFormDefaults,
  });

  // El mismo modal sirve para alta y edición, así que hay que recargar los
  // valores cada vez que se abre con un bloque distinto.
  useEffect(() => {
    if (!isOpen) return;

    reset(
      horario
        ? {
            dia_semana: horario.dia_semana,
            hora_inicio: horario.hora_inicio,
            hora_fin: horario.hora_fin,
          }
        : horarioFormDefaults,
    );
  }, [isOpen, horario, reset]);

  const cerrar = () => {
    reset(horarioFormDefaults);
    onClose();
  };

  const onSubmit = async (valores: HorarioFormValues) => {
    const payload = { ...valores, medico_id: medicoId };

    try {
      if (horario) {
        await actualizar.mutateAsync({ id: horario.id, payload });
        toast.success('Horario actualizado.');
      } else {
        await crear.mutateAsync(payload);
        toast.success('Horario agregado.');
      }
      cerrar();
    } catch (error) {
      setError('root', {
        message: extraerMensajeError(error, 'No se pudo guardar el horario.'),
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={cerrar}
      title={editando ? 'Editar horario' : 'Agregar horario'}
      subtitle="Define un bloque de atención dentro de la semana."
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={cerrar} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="form-horario"
            loading={isSubmitting}
            icon={editando ? 'ri-check-line' : 'ri-add-line'}
          >
            {editando ? 'Guardar cambios' : 'Agregar'}
          </Button>
        </>
      }
    >
      <form id="form-horario" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="mb-4">
          <label htmlFor="dia_semana" className="mb-1.5 block text-sm font-medium text-ink">
            Día de la semana
          </label>
          <select
            id="dia_semana"
            disabled={isSubmitting}
            className={`${CLASE_CAMPO} cursor-pointer`}
            {...register('dia_semana')}
          >
            {DIAS_SEMANA.map((dia) => (
              <option key={dia} value={dia}>
                {DIA_LABEL[dia]}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="hora_inicio" className="mb-1.5 block text-sm font-medium text-ink">
              Hora de inicio
            </label>
            <input
              id="hora_inicio"
              type="time"
              disabled={isSubmitting}
              aria-invalid={Boolean(errors.hora_inicio)}
              className={CLASE_CAMPO}
              {...register('hora_inicio')}
            />
            {errors.hora_inicio && (
              <p className="mt-1.5 text-xs text-danger">{errors.hora_inicio.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="hora_fin" className="mb-1.5 block text-sm font-medium text-ink">
              Hora de fin
            </label>
            <input
              id="hora_fin"
              type="time"
              disabled={isSubmitting}
              aria-invalid={Boolean(errors.hora_fin)}
              className={CLASE_CAMPO}
              {...register('hora_fin')}
            />
            {errors.hora_fin && (
              <p className="mt-1.5 text-xs text-danger">{errors.hora_fin.message}</p>
            )}
          </div>
        </div>

        <p className="mt-3 text-xs text-muted">{HORARIO_BASE_TEXTO}</p>

        {/* Cruce con otro bloque del mismo día */}
        {errors.root && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-field bg-danger-soft px-3 py-2.5 text-sm text-danger"
          >
            <i className="ri-error-warning-line mt-0.5 shrink-0" />
            <span>{errors.root.message}</span>
          </div>
        )}
      </form>
    </Modal>
  );
}

export default HorarioModal;
