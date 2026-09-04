import api from '@/services/api';
import type { ApiResponse } from '@/types/api.types';
import type { Credenciales, LoginRespuesta } from '@/types/auth.types';
import type { Usuario } from '@/types/user.types';

/** RF-01 — POST /auth/login */
export const login = async (credenciales: Credenciales): Promise<LoginRespuesta> => {
  const { data } = await api.post<ApiResponse<LoginRespuesta>>('/auth/login', credenciales);
  return data.data;
};

/** Recupera al usuario del token guardado (al recargar la página). */
export const obtenerUsuarioActual = async (): Promise<Usuario> => {
  const { data } = await api.get<ApiResponse<Usuario>>('/auth/me');
  return data.data;
};

/** Revoca el token actual en el servidor. */
export const logout = async (): Promise<void> => {
  await api.post('/auth/logout');
};
