import api from '@/services/api';
import { mockMedicos } from '@/services/mockData';
import type { ApiResponse } from '@/types/api.types';
import type { EditarUsuario, EstadoUsuario, NuevoUsuario, Usuario } from '@/types/user.types';

/**
 * El endpoint acepta `rol`, `estado` y `buscar`, pero con una plantilla de una
 * docena de cuentas sale más barato traerlas todas y filtrar en el cliente.
 */
export const getUsuarios = async (): Promise<Usuario[]> => {
  const { data } = await api.get<ApiResponse<Usuario[]>>('/usuarios');
  return data.data;
};

export const getMedicos = async (): Promise<Usuario[]> => {
  try {
    const { data } = await api.get<ApiResponse<Usuario[]>>('/usuarios', {
      params: { rol: 'MEDICO' },
    });
    if (Array.isArray(data.data) && data.data.length > 0) {
      return data.data;
    }
    return mockMedicos;
  } catch {
    // Fallback para roles sin acceso a /usuarios (ej. Recepcionista) o si el backend no responde
    return mockMedicos;
  }
};

export const getUsuarioById = async (id: number): Promise<Usuario> => {
  const { data } = await api.get<ApiResponse<Usuario>>(`/usuarios/${id}`);
  return data.data;
};

export const crearUsuario = async (payload: NuevoUsuario): Promise<Usuario> => {
  const { data } = await api.post<ApiResponse<Usuario>>('/usuarios', payload);
  return data.data;
};

export const actualizarUsuario = async (
  id: number,
  payload: EditarUsuario,
): Promise<Usuario> => {
  const { data } = await api.put<ApiResponse<Usuario>>(`/usuarios/${id}`, payload);
  return data.data;
};

export const cambiarEstadoUsuario = async (
  id: number,
  estado: EstadoUsuario,
): Promise<Usuario> => {
  const { data } = await api.patch<ApiResponse<Usuario>>(`/usuarios/${id}/estado`, { estado });
  return data.data;
};
