import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  eliminarResultado,
  getArchivoResultado,
  getResultadosPaciente,
  getResultadosRecientes,
  registrarResultado,
} from '@/services/laboratorio/laboratorio.service';
import type { NuevoResultadoLaboratorio } from '@/types/laboratorio.types';

export const laboratorioKeys = {
  all: ['laboratorio'] as const,
  recientes: ['laboratorio', 'recientes'] as const,
  paciente: (pacienteId: string) => ['laboratorio', 'paciente', pacienteId] as const,
  archivo: (id: string) => ['laboratorio', 'archivo', id] as const,
};

/** HU-23 — resultados de laboratorio de un paciente. */
export const useResultadosLaboratorio = (pacienteId: string) => {
  return useQuery({
    queryKey: laboratorioKeys.paciente(pacienteId),
    queryFn: () => getResultadosPaciente(pacienteId),
    enabled: pacienteId !== '',
  });
};

export const useResultadosRecientes = () => {
  return useQuery({
    queryKey: laboratorioKeys.recientes,
    queryFn: getResultadosRecientes,
  });
};

/**
 * Adjunto de un resultado como URL en memoria; solo se pide al abrir el visor.
 * `liberar` la revoca y saca del caché: hay que llamarla al cerrar.
 */
export const useArchivoLaboratorio = (id: string | null) => {
  const queryClient = useQueryClient();
  const consulta = useQuery({
    queryKey: laboratorioKeys.archivo(id ?? ''),
    queryFn: async () => URL.createObjectURL(await getArchivoResultado(id!)),
    enabled: id !== null,
    staleTime: Infinity,
  });

  const liberar = () => {
    if (consulta.data) URL.revokeObjectURL(consulta.data);
    if (id) queryClient.removeQueries({ queryKey: laboratorioKeys.archivo(id) });
  };

  return { ...consulta, liberar };
};

/** HU-41 — registra un resultado de laboratorio. */
export const useRegistrarResultado = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pacienteId, payload }: { pacienteId: string; payload: NuevoResultadoLaboratorio }) =>
      registrarResultado(pacienteId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: laboratorioKeys.all });
    },
  });
};

export const useEliminarResultado = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: eliminarResultado,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: laboratorioKeys.all });
    },
  });
};
