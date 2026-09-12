import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NuevoHorario } from '@/types/horario.types';
import {
  actualizarHorario,
  crearHorario,
  eliminarHorario,
  getHorariosDeMedico,
} from '@/services/horario/horario.service';

export const horariosKeys = {
  all: ['horarios'] as const,
  deMedico: (medicoId: string) => ['horarios', 'medico', medicoId] as const,
};

/** Invalida los horarios de todos los médicos tras una mutación. */
const useInvalidarHorarios = () => {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: horariosKeys.all });
  };
};

export const useHorariosDeMedico = (medicoId: string | null) =>
  useQuery({
    queryKey: horariosKeys.deMedico(medicoId ?? ''),
    queryFn: () => getHorariosDeMedico(medicoId as string),
    enabled: medicoId !== null,
  });

/** HU-34 */
export const useCrearHorario = () => {
  const invalidar = useInvalidarHorarios();
  return useMutation({
    mutationFn: (payload: NuevoHorario) => crearHorario(payload),
    onSuccess: invalidar,
  });
};

export const useActualizarHorario = () => {
  const invalidar = useInvalidarHorarios();
  return useMutation({
    mutationFn: (vars: { id: number; payload: NuevoHorario }) =>
      actualizarHorario(vars.id, vars.payload),
    onSuccess: invalidar,
  });
};

export const useEliminarHorario = () => {
  const invalidar = useInvalidarHorarios();
  return useMutation({
    mutationFn: (id: number) => eliminarHorario(id),
    onSuccess: invalidar,
  });
};
