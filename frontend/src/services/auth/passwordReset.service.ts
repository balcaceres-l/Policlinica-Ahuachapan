import api from '@/services/api';
import type { ApiResponse } from '@/types/api.types';

export interface RestablecerPasswordPayload {
  usuario: string;
  token: string;
  password: string;
  password_confirmation: string;
}

export const solicitarRecuperacion = async (usuario: string): Promise<string> => {
  const { data } = await api.post<ApiResponse<null>>('/auth/forgot-password', {
    usuario,
  });
  return data.message;
};

export const restablecerPassword = async (
  payload: RestablecerPasswordPayload,
): Promise<string> => {
  const { data } = await api.post<ApiResponse<null>>('/auth/reset-password', payload);
  return data.message;
};
