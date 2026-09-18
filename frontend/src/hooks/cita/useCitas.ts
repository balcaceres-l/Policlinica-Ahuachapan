import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  agendarCita,
  cancelarCita,
  getCitas,
  getDisponibilidad,
  guardarSignosVitales,
  marcarLlegadaCita,
  reprogramarCita,
  type FiltrosCitasQuery,
} from '@/services/cita/cita.service';
import type { NuevaCita, ReprogramarCitaPayload, SignosVitales } from '@/types/cita.types';

export const citasKeys = {
  all: ['citas'] as const,
  filtradas: (filtros?: FiltrosCitasQuery) => ['citas', filtros] as const,
  disponibilidad: (medicoId: string, fecha: string) =>
    ['citas', 'disponibilidad', medicoId, fecha] as const,
};

/**
 * HU-17 — bloques libres de un médico en una fecha. Solo consulta cuando hay
 * médico y fecha; sin ambos no hay nada que mostrar.
 */
export const useDisponibilidad = (medicoId?: string, fecha?: string) =>
  useQuery({
    queryKey: citasKeys.disponibilidad(medicoId ?? '', fecha ?? ''),
    queryFn: () => getDisponibilidad(medicoId as string, fecha as string),
    enabled: Boolean(medicoId) && Boolean(fecha),
    staleTime: 0,
  });

export const useCitas = (filtros?: FiltrosCitasQuery) => {
  return useQuery({
    queryKey: citasKeys.filtradas(filtros),
    queryFn: () => getCitas(filtros),
  });
};

export const useAgendarCita = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: NuevaCita) => agendarCita(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: citasKeys.all });
    },
  });
};

export const useMarcarLlegada = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => marcarLlegadaCita(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: citasKeys.all });
    },
  });
};

export const useReprogramarCita = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReprogramarCitaPayload }) =>
      reprogramarCita(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: citasKeys.all });
    },
  });
};

export const useCancelarCita = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) => cancelarCita(id, motivo),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: citasKeys.all });
    },
  });
};

export const useGuardarSignosVitales = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, datos }: { id: string; datos: SignosVitales }) =>
      guardarSignosVitales(id, datos),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: citasKeys.all });
    },
  });
};

