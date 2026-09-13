import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  agendarCita,
  aplicarReubicacionPorAtraso,
  cancelarCita,
  getCitas,
  guardarSignosVitales,
  marcarLlegadaCita,
  previsualizarReubicacionPorAtraso,
  reprogramarCita,
  type FiltrosCitasQuery,
} from '@/services/cita/cita.service';
import type {
  AtrasoMedicoPayload,
  NuevaCita,
  ReprogramarCitaPayload,
  SignosVitales,
} from '@/types/cita.types';

export const citasKeys = {
  all: ['citas'] as const,
  filtradas: (filtros?: FiltrosCitasQuery) => ['citas', filtros] as const,
};

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
    mutationFn: (id: number) => marcarLlegadaCita(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: citasKeys.all });
    },
  });
};

export const useReprogramarCita = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ReprogramarCitaPayload }) =>
      reprogramarCita(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: citasKeys.all });
    },
  });
};

export const useCancelarCita = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: number; motivo: string }) => cancelarCita(id, motivo),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: citasKeys.all });
    },
  });
};

export const useGuardarSignosVitales = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, datos }: { id: number; datos: SignosVitales }) =>
      guardarSignosVitales(id, datos),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: citasKeys.all });
    },
  });
};

/** HU-37 — no muta datos, solo calcula el corrimiento propuesto para mostrarlo antes de aplicarlo. */
export const usePrevisualizarReubicacionPorAtraso = () => {
  return useMutation({
    mutationFn: (payload: AtrasoMedicoPayload) => previsualizarReubicacionPorAtraso(payload),
  });
};

export const useAplicarReubicacionPorAtraso = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AtrasoMedicoPayload) => aplicarReubicacionPorAtraso(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: citasKeys.all });
    },
  });
};

