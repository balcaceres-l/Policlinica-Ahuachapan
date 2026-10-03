import api from '@/services/api';
import type { ApiResponse } from '@/types/api.types';
import type { ConsultaHistorial } from '@/types/historial.types';

/**
 * HU-22 — Historial de citas y atenciones del paciente.
 * Obtiene todas las atenciones previas con signos vitales, diagnósticos,
 * examen físico, plan de manejo y recetas.
 */
export const getHistorialPaciente = async (pacienteId: string): Promise<ConsultaHistorial[]> => {
  const { data } = await api.get<ApiResponse<ConsultaHistorial[]>>(`/pacientes/${pacienteId}/historial`);
  return data.data;
};

