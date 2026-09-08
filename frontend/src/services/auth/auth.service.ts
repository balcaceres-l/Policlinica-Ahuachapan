import api from '@/services/api';
import type { ApiResponse } from '@/types/api.types';
import type { CambiarPasswordPayload, Credenciales, LoginRespuesta } from '@/types/auth.types';
import type { Usuario } from '@/types/user.types';

export const login = async (credenciales: Credenciales): Promise<LoginRespuesta> => {
  const { data } = await api.post<ApiResponse<LoginRespuesta>>('/auth/login', credenciales);
  return data.data;
};

export const obtenerUsuarioActual = async (): Promise<Usuario> => {
  const { data } = await api.get<ApiResponse<Usuario>>('/auth/me');
  return data.data;
};

export const logout = async (): Promise<void> => {
  await api.post('/auth/logout');
};

/** El backend conserva la sesión actual, así que no hay que volver a entrar. */
export const cambiarPassword = async (payload: CambiarPasswordPayload): Promise<void> => {
  await api.patch('/auth/change-password', payload);
};
