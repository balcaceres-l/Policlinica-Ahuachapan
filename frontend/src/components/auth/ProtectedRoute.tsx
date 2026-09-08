import { Navigate, Outlet, useLocation } from 'react-router-dom';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import useAuth from '@/hooks/auth/useAuth';
import { RUTA_INICIO_POR_ROL } from '@/types/auth.types';
import type { RolUsuario } from '@/types/user.types';

interface ProtectedRouteProps {
  /** Si se omite, basta con estar autenticado. */
  roles?: RolUsuario[];
}

/**
 * Control de acceso VISUAL. La autorización real la aplica el middleware
 * `role:` del backend — esto solo evita mostrar pantallas sin permiso.
 */
export function ProtectedRoute({ roles }: ProtectedRouteProps) {
  const { usuario, cargando } = useAuth();
  const location = useLocation();

  // Aún se está verificando el token guardado: no decidir todavía.
  if (cargando) {
    return (
      <div className="flex h-screen items-center justify-center bg-canvas">
        <LoadingSpinner label="Verificando sesión..." />
      </div>
    );
  }

  if (!usuario) {
    // `state.from` permite volver a donde iba tras iniciar sesión.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Autenticado pero sin permiso: va a su propio inicio, no al login.
  if (roles && !roles.includes(usuario.rol)) {
    return <Navigate to={RUTA_INICIO_POR_ROL[usuario.rol]} replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
