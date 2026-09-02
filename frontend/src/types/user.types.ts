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

/** Filtros de la vista HU-06 */
export interface FiltrosUsuario {
  busqueda: string;
  rol: RolUsuario | 'TODOS';
  estado: EstadoUsuario | 'TODOS';
}
