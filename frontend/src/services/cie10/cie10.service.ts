import api from '@/services/api';
import type { ApiResponse } from '@/types/api.types';
import type { CodigoCie10 } from '@/types/cie10.types';

/** HU-44 — busca códigos CIE-10 por síntomas, diagnóstico o inicio de código. */
export const buscarCie10 = async (texto: string): Promise<CodigoCie10[]> => {
  const { data } = await api.get<ApiResponse<CodigoCie10[]>>('/catalogo/cie10', {
    params: { buscar: texto },
  });
  return data.data;
};
