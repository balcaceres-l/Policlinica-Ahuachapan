import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import useAuth from '@/hooks/auth/useAuth';
import { extraerMensajeError } from '@/lib/apiError';
import { loginSchema, type LoginFormValues } from '@/lib/validations/loginSchema';
import { RUTA_INICIO_POR_ROL } from '@/types/auth.types';

const CLASE_INPUT =
  'h-11 w-full rounded-field border border-line bg-surface px-3 text-sm text-ink outline-none ' +
  'transition-colors placeholder:text-muted focus:border-brand-600 focus:ring-4 ' +
  'focus:ring-brand-600/15 disabled:opacity-60';

export function LoginPage() {
  const { iniciarSesion, usuario, cargando } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { usuario: '', password: '' },
  });

  // Aviso cuando el interceptor expulsó al usuario por token vencido.
  useEffect(() => {
    if (params.get('expirada')) {
      toast.error('Tu sesión expiró. Inicia sesión nuevamente.');
    }
  }, [params]);

  if (cargando) return null;

  // Ya autenticado: no tiene sentido mostrar el formulario.
  if (usuario) {
    return <Navigate to={RUTA_INICIO_POR_ROL[usuario.rol]} replace />;
  }

  const onSubmit = async (valores: LoginFormValues) => {
    try {
      const autenticado = await iniciarSesion(valores);
      toast.success(`Bienvenido/a, ${autenticado.nombreCompleto}`);

      // RF-03: destino según rol, o la ruta que intentaba visitar.
      const destino =
        (location.state as { from?: string } | null)?.from ??
        RUTA_INICIO_POR_ROL[autenticado.rol];

      navigate(destino, { replace: true });
    } catch (error) {
      // RB-32: se muestra el mensaje del servidor sin señalar qué campo falló.
      setError('root', {
        message: extraerMensajeError(error, 'No se pudo iniciar sesión.'),
      });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-md">
        {/* Identidad visual — RNF-03 */}
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 flex size-16 items-center justify-center rounded-card bg-brand-800 text-white">
            <i className="ri-hospital-line text-3xl" />
          </span>
          <h1 className="text-2xl font-bold text-ink">Policlínica Ahuachapaneca</h1>
          <p className="mt-1 text-sm text-muted">Sistema de Gestión Clínica</p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="rounded-card border border-line bg-surface p-6 shadow-card sm:p-8"
        >
          <h2 className="mb-6 text-lg font-semibold text-ink">Iniciar sesión</h2>

          <div className="mb-4">
            <label htmlFor="usuario" className="mb-1.5 block text-sm font-medium text-ink">
              Usuario
            </label>
            <input
              id="usuario"
              type="text"
              autoComplete="username"
              autoFocus
              disabled={isSubmitting}
              aria-invalid={Boolean(errors.usuario)}
              className={CLASE_INPUT}
              placeholder="usuario@policlinica.com"
              {...register('usuario')}
            />
            {errors.usuario && (
              <p className="mt-1.5 text-xs text-danger">{errors.usuario.message}</p>
            )}
          </div>

          <div className="mb-5">
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              disabled={isSubmitting}
              aria-invalid={Boolean(errors.password)}
              className={CLASE_INPUT}
              placeholder="••••••••"
              {...register('password')}
            />
            {errors.password && (
              <p className="mt-1.5 text-xs text-danger">{errors.password.message}</p>
            )}
          </div>

          {/* Error del servidor: credenciales inválidas o cuenta inactiva */}
          {errors.root && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2 rounded-field bg-danger-soft px-3 py-2.5 text-sm text-danger"
            >
              <i className="ri-error-warning-line mt-0.5 shrink-0" />
              <span>{errors.root.message}</span>
            </div>
          )}

          <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
            {isSubmitting ? 'Verificando...' : 'Ingresar'}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted">
          ¿Problemas para ingresar? Contacta al administrador del sistema.
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
