import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { useCrearConstancia } from '@/hooks/documento/useDocumentos';
import { extraerMensajeError } from '@/lib/apiError';
import {
  constanciaFormDefaults,
  constanciaSchema,
  type ConstanciaFormValues,
} from '@/lib/validations/documentoSchema';
import type { ConstanciaMedica } from '@/types/documento.types';

interface ConstanciaModalProps {
  isOpen: boolean;
  consultaId: string;
  pacienteNombre?: string | null;
  onClose: () => void;
  /** Recibe la constancia creada (para abrir su PDF). */
  onCreada: (constancia: ConstanciaMedica) => void;
}

/** HU-31 — generar una constancia médica desde la consulta. */
export function ConstanciaModal({ isOpen, consultaId, pacienteNombre, onClose, onCreada }: ConstanciaModalProps) {
  const crear = useCrearConstancia();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ConstanciaFormValues>({
    resolver: zodResolver(constanciaSchema),
    defaultValues: constanciaFormDefaults,
  });

  const cerrar = () => {
    reset(constanciaFormDefaults);
    onClose();
  };

  const onSubmit = async (valores: ConstanciaFormValues) => {
    try {
      const constancia = await crear.mutateAsync({ consultaId, motivo: valores.motivo });
      toast.success('Constancia generada.');
      reset(constanciaFormDefaults);
      onCreada(constancia);
    } catch (error) {
      setError('root', { message: extraerMensajeError(error, 'No se pudo generar la constancia.') });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={cerrar}
      title="Constancia médica"
      subtitle={pacienteNombre ? `Para ${pacienteNombre}` : undefined}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={cerrar} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button icon="ri-file-text-line" onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
            Generar constancia
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        {errors.root && (
          <div className="rounded-field border border-danger/30 bg-danger-soft p-3 text-xs text-danger">
            {errors.root.message}
          </div>
        )}
        <p className="text-xs text-muted">
          El documento lleva los datos del paciente, los tuyos y el motivo que escribas aquí.
        </p>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink">
            Motivo de la constancia <span className="text-danger">*</span>
          </label>
          <textarea
            {...register('motivo')}
            rows={5}
            placeholder="Ej. Se indica reposo en casa por 3 días por faringitis aguda."
            className="w-full rounded-field border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15"
          />
          {errors.motivo && <p className="mt-1 text-xs text-danger">{errors.motivo.message}</p>}
        </div>
      </form>
    </Modal>
  );
}

export default ConstanciaModal;
