import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import { extraerMensajeError } from '@/lib/apiError';
import {
  recuperarPasswordSchema,
  type RecuperarPasswordFormValues,
} from '@/lib/validations/passwordResetSchema';
import { solicitarRecuperacion } from '@/services/auth/passwordReset.service';

const CLASE_INPUT =
  'h-11 w-full rounded-field border border-line bg-surface px-3 text-sm text-ink outline-none ' +
  'transition-colors placeholder:text-muted focus:border-brand-600 focus:ring-4 ' +
  'focus:ring-brand-600/15 disabled:opacity-60';

export function RecuperarPasswordPage() {
  const [enviado, setEnviado] = useState(false);
  const [correoEnviado, setCorreoEnviado] = useState('');

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RecuperarPasswordFormValues>({
    resolver: zodResolver(recuperarPasswordSchema),
    defaultValues: { usuario: '' },
  });

  const onSubmit = async (valores: RecuperarPasswordFormValues) => {
    try {
      const mensaje = await solicitarRecuperacion(valores.usuario);
      setCorreoEnviado(valores.usuario);
      setEnviado(true);
      toast.success(mensaje || 'Correo de recuperación enviado.');
    } catch (error) {
      setError('root', {
        message: extraerMensajeError(
          error,
          'No se pudo procesar la solicitud de recuperación.',
        ),
      });
    }
  };

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
          {enviado ? (
            /* Estado de éxito tras enviar el correo */
            <div className="text-center">
              <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <i className="ri-mail-check-line text-3xl" />
              </div>
              <h2 className="text-lg font-bold text-ink">¡Revisa tu correo!</h2>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Hemos enviado un enlace de recuperación a{' '}
                <strong className="text-ink">{correoEnviado}</strong>.
              </p>
              <div className="mt-4 rounded-field bg-brand-50/60 p-3 text-left text-xs text-brand-900 border border-brand-100">
                <p className="font-semibold flex items-center gap-1.5">
                  <i className="ri-information-line" /> Instrucciones:
                </p>
                <ul className="mt-1.5 list-disc pl-4 space-y-1 text-brand-800">
                  <li>El enlace expirará en <strong>60 minutos</strong>.</li>
                  <li>Revisa tu bandeja de entrada o carpeta de correo no deseado (spam).</li>
                  <li>Haz clic en el enlace para definir tu nueva contraseña.</li>
                </ul>
              </div>

              <div className="mt-6 flex flex-col gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  className="w-full"
                  onClick={() => setEnviado(false)}
                >
                  Probar con otro correo
                </Button>

                <Link
                  to="/login"
                  className="inline-flex h-10 w-full items-center justify-center rounded-field text-xs font-semibold text-brand-700 hover:text-brand-800 transition-colors"
                >
                  ← Volver a Iniciar Sesión
                </Link>
              </div>
            </div>
          ) : (
            /* Formulario para ingresar el usuario/correo */
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="mb-6">
                <h2 className="text-lg font-bold text-ink">Recuperar Contraseña</h2>
                <p className="mt-1 text-xs text-muted leading-relaxed">
                  Ingresa tu correo electrónico o usuario institucional. Te enviaremos un enlace seguro para restablecer tu contraseña.
                </p>
              </div>

              <div className="mb-5">
                <label
                  htmlFor="usuario"
                  className="mb-1.5 block text-sm font-medium text-ink"
                >
                  Usuario o Correo
                </label>
                <input
                  id="usuario"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  disabled={isSubmitting}
                  aria-invalid={Boolean(errors.usuario)}
                  className={CLASE_INPUT}
                  placeholder="usuario@policlinica.com"
                  {...register('usuario')}
                />
                {errors.usuario && (
                  <p className="mt-1.5 text-xs text-danger">
                    {errors.usuario.message}
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
                {isSubmitting ? 'Enviando correo...' : 'Enviar enlace de recuperación'}
              </Button>

              <div className="mt-5 text-center">
                <Link
                  to="/login"
                  className="text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors"
                >
                  ← Volver a Iniciar Sesión
                </Link>
              </div>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          ¿No tienes acceso a tu correo institucional? Contacta a la administración de la policlínica.
        </p>
      </div>
    </div>
  );
}

export default RecuperarPasswordPage;
