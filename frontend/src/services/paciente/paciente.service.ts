import api from '@/services/api';
import type { ApiResponse } from '@/types/api.types';
import type { FiltrosPacienteQuery, NuevoPaciente, Paciente } from '@/types/paciente.types';

export const getPacientes = async (filtros?: FiltrosPacienteQuery | string): Promise<Paciente[]> => {
  const params: Record<string, string | undefined> = {};

  if (typeof filtros === 'string') {
    if (filtros.trim()) params.buscar = filtros.trim();
  } else if (filtros) {
    if (filtros.buscar?.trim()) params.buscar = filtros.buscar.trim();
    if (filtros.estado) params.estado = filtros.estado;
    if (filtros.categoria && filtros.categoria !== 'TODOS') params.categoria = filtros.categoria;
  }

  const { data } = await api.get<ApiResponse<Paciente[]>>('/pacientes', { params });
  return data.data;
};

export const getPacienteById = async (id: string): Promise<Paciente> => {
  const { data } = await api.get<ApiResponse<Paciente>>(`/pacientes/${id}`);
  return data.data;
};

export const crearPaciente = async (payload: NuevoPaciente): Promise<Paciente> => {
  const { data } = await api.post<ApiResponse<Paciente>>('/pacientes', payload);
  return data.data;
};

export const eliminarPaciente = async (id: string): Promise<Paciente> => {
  const { data } = await api.delete<ApiResponse<Paciente>>(`/pacientes/${id}`);
  return data.data;
};
