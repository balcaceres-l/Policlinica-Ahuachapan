import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { crearPaciente, eliminarPaciente, getPacientes } from '@/services/paciente/paciente.service';
import type { FiltrosPacienteQuery, NuevoPaciente } from '@/types/paciente.types';

export const pacientesKeys = {
  all: ['pacientes'] as const,
  lista: (filtros?: FiltrosPacienteQuery | string) => ['pacientes', { filtros }] as const,
};

export const usePacientes = (filtros?: FiltrosPacienteQuery | string) => {
  return useQuery({
    queryKey: pacientesKeys.lista(filtros),
    queryFn: () => getPacientes(filtros),
  });
};

export const useCrearPaciente = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: NuevoPaciente) => crearPaciente(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: pacientesKeys.all });
    },
  });
};

export const useEliminarPaciente = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => eliminarPaciente(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: pacientesKeys.all });
    },
  });
};
