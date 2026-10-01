export type RolUsuario = 'ADMINISTRADOR' | 'MEDICO' | 'RECEPCIONISTA';
export type EstadoUsuario = 'ACTIVO' | 'INACTIVO';

import type { HorarioMedico } from '@/types/horario.types';

export interface Usuario {
  id: string;
  nombreCompleto: string;
  /** Usuario de acceso / correo institucional */
  usuario: string;
  /** Cargo o especialidad principal — subtítulo bajo el nombre */
  cargo: string;
  rol: RolUsuario;
  estado: EstadoUsuario;
  telefono?: string;
  fechaRegistro: string;
  /** Solo viene en el catálogo, que los carga para recepción. */
  horarios?: HorarioMedico[];
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
