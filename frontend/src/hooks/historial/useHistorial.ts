import { useQuery } from '@tanstack/react-query';
import { getHistorialPaciente } from '@/services/historial/historial.service';

export const historialKeys = {
  all: ['historial'] as const,
  paciente: (pacienteId: string) => ['historial', pacienteId] as const,
};

/** HU-22 — historial de diagnósticos y tratamientos de un paciente. */
export const useHistorialPaciente = (pacienteId: string) => {
  return useQuery({
    queryKey: historialKeys.paciente(pacienteId),
    queryFn: () => getHistorialPaciente(pacienteId),
    enabled: pacienteId !== '',
  });
};
