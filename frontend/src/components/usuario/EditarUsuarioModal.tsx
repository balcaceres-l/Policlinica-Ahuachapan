import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { useActualizarUsuario } from '@/hooks/usuario/useUsuarios';
import { extraerMensajeError } from '@/lib/apiError';
import { ROL_LABEL } from '@/lib/constants/roles';
import {
  editarUsuarioSchema,
  type EditarUsuarioFormValues,
} from '@/lib/validations/usuarioSchema';
import type { RolUsuario, Usuario } from '@/types/user.types';

interface EditarUsuarioModalProps {
  usuario: Usuario | null;
  onClose: () => void;
}

const CLASE_CAMPO =
  'h-11 w-full rounded-field border border-line bg-surface px-3 text-sm text-ink outline-none ' +
  'transition-colors placeholder:text-muted focus:border-brand-600 focus:ring-4 ' +
  'focus:ring-brand-600/15 disabled:opacity-60';

const ROLES: RolUsuario[] = ['MEDICO', 'RECEPCIONISTA', 'ADMINISTRADOR'];

export function EditarUsuarioModal({ usuario, onClose }: EditarUsuarioModalProps) {
  const actualizar = useActualizarUsuario();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EditarUsuarioFormValues>({
    resolver: zodResolver(editarUsuarioSchema),
  });

  // El modal se monta una sola vez y cambia de usuario por prop.
  useEffect(() => {
    if (!usuario) return;

    reset({
      nombre_completo: usuario.nombreCompleto,
      usuario: usuario.usuario,
      cargo: usuario.cargo,
      rol: usuario.rol,
      telefono: usuario.telefono ?? '',
    });
  }, [usuario, reset]);

  const onSubmit = async (valores: EditarUsuarioFormValues) => {
    if (!usuario) return;

    try {
      await actualizar.mutateAsync({
        id: usuario.id,
        payload: { ...valores, telefono: valores.telefono?.trim() || undefined },
      });
      toast.success('Usuario actualizado correctamente.');
      onClose();
    } catch (error) {
      setError('root', {
        message: extraerMensajeError(error, 'No se pudo actualizar el usuario.'),
      });
    }
  };

  return (
    <Modal
      isOpen={usuario !== null}
      onClose={onClose}
      title="Editar usuario"
      subtitle={usuario?.nombreCompleto}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="form-editar-usuario"
            loading={isSubmitting}
            icon="ri-save-line"
          >
            Guardar cambios
          </Button>
        </>
      }
    >
      <form id="form-editar-usuario" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="mb-4">
          <label htmlFor="editar_nombre" className="mb-1.5 block text-sm font-medium text-ink">
            Nombre completo
          </label>
          <input
            id="editar_nombre"
            type="text"
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.nombre_completo)}
            className={CLASE_CAMPO}
            {...register('nombre_completo')}
          />
          {errors.nombre_completo && (
            <p className="mt-1.5 text-xs text-danger">{errors.nombre_completo.message}</p>
          )}
        </div>

        <div className="mb-4">
          <label htmlFor="editar_usuario" className="mb-1.5 block text-sm font-medium text-ink">
            Usuario (correo institucional)
          </label>
          <input
            id="editar_usuario"
            type="email"
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.usuario)}
            className={CLASE_CAMPO}
            {...register('usuario')}
          />
          {errors.usuario && (
            <p className="mt-1.5 text-xs text-danger">{errors.usuario.message}</p>
          )}
        </div>

        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="editar_rol" className="mb-1.5 block text-sm font-medium text-ink">
              Rol
            </label>
            <select
              id="editar_rol"
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
            <label htmlFor="editar_cargo" className="mb-1.5 block text-sm font-medium text-ink">
              Cargo
            </label>
            <input
              id="editar_cargo"
              type="text"
              disabled={isSubmitting}
              aria-invalid={Boolean(errors.cargo)}
              className={CLASE_CAMPO}
              {...register('cargo')}
            />
            {errors.cargo && <p className="mt-1.5 text-xs text-danger">{errors.cargo.message}</p>}
          </div>
        </div>

        <div className="mb-1">
          <label htmlFor="editar_telefono" className="mb-1.5 block text-sm font-medium text-ink">
            Teléfono <span className="font-normal text-muted">(opcional)</span>
          </label>
          <input
            id="editar_telefono"
            type="tel"
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.telefono)}
            className={CLASE_CAMPO}
            {...register('telefono')}
          />
          {errors.telefono && (
            <p className="mt-1.5 text-xs text-danger">{errors.telefono.message}</p>
          )}
        </div>

        <p className="mt-4 text-xs text-muted">
          La contraseña no se edita aquí: cada usuario la cambia desde su propio perfil.
        </p>

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

export default EditarUsuarioModal;
