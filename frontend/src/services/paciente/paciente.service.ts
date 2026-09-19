import api from '@/services/api';
import type { ApiResponse } from '@/types/api.types';
import type { NuevoPaciente, Paciente } from '@/types/paciente.types';

export const getPacientes = async (busqueda = ''): Promise<Paciente[]> => {
  const { data } = await api.get<ApiResponse<Paciente[]>>('/pacientes', { params: { buscar: busqueda || undefined } });
  return data.data;
};

export const crearPaciente = async (payload: NuevoPaciente): Promise<Paciente> => {
  const { data } = await api.post<ApiResponse<Paciente>>('/pacientes', payload);
  return data.data;
};

export const actualizarPaciente = async (id: string, payload: NuevoPaciente): Promise<Paciente> => {
  const { data } = await api.put<ApiResponse<Paciente>>(`/pacientes/${id}`, payload);
  return data.data;
};

export const eliminarPaciente = async (id: string): Promise<void> => {
  await api.delete(`/pacientes/${id}`);
};
