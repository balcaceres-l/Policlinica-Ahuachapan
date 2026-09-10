import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  crearBloqueo,
  eliminarBloqueo,
  getBloqueos,
  type FiltrosBloqueoQuery,
} from '@/services/bloqueo/bloqueo.service';
import type { NuevoBloqueo } from '@/types/bloqueo.types';

export const bloqueosKeys = {
  all: ['bloqueos'] as const,
  filtrados: (filtros?: FiltrosBloqueoQuery) => ['bloqueos', filtros] as const,
};

export const useBloqueos = (filtros?: FiltrosBloqueoQuery) => {
  return useQuery({
    queryKey: bloqueosKeys.filtrados(filtros),
    queryFn: () => getBloqueos(filtros),
  });
};

export const useCrearBloqueo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      payload,
      medicoNombre,
    }: {
      payload: NuevoBloqueo;
      medicoNombre: string;
    }) => crearBloqueo(payload, medicoNombre),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bloqueosKeys.all });
    },
  });
};

export const useEliminarBloqueo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => eliminarBloqueo(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bloqueosKeys.all });
    },
  });
};
