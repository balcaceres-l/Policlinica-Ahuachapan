import type { Usuario } from '@/types/user.types';

export type EstadoEspecialidad = 'ACTIVA' | 'INACTIVA';

/** Fila tal cual vive en la tabla `especialidades`. */
export interface EspecialidadBase {
  id: string;
  nombre: string;
  descripcion: string;
  estado: EstadoEspecialidad;
  fechaRegistro: string;
}

/** Especialidad enriquecida con el conteo de médicos vinculados. */
export interface Especialidad extends EspecialidadBase {
  cantidadMedicos: number;
}

/** Payload del formulario de registro (HU-07). */
export interface NuevaEspecialidad {
  nombre: string;
  descripcion?: string;
}

/** Especialidad con sus médicos — usado por el catálogo (HU-09). */
export interface EspecialidadConMedicos extends Especialidad {
  medicos: Usuario[];
}
