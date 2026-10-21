import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import { extraerMensajeError } from '@/lib/apiError';
import {
  restablecerPasswordSchema,
  type RestablecerPasswordFormValues,
} from '@/lib/validations/passwordResetSchema';
import { restablecerPassword } from '@/services/auth/passwordReset.service';

const CLASE_INPUT =
  'h-11 w-full rounded-field border border-line bg-surface px-3 text-sm text-ink outline-none ' +
  'transition-colors placeholder:text-muted focus:border-brand-600 focus:ring-4 ' +
  'focus:ring-brand-600/15 disabled:opacity-60';

export function RestablecerPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const token = params.get('token') || '';
  const usuario = params.get('usuario') || params.get('email') || '';

  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [completado, setCompletado] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RestablecerPasswordFormValues>({
    resolver: zodResolver(restablecerPasswordSchema),
    defaultValues: {
      password: '',
      password_confirmation: '',
    },
  });

  const onSubmit = async (valores: RestablecerPasswordFormValues) => {
    if (!token || !usuario) {
      setError('root', {
        message: 'El enlace de recuperación es inválido o le faltan parámetros.',
      });
      return;
    }

    try {
      const mensaje = await restablecerPassword({
        usuario,
        token,
        password: valores.password,
        password_confirmation: valores.password_confirmation,
      });

      setCompletado(true);
      toast.success(mensaje || 'Contraseña restablecida exitosamente.');
    } catch (error) {
      setError('root', {
        message: extraerMensajeError(
          error,
          'No se pudo restablecer la contraseña. El enlace puede haber expirado o ser inválido.',
        ),
      });
    }
  };

  const enlaceInvalido = !token || !usuario;

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-md">
        {/* Cabecera institucional */}
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 flex size-16 items-center justify-center rounded-card bg-brand-800 text-white shadow-card">
            <i className="ri-hospital-line text-3xl" />
          </span>
          <h1 className="text-2xl font-bold text-ink">Policlínica Ahuachapaneca</h1>
          <p className="mt-1 text-sm text-muted">Sistema de Gestión Clínica</p>
        </div>

        <div className="rounded-card border border-line bg-surface p-6 shadow-card sm:p-8">
          {completado ? (
            /* Estado de éxito */
            <div className="text-center">
              <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <i className="ri-checkbox-circle-line text-3xl" />
              </div>
              <h2 className="text-lg font-bold text-ink">¡Contraseña actualizada!</h2>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Tu contraseña ha sido modificada con éxito. Ya puedes iniciar sesión con tus nuevas credenciales.
              </p>

              <div className="mt-6">
                <Button
                  type="button"
                  size="lg"
                  className="w-full"
                  onClick={() => navigate('/login', { replace: true })}
                >
                  Ir a Iniciar Sesión
                </Button>
              </div>
            </div>
          ) : enlaceInvalido ? (
            /* Estado de enlace inválido o incompleto */
            <div className="text-center">
              <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                <i className="ri-error-warning-line text-3xl" />
              </div>
              <h2 className="text-lg font-bold text-ink">Enlace Inválido</h2>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                El enlace que abriste no contiene los parámetros de seguridad necesarios o ha sido modificado.
              </p>

              <div className="mt-6 flex flex-col gap-2">
                <Link
                  to="/recuperar-password"
                  className="inline-flex h-11 w-full items-center justify-center rounded-field bg-brand-600 text-sm font-semibold text-white shadow-xs hover:bg-brand-700 transition-colors"
                >
                  Solicitar un nuevo enlace
                </Link>
                <Link
                  to="/login"
                  className="inline-flex h-10 w-full items-center justify-center text-xs font-semibold text-muted hover:text-ink transition-colors"
                >
                  Volver al inicio de sesión
                </Link>
              </div>
            </div>
          ) : (
            /* Formulario para ingresar la nueva contraseña */
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="mb-6">
                <h2 className="text-lg font-bold text-ink">Nueva Contraseña</h2>
                <p className="mt-1 text-xs text-muted">
                  Definiendo contraseña para:{' '}
                  <span className="font-semibold text-ink">{usuario}</span>
                </p>
              </div>

              {/* Nueva contraseña */}
              <div className="mb-4">
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-sm font-medium text-ink"
                >
                  Nueva Contraseña
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={mostrarPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    autoFocus
                    disabled={isSubmitting}
                    aria-invalid={Boolean(errors.password)}
                    className={`${CLASE_INPUT} pr-10`}
                    placeholder="Mínimo 10 caracteres"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarPassword(!mostrarPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors"
                    tabIndex={-1}
                  >
                    <i
                      className={
                        mostrarPassword ? 'ri-eye-off-line' : 'ri-eye-line'
                      }
                    />
                  </button>
                </div>
                {errors.password ? (
                  <p className="mt-1.5 text-xs text-danger">
                    {errors.password.message}
                  </p>
                ) : (
                  <p className="mt-1.5 text-xs text-muted">
                    Mínimo 10 caracteres (mayúsculas, minúsculas, números y al menos un símbolo).
                  </p>
                )}
              </div>

              {/* Confirmar contraseña */}
              <div className="mb-5">
                <label
                  htmlFor="password_confirmation"
                  className="mb-1.5 block text-sm font-medium text-ink"
                >
                  Confirmar Nueva Contraseña
                </label>
                <input
                  id="password_confirmation"
                  type={mostrarPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  disabled={isSubmitting}
                  aria-invalid={Boolean(errors.password_confirmation)}
                  className={CLASE_INPUT}
                  placeholder="Repite la nueva contraseña"
                  {...register('password_confirmation')}
                />
                {errors.password_confirmation && (
                  <p className="mt-1.5 text-xs text-danger">
                    {errors.password_confirmation.message}
                  </p>
                )}
              </div>

              {errors.root && (
                <div
                  role="alert"
                  className="mb-5 flex items-start gap-2 rounded-field bg-danger-soft px-3 py-2.5 text-sm text-danger"
                >
                  <i className="ri-error-warning-line mt-0.5 shrink-0" />
                  <span>{errors.root.message}</span>
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                loading={isSubmitting}
                className="w-full"
              >
                {isSubmitting ? 'Actualizando...' : 'Restablecer mi contraseña'}
              </Button>

              <div className="mt-5 text-center">
                <Link
                  to="/login"
                  className="text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors"
                >
                  ← Cancelar y volver al inicio de sesión
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default RestablecerPasswordPage;
