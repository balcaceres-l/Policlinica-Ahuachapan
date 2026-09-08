export type RolUsuario = 'ADMINISTRADOR' | 'MEDICO' | 'RECEPCIONISTA';
export type EstadoUsuario = 'ACTIVO' | 'INACTIVO';

export interface Usuario {
  id: number;
  nombreCompleto: string;
  /** Usuario de acceso / correo institucional */
  usuario: string;
  /** Cargo o especialidad principal — subtítulo bajo el nombre */
  cargo: string;
  rol: RolUsuario;
  estado: EstadoUsuario;
  telefono?: string;
  fechaRegistro: string;
}

/** La entrada de la API va en snake_case; las respuestas vuelven en camelCase. */
export interface EditarUsuario {
  nombre_completo: string;
  usuario: string;
  cargo: string;
  rol: RolUsuario;
  telefono?: string;
}

export interface NuevoUsuario extends EditarUsuario {
  password: string;
}

/** Filtros de la vista HU-06 */
export interface FiltrosUsuario {
  busqueda: string;
  rol: RolUsuario | 'TODOS';
  estado: EstadoUsuario | 'TODOS';
}
