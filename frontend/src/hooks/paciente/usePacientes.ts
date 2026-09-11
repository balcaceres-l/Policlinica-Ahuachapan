import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { crearPaciente, getPacientes } from '@/services/paciente/paciente.service';
import type { NuevoPaciente } from '@/types/paciente.types';

export const pacientesKeys = {
  all: ['pacientes'] as const,
  lista: (busqueda?: string) => ['pacientes', { busqueda }] as const,
};

export const usePacientes = (busqueda = '') => {
  return useQuery({
    queryKey: pacientesKeys.lista(busqueda),
    queryFn: () => getPacientes(busqueda),
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
