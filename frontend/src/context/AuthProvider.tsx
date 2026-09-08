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

  // Rehidrata la sesión desde el token guardado para que un F5 no expulse.
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
      // Aunque el servidor rechace la revocación, la sesión local se limpia.
    } finally {
      borrarToken();
      setUsuario(null);
      // Sin esto el siguiente usuario en el mismo equipo vería datos
      // cacheados del anterior.
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
