import type { EstadoUsuario, RolUsuario } from '@/types/user.types';

export const ROLES = {
  ADMINISTRADOR: 'ADMINISTRADOR',
  MEDICO: 'MEDICO',
  RECEPCIONISTA: 'RECEPCIONISTA',
} as const;

export const ROL_LABEL: Record<RolUsuario, string> = {
  ADMINISTRADOR: 'Administrador',
  MEDICO: 'Médico',
  RECEPCIONISTA: 'Recepcionista',
};

/** Médico = azul · Recepcionista = verde · Administrador = morado */
export const ROL_BADGE: Record<RolUsuario, string> = {
  MEDICO: 'bg-info-soft text-info',
  RECEPCIONISTA: 'bg-success-soft text-success',
  ADMINISTRADOR: 'bg-royal-soft text-royal',
};

export const ROL_AVATAR: Record<RolUsuario, string> = {
  MEDICO: 'bg-info-soft text-info',
  RECEPCIONISTA: 'bg-success-soft text-success',
  ADMINISTRADOR: 'bg-royal-soft text-royal',
};

export const ESTADO_LABEL: Record<EstadoUsuario, string> = {
  ACTIVO: 'Activo',
  INACTIVO: 'Inactivo',
};

/** Opciones para los dropdowns de la HU-06 */
export const OPCIONES_ROL: Array<{ value: RolUsuario | 'TODOS'; label: string }> = [
  { value: 'TODOS', label: 'Todos los Roles' },
  { value: 'MEDICO', label: 'Médico' },
  { value: 'RECEPCIONISTA', label: 'Recepcionista' },
  { value: 'ADMINISTRADOR', label: 'Administrador' },
];

export const OPCIONES_ESTADO: Array<{ value: EstadoUsuario | 'TODOS'; label: string }> = [
  { value: 'TODOS', label: 'Estado' },
  { value: 'ACTIVO', label: 'Activo' },
  { value: 'INACTIVO', label: 'Inactivo' },
];
