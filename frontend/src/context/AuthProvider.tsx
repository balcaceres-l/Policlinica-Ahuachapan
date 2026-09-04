import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AuthContext } from '@/context/auth-context';
import { borrarToken, guardarToken, leerToken } from '@/services/api';
import * as authService from '@/services/auth/auth.service';
import type { Credenciales } from '@/types/auth.types';
import type { Usuario } from '@/types/user.types';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);
  const queryClient = useQueryClient();

  // Al montar: si hay token guardado, recuperar al usuario para sobrevivir al F5.
  useEffect(() => {
    let activo = true;

    const restaurarSesion = async () => {
      if (!leerToken()) {
        setCargando(false);
        return;
      }

      try {
        const actual = await authService.obtenerUsuarioActual();
        if (activo) setUsuario(actual);
      } catch {
        // Token expirado o revocado: se descarta en silencio.
        borrarToken();
      } finally {
        if (activo) setCargando(false);
      }
    };

    void restaurarSesion();

    return () => {
      activo = false;
    };
  }, []);

  const iniciarSesion = useCallback(async (credenciales: Credenciales) => {
    const { token, usuario: autenticado } = await authService.login(credenciales);
    guardarToken(token);
    setUsuario(autenticado);
    return autenticado;
  }, []);

  const cerrarSesion = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Si el token ya no vale en el servidor, la sesión local se limpia igual.
    } finally {
      borrarToken();
      setUsuario(null);
      // Impide que el siguiente usuario vea datos cacheados del anterior.
      queryClient.clear();
    }
  }, [queryClient]);

  const valor = useMemo(
    () => ({ usuario, cargando, autenticado: usuario !== null, iniciarSesion, cerrarSesion }),
    [usuario, cargando, iniciarSesion, cerrarSesion],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
