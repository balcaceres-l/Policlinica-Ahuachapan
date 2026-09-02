import type { Usuario } from '@/types/user.types';
import { delay } from '@/lib/utils';
import { mockUsuarios } from '@/services/mockData';

export const getUsuarios = async (): Promise<Usuario[]> => {
  // TODO: reemplazar con llamada real -> api.get<ApiResponse<Usuario[]>>('/usuarios')
  await delay(350);
  return [...mockUsuarios];
};

export const getMedicos = async (): Promise<Usuario[]> => {
  // TODO: api.get<ApiResponse<Usuario[]>>('/usuarios?rol=MEDICO')
  await delay(250);
  return mockUsuarios.filter((u) => u.rol === 'MEDICO');
};

export const getUsuarioById = async (id: number): Promise<Usuario | null> => {
  // TODO: api.get<ApiResponse<Usuario>>(`/usuarios/${id}`)
  await delay(150);
  return mockUsuarios.find((u) => u.id === id) ?? null;
};
