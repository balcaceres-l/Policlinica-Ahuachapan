import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { extraerMensajeError } from '@/lib/apiError';
import {
  cambiarPasswordDefaults,
  cambiarPasswordSchema,
  type CambiarPasswordFormValues,
} from '@/lib/validations/cambiarPasswordSchema';
import { cambiarPassword } from '@/services/auth/auth.service';

interface CambiarPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CLASE_INPUT =
  'h-11 w-full rounded-field border border-line bg-surface px-3 text-sm text-ink outline-none ' +
  'transition-colors placeholder:text-muted focus:border-brand-600 focus:ring-4 ' +
  'focus:ring-brand-600/15 disabled:opacity-60';

export function CambiarPasswordModal({ isOpen, onClose }: CambiarPasswordModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CambiarPasswordFormValues>({
    resolver: zodResolver(cambiarPasswordSchema),
    defaultValues: cambiarPasswordDefaults,
  });

  const cerrar = () => {
    reset(cambiarPasswordDefaults);
    onClose();
  };

  const onSubmit = async (valores: CambiarPasswordFormValues) => {
    try {
      await cambiarPassword(valores);
      toast.success('Contraseña actualizada correctamente.');
      cerrar();
    } catch (error) {
      setError('root', {
        message: extraerMensajeError(error, 'No se pudo cambiar la contraseña.'),
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={cerrar}
      title="Cambiar contraseña"
      subtitle="Se cerrarán tus demás sesiones activas."
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={cerrar} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="form-cambiar-password"
            loading={isSubmitting}
            icon="ri-key-2-line"
          >
            Guardar
          </Button>
        </>
      }
    >
      <form id="form-cambiar-password" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="mb-4">
          <label htmlFor="password_actual" className="mb-1.5 block text-sm font-medium text-ink">
            Contraseña actual
          </label>
          <input
            id="password_actual"
            type="password"
            autoComplete="current-password"
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.password_actual)}
            className={CLASE_INPUT}
            {...register('password_actual')}
          />
          {errors.password_actual && (
            <p className="mt-1.5 text-xs text-danger">{errors.password_actual.message}</p>
          )}
        </div>

        <div className="mb-4">
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink">
            Nueva contraseña
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.password)}
            className={CLASE_INPUT}
            {...register('password')}
          />
          {errors.password ? (
            <p className="mt-1.5 text-xs text-danger">{errors.password.message}</p>
          ) : (
            <p className="mt-1.5 text-xs text-muted">
              Mínimo 8 caracteres, con al menos una letra y un número.
            </p>
          )}
        </div>

        <div className="mb-1">
          <label
            htmlFor="password_confirmation"
            className="mb-1.5 block text-sm font-medium text-ink"
          >
            Confirmar nueva contraseña
          </label>
          <input
            id="password_confirmation"
            type="password"
            autoComplete="new-password"
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.password_confirmation)}
            className={CLASE_INPUT}
            {...register('password_confirmation')}
          />
          {errors.password_confirmation && (
            <p className="mt-1.5 text-xs text-danger">{errors.password_confirmation.message}</p>
          )}
        </div>

        {/* Contraseña actual incorrecta o política no cumplida */}
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

export default CambiarPasswordModal;
