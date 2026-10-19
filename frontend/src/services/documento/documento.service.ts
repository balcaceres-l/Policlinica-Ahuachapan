import api from '@/services/api';
import type { ApiResponse } from '@/types/api.types';
import type {
  ConstanciaMedica,
  MedicoDestino,
  NuevaReferencia,
  ReferenciaMedica,
} from '@/types/documento.types';

/** HU-31 */
export const crearConstancia = async (consultaId: string, motivo: string): Promise<ConstanciaMedica> => {
  const { data } = await api.post<ApiResponse<ConstanciaMedica>>(`/consultas/${consultaId}/constancias`, {
    motivo,
  });
  return data.data;
};

/** HU-32 */
export const crearReferencia = async (
  consultaId: string,
  payload: NuevaReferencia,
): Promise<ReferenciaMedica> => {
  const { data } = await api.post<ApiResponse<ReferenciaMedica>>(
    `/consultas/${consultaId}/referencias`,
    payload,
  );
  return data.data;
};

export const getMedicosDestino = async (): Promise<MedicoDestino[]> => {
  const { data } = await api.get<ApiResponse<MedicoDestino[]>>('/referencias/medicos-destino');
  return data.data;
};

/** HU-33 — rutas del PDF de cada documento. */
export const rutaPdf = {
  receta: (consultaId: string) => `/consultas/${consultaId}/receta/pdf`,
  constancia: (id: string) => `/constancias/${id}/pdf`,
  referencia: (id: string) => `/referencias/${id}/pdf`,
};

/** Trae el PDF con la sesión del usuario (la API pide el token, no basta abrir la URL). */
export const obtenerPdf = async (ruta: string, descargar = false): Promise<Blob> => {
  const { data } = await api.get<Blob>(ruta, {
    params: descargar ? { descargar: 1 } : undefined,
    responseType: 'blob',
  });
  return data;
};
