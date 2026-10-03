import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  correrCitasTrasBloqueo,
  crearBloqueo,
  eliminarBloqueo,
  getBloqueos,
  getCitasAfectadas,
  type FiltrosBloqueoQuery,
} from '@/services/bloqueo/bloqueo.service';
import { citasKeys } from '@/hooks/cita/useCitas';
import type { NuevoBloqueo } from '@/types/bloqueo.types';

export const bloqueosKeys = {
  all: ['bloqueos'] as const,
  filtrados: (filtros?: FiltrosBloqueoQuery) => ['bloqueos', filtros] as const,
  citasAfectadas: (id: string) => ['bloqueos', 'citas-afectadas', id] as const,
};

export const useBloqueos = (filtros?: FiltrosBloqueoQuery) => {
  return useQuery({
    queryKey: bloqueosKeys.filtrados(filtros),
    queryFn: () => getBloqueos(filtros),
  });
};

/** Citas que siguen dentro del bloqueo; se vuelve a pedir al abrir para no mostrar datos viejos. */
export const useCitasAfectadas = (bloqueoId?: string) => {
  return useQuery({
    queryKey: bloqueosKeys.citasAfectadas(bloqueoId ?? ''),
    queryFn: () => getCitasAfectadas(bloqueoId as string),
    enabled: Boolean(bloqueoId),
    staleTime: 0,
  });
};

export const useCrearBloqueo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: NuevoBloqueo) => crearBloqueo(payload),
    onSuccess: () => {
      // Las citas llevan la marca de "afectada por bloqueo" y la disponibilidad cambia.
      void queryClient.invalidateQueries({ queryKey: bloqueosKeys.all });
      void queryClient.invalidateQueries({ queryKey: citasKeys.all });
    },
  });
};

export const useEliminarBloqueo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => eliminarBloqueo(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bloqueosKeys.all });
      void queryClient.invalidateQueries({ queryKey: citasKeys.all });
    },
  });
};

export const useCorrerCitasBloqueo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => correrCitasTrasBloqueo(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bloqueosKeys.all });
      void queryClient.invalidateQueries({ queryKey: citasKeys.all });
    },
  });
};
