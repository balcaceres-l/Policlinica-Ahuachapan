import type { RolUsuario, Usuario } from '@/types/user.types';

export interface Credenciales {
  usuario: string;
  password: string;
}

export interface LoginRespuesta {
  token: string;
  usuario: Usuario;
}

export interface CambiarPasswordPayload {
  password_actual: string;
  password: string;
  password_confirmation: string;
}

export interface EstadoAuth {
  usuario: Usuario | null;
  /** Activo mientras se valida el token guardado al arrancar la app. */
  cargando: boolean;
  autenticado: boolean;
  iniciarSesion: (credenciales: Credenciales) => Promise<Usuario>;
  cerrarSesion: () => Promise<void>;
}

/** Pantalla inicial de cada rol tras autenticarse. */
export const RUTA_INICIO_POR_ROL: Record<RolUsuario, string> = {
  ADMINISTRADOR: '/admin/usuarios',
  RECEPCIONISTA: '/secretaria/especialidades',
  MEDICO: '/medico/citas',
};
