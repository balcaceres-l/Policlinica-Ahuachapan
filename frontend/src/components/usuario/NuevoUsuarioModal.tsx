import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { useCrearUsuario } from '@/hooks/usuario/useUsuarios';
import { extraerMensajeError } from '@/lib/apiError';
import { ROL_LABEL } from '@/lib/constants/roles';
import { formatearTelefono } from '@/lib/utils';
import {
  usuarioFormDefaults,
  usuarioSchema,
  type UsuarioFormValues,
} from '@/lib/validations/usuarioSchema';
import type { RolUsuario } from '@/types/user.types';

interface NuevoUsuarioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CLASE_CAMPO =
  'h-11 w-full rounded-field border border-line bg-surface px-3 text-sm text-ink outline-none ' +
  'transition-colors placeholder:text-muted focus:border-brand-600 focus:ring-4 ' +
  'focus:ring-brand-600/15 disabled:opacity-60';

const ROLES: RolUsuario[] = ['MEDICO', 'RECEPCIONISTA', 'ADMINISTRADOR'];

export function NuevoUsuarioModal({ isOpen, onClose }: NuevoUsuarioModalProps) {
  const crear = useCrearUsuario();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<UsuarioFormValues>({
    resolver: zodResolver(usuarioSchema),
    defaultValues: usuarioFormDefaults,
  });

  const cerrar = () => {
    reset(usuarioFormDefaults);
    onClose();
  };

  const onSubmit = async (valores: UsuarioFormValues) => {
    try {
      const creado = await crear.mutateAsync({
        ...valores,
        telefono: valores.telefono?.trim() || undefined,
      });
      toast.success(`Cuenta de ${creado.nombreCompleto} registrada.`);
      cerrar();
    } catch (error) {
      setError('root', {
        message: extraerMensajeError(error, 'No se pudo registrar la cuenta.'),
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={cerrar}
      title="Nuevo usuario"
      subtitle="La cuenta queda activa desde su registro."
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={cerrar} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="form-nuevo-usuario"
            loading={isSubmitting}
            icon="ri-user-add-line"
          >
            Registrar
          </Button>
        </>
      }
    >
      <form id="form-nuevo-usuario" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="mb-4">
          <label htmlFor="nombre_completo" className="mb-1.5 block text-sm font-medium text-ink">
            Nombre completo
          </label>
          <input
            id="nombre_completo"
            type="text"
            autoFocus
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.nombre_completo)}
            className={CLASE_CAMPO}
            placeholder="Dra. Elena Ramírez Alfaro"
            {...register('nombre_completo')}
          />
          {errors.nombre_completo && (
            <p className="mt-1.5 text-xs text-danger">{errors.nombre_completo.message}</p>
          )}
        </div>

        <div className="mb-4">
          <label htmlFor="usuario" className="mb-1.5 block text-sm font-medium text-ink">
            Usuario (correo institucional)
          </label>
          <input
            id="usuario"
            type="email"
            autoComplete="off"
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.usuario)}
            className={CLASE_CAMPO}
            placeholder="eramirez@policlinica.com"
            {...register('usuario')}
          />
          {errors.usuario && (
            <p className="mt-1.5 text-xs text-danger">{errors.usuario.message}</p>
          )}
        </div>

        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="rol" className="mb-1.5 block text-sm font-medium text-ink">
              Rol
            </label>
            <select
              id="rol"
              disabled={isSubmitting}
              className={`${CLASE_CAMPO} cursor-pointer`}
              {...register('rol')}
            >
              {ROLES.map((rol) => (
                <option key={rol} value={rol}>
                  {ROL_LABEL[rol]}
                </option>
              ))}
            </select>
            {errors.rol && <p className="mt-1.5 text-xs text-danger">{errors.rol.message}</p>}
          </div>

          <div>
            <label htmlFor="cargo" className="mb-1.5 block text-sm font-medium text-ink">
              Cargo
            </label>
            <input
              id="cargo"
              type="text"
              disabled={isSubmitting}
              aria-invalid={Boolean(errors.cargo)}
              className={CLASE_CAMPO}
              placeholder="Ginecología"
              {...register('cargo')}
            />
            {errors.cargo && <p className="mt-1.5 text-xs text-danger">{errors.cargo.message}</p>}
          </div>
        </div>

        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="telefono" className="mb-1.5 block text-sm font-medium text-ink">
              Teléfono <span className="font-normal text-muted">(opcional)</span>
            </label>
            <input
              id="telefono"
              type="tel"
              disabled={isSubmitting}
              aria-invalid={Boolean(errors.telefono)}
              className={CLASE_CAMPO}
              placeholder="1111-1111"
              maxLength={9}
              {...register('telefono', {
                onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                  const formateado = formatearTelefono(e.target.value);
                  setValue('telefono', formateado, { shouldValidate: true });
                },
              })}
            />
            {errors.telefono && (
              <p className="mt-1.5 text-xs text-danger">{errors.telefono.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink">
              Contraseña inicial
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              disabled={isSubmitting}
              aria-invalid={Boolean(errors.password)}
              className={CLASE_CAMPO}
              {...register('password')}
            />
            {errors.password && (
              <p className="mt-1.5 text-xs text-danger">{errors.password.message}</p>
            )}
          </div>
        </div>

        <p className="text-xs text-muted">
          El usuario podrá cambiarla desde su propio perfil.
        </p>

        {/* Usuario duplicado, política de contraseña o permisos */}
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

export default NuevoUsuarioModal;
