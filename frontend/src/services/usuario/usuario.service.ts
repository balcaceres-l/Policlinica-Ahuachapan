import api from '@/services/api';
import type { ApiResponse } from '@/types/api.types';
import type { NuevoUsuario, Usuario } from '@/types/user.types';

/**
 * El endpoint acepta `rol`, `estado` y `buscar`, pero con una plantilla de una
 * docena de cuentas sale más barato traerlas todas y filtrar en el cliente.
 */
export const getUsuarios = async (): Promise<Usuario[]> => {
  const { data } = await api.get<ApiResponse<Usuario[]>>('/usuarios');
  return data.data;
};

export const getMedicos = async (): Promise<Usuario[]> => {
  const { data } = await api.get<ApiResponse<Usuario[]>>('/usuarios', {
    params: { rol: 'MEDICO' },
  });
  return data.data;
};

export const getUsuarioById = async (id: number): Promise<Usuario> => {
  const { data } = await api.get<ApiResponse<Usuario>>(`/usuarios/${id}`);
  return data.data;
};

export const crearUsuario = async (payload: NuevoUsuario): Promise<Usuario> => {
  const { data } = await api.post<ApiResponse<Usuario>>('/usuarios', payload);
  return data.data;
};
