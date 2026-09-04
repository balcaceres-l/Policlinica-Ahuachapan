import type { RolUsuario, Usuario } from '@/types/user.types';

/** Cuerpo que espera POST /auth/login. */
export interface Credenciales {
  usuario: string;
  password: string;
}

/** Contenido de `data` en la respuesta de login. */
export interface LoginRespuesta {
  token: string;
  usuario: Usuario;
}

/** Lo que expone el AuthContext a toda la aplicación. */
export interface EstadoAuth {
  usuario: Usuario | null;
  /** true mientras se verifica el token guardado al cargar la app. */
  cargando: boolean;
  autenticado: boolean;
  iniciarSesion: (credenciales: Credenciales) => Promise<Usuario>;
  cerrarSesion: () => Promise<void>;
}

/** RF-03: destino de cada rol después de autenticarse. */
export const RUTA_INICIO_POR_ROL: Record<RolUsuario, string> = {
  ADMINISTRADOR: '/admin/usuarios',
  RECEPCIONISTA: '/secretaria/especialidades',
  // TODO(HU-15): apuntar a la agenda del médico cuando exista esa vista.
  MEDICO: '/secretaria/especialidades',
};
