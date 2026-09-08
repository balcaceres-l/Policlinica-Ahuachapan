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
 * Control de acceso visual. La autorización efectiva la aplica el middleware
 * `role:` del backend; esto solo evita renderizar pantallas sin permiso.
 */
export function ProtectedRoute({ roles }: ProtectedRouteProps) {
  const { usuario, cargando } = useAuth();
  const location = useLocation();

  // Sin este corte se redirigiría al login durante la rehidratación.
  if (cargando) {
    return (
      <div className="flex h-screen items-center justify-center bg-canvas">
        <LoadingSpinner label="Verificando sesión..." />
      </div>
    );
  }

  if (!usuario) {
    // `state.from` deja volver a la ruta pedida después del login.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Autenticado sin permiso: a su propio inicio, no al login.
  if (roles && !roles.includes(usuario.rol)) {
    return <Navigate to={RUTA_INICIO_POR_ROL[usuario.rol]} replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
