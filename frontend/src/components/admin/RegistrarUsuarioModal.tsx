import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { useCrearUsuario, useUsuarios } from '@/hooks/usuario/useUsuarios';
import { extraerMensajeError } from '@/lib/apiError';
import { ROL_LABEL } from '@/lib/constants/roles';
import { normalizar } from '@/lib/utils';
import {
  registrarUsuarioDefaults,
  registrarUsuarioSchema,
  type RegistrarUsuarioFormValues,
} from '@/lib/validations/usuarioSchema';
import type { RolUsuario } from '@/types/user.types';

interface RegistrarUsuarioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CLASE_INPUT =
  'h-11 w-full rounded-field border border-line bg-surface px-3 text-sm text-ink outline-none ' +
  'transition-colors placeholder:text-muted focus:border-brand-600 focus:ring-4 ' +
  'focus:ring-brand-600/15 disabled:opacity-60';

const ROLES_SELECCIONABLES: RolUsuario[] = ['MEDICO', 'RECEPCIONISTA', 'ADMINISTRADOR'];

/** El cargo es texto descriptivo; la especialidad real del médico se asigna en HU-08. */
const PLACEHOLDER_CARGO: Record<RolUsuario, string> = {
  MEDICO: 'Ej. Ginecología',
  RECEPCIONISTA: 'Ej. Recepción Principal',
  ADMINISTRADOR: 'Ej. Coordinación TI',
};

/** HU-03 — el administrador registra una cuenta de usuario nueva (RF-03). */
export function RegistrarUsuarioModal({ isOpen, onClose }: RegistrarUsuarioModalProps) {
  const { data: usuarios = [] } = useUsuarios();
  const crear = useCrearUsuario();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegistrarUsuarioFormValues>({
    resolver: zodResolver(registrarUsuarioSchema),
    defaultValues: registrarUsuarioDefaults,
  });

  const rolSeleccionado = watch('rol');

  const cerrar = () => {
    reset(registrarUsuarioDefaults);
    onClose();
  };

  const onSubmit = async (valores: RegistrarUsuarioFormValues) => {
    // Regla de negocio: el correo institucional identifica la cuenta y no se repite.
    const duplicado = usuarios.some(
      (usuario) => normalizar(usuario.usuario) === normalizar(valores.usuario),
    );

    if (duplicado) {
      setError('usuario', {
        type: 'manual',
        message: 'Ya existe una cuenta registrada con ese correo.',
      });
      return;
    }

    try {
      const nuevo = await crear.mutateAsync({
        nombreCompleto: valores.nombreCompleto,
        usuario: valores.usuario,
        cargo: valores.cargo,
        rol: valores.rol,
        telefono: valores.telefono,
        password: valores.password,
      });
      toast.success(`Cuenta de ${nuevo.nombreCompleto} registrada correctamente.`);
      cerrar();
    } catch (error) {
      setError('root', {
        message: extraerMensajeError(error, 'No se pudo registrar el usuario.'),
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={cerrar}
      title="Nuevo Usuario"
      subtitle="Crea una cuenta de acceso para el personal de la policlínica."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={cerrar} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="form-registrar-usuario"
            loading={isSubmitting}
            icon="ri-user-add-line"
          >
            Registrar
          </Button>
        </>
      }
    >
      <form
        id="form-registrar-usuario"
        onSubmit={handleSubmit(onSubmit)}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        noValidate
      >
        <div className="sm:col-span-2">
          <label htmlFor="nombreCompleto" className="mb-1.5 block text-sm font-medium text-ink">
            Nombre completo <span className="text-danger">*</span>
          </label>
          <input
            id="nombreCompleto"
            type="text"
            autoFocus
            placeholder="Ej. Dra. Elena Ramírez Alfaro"
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.nombreCompleto)}
            className={CLASE_INPUT}
            {...register('nombreCompleto')}
          />
          {errors.nombreCompleto && (
            <p className="mt-1.5 text-xs text-danger">{errors.nombreCompleto.message}</p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="usuario" className="mb-1.5 block text-sm font-medium text-ink">
            Correo institucional <span className="text-danger">*</span>
          </label>
          <input
            id="usuario"
            type="email"
            autoComplete="off"
            placeholder="eramirez@policlinica.com"
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.usuario)}
            className={CLASE_INPUT}
            {...register('usuario')}
          />
          {errors.usuario ? (
            <p className="mt-1.5 text-xs text-danger">{errors.usuario.message}</p>
          ) : (
            <p className="mt-1.5 text-xs text-muted">Con este correo iniciará sesión.</p>
          )}
        </div>

        <div>
          <label htmlFor="rol" className="mb-1.5 block text-sm font-medium text-ink">
            Rol <span className="text-danger">*</span>
          </label>
          <select
            id="rol"
            disabled={isSubmitting}
            className={`${CLASE_INPUT} cursor-pointer`}
            {...register('rol')}
          >
            {ROLES_SELECCIONABLES.map((rol) => (
              <option key={rol} value={rol}>
                {ROL_LABEL[rol]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="cargo" className="mb-1.5 block text-sm font-medium text-ink">
            Cargo <span className="text-danger">*</span>
          </label>
          <input
            id="cargo"
            type="text"
            placeholder={PLACEHOLDER_CARGO[rolSeleccionado]}
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.cargo)}
            className={CLASE_INPUT}
            {...register('cargo')}
          />
          {errors.cargo && <p className="mt-1.5 text-xs text-danger">{errors.cargo.message}</p>}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="telefono" className="mb-1.5 block text-sm font-medium text-ink">
            Teléfono <span className="font-normal text-muted">(opcional)</span>
          </label>
          <input
            id="telefono"
            type="tel"
            placeholder="2443-1020"
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.telefono)}
            className={CLASE_INPUT}
            {...register('telefono')}
          />
          {errors.telefono && (
            <p className="mt-1.5 text-xs text-danger">{errors.telefono.message}</p>
          )}
        </div>

        <div className="sm:col-span-2">
          <div className="border-t border-line pt-4">
            <p className="text-sm font-semibold text-ink">Contraseña de acceso</p>
            <p className="mt-0.5 text-xs text-muted">
              Entrégasela al usuario; podrá cambiarla desde su perfil.
            </p>
          </div>
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink">
            Contraseña <span className="text-danger">*</span>
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
            <p className="mt-1.5 text-xs text-muted">Mínimo 8 caracteres, con letra y número.</p>
          )}
        </div>

        <div>
          <label
            htmlFor="password_confirmation"
            className="mb-1.5 block text-sm font-medium text-ink"
          >
            Confirmar contraseña <span className="text-danger">*</span>
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

        {/* Error devuelto por el servidor/mock (correo duplicado, fallo inesperado) */}
        {errors.root && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-field bg-danger-soft px-3 py-2.5 text-sm text-danger sm:col-span-2"
          >
            <i className="ri-error-warning-line mt-0.5 shrink-0" />
            <span>{errors.root.message}</span>
          </div>
        )}
      </form>
    </Modal>
  );
}

export default RegistrarUsuarioModal;
