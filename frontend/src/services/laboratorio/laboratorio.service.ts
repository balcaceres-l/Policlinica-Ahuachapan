import api from '@/services/api';
import type { ApiResponse } from '@/types/api.types';
import type { NuevoResultadoLaboratorio, ResultadoLaboratorio } from '@/types/laboratorio.types';

/** HU-23 — resultados del paciente, del más reciente al más antiguo. */
export const getResultadosPaciente = async (pacienteId: string): Promise<ResultadoLaboratorio[]> => {
  const { data } = await api.get<ApiResponse<ResultadoLaboratorio[]>>(`/pacientes/${pacienteId}/laboratorio`);
  return data.data;
};

/** Últimos resultados registrados en la clínica, de cualquier paciente. */
export const getResultadosRecientes = async (): Promise<ResultadoLaboratorio[]> => {
  const { data } = await api.get<ApiResponse<ResultadoLaboratorio[]>>('/laboratorio');
  return data.data;
};

/** HU-41 — registra un resultado como texto, adjunto o ambos. */
export const registrarResultado = async (
  pacienteId: string,
  payload: NuevoResultadoLaboratorio,
): Promise<ResultadoLaboratorio> => {
  const formulario = new FormData();
  formulario.append('nombre_examen', payload.nombre_examen);
  formulario.append('fecha_examen', payload.fecha_examen);
  if (payload.resultado_texto) formulario.append('resultado_texto', payload.resultado_texto);
  if (payload.archivo) formulario.append('archivo', payload.archivo);
  if (payload.consulta_id) formulario.append('consulta_id', payload.consulta_id);

  const { data } = await api.post<ApiResponse<ResultadoLaboratorio>>(
    `/pacientes/${pacienteId}/laboratorio`,
    formulario,
    { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 },
  );
  return data.data;
};

export const eliminarResultado = async (id: string): Promise<void> => {
  await api.delete(`/laboratorio/${id}`);
};

/** El adjunto no tiene URL pública: se descarga con el token y se muestra desde memoria. */
export const getArchivoResultado = async (id: string): Promise<Blob> => {
  const { data } = await api.get<Blob>(`/laboratorio/${id}/archivo`, {
    responseType: 'blob',
    timeout: 60000,
  });
  return data;
};
