import { useContext } from 'react';
import { AuthContext } from '@/context/auth-context';

/** Acceso al estado de sesión desde cualquier componente. */
export function useAuth() {
  const contexto = useContext(AuthContext);

  if (!contexto) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>.');
  }

  return contexto;
}

export default useAuth;
