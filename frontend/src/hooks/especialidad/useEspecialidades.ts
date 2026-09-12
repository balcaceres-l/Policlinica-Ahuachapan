import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  Especialidad,
  EstadoEspecialidad,
  NuevaEspecialidad,
} from '@/types/especialidad.types';
import {
  actualizarEspecialidad,
  asignarEspecialidad,
  cambiarEstadoEspecialidad,
  crearEspecialidad,
  getCatalogoEspecialidades,
  getEspecialidades,
  getEspecialidadesActivas,
  getEspecialidadesDeMedico,
  quitarEspecialidad,
} from '@/services/especialidad/especialidad.service';

export const especialidadesKeys = {
  all: ['especialidades'] as const,
  activas: ['especialidades', 'activas'] as const,
  catalogo: ['especialidades', 'catalogo'] as const,
  deMedico: (medicoId: string) => ['especialidades', 'medico', medicoId] as const,
};

/** Invalida todo lo que depende del catálogo tras una mutación. */
const useInvalidarEspecialidades = () => {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: especialidadesKeys.all });
  };
};

export const useEspecialidades = () =>
  useQuery({
    queryKey: especialidadesKeys.all,
    queryFn: getEspecialidades,
  });

export const useEspecialidadesActivas = () =>
  useQuery({
    queryKey: especialidadesKeys.activas,
    queryFn: getEspecialidadesActivas,
  });

export const useCatalogoEspecialidades = () =>
  useQuery({
    queryKey: especialidadesKeys.catalogo,
    queryFn: getCatalogoEspecialidades,
  });

export const useEspecialidadesDeMedico = (medicoId: string | null) =>
  useQuery({
    queryKey: especialidadesKeys.deMedico(medicoId ?? ''),
    queryFn: () => getEspecialidadesDeMedico(medicoId as string),
    enabled: medicoId !== null,
  });

/** HU-07 */
export const useCrearEspecialidad = () => {
  const invalidar = useInvalidarEspecialidades();
  return useMutation({
    mutationFn: (payload: NuevaEspecialidad) => crearEspecialidad(payload),
    onSuccess: invalidar,
  });
};

export const useActualizarEspecialidad = () => {
  const invalidar = useInvalidarEspecialidades();
  return useMutation({
    mutationFn: (vars: { id: string; payload: NuevaEspecialidad }) =>
      actualizarEspecialidad(vars.id, vars.payload),
    onSuccess: invalidar,
  });
};

export const useCambiarEstadoEspecialidad = () => {
  const invalidar = useInvalidarEspecialidades();
  return useMutation({
    mutationFn: (vars: { especialidad: Especialidad; estado: EstadoEspecialidad }) =>
      cambiarEstadoEspecialidad(vars.especialidad, vars.estado),
    onSuccess: invalidar,
  });
};

/** HU-08 */
export const useAsignarEspecialidad = () => {
  const invalidar = useInvalidarEspecialidades();
  return useMutation({
    mutationFn: (vars: { medicoId: string; especialidadId: string }) =>
      asignarEspecialidad(vars.medicoId, vars.especialidadId),
    onSuccess: invalidar,
  });
};

export const useQuitarEspecialidad = () => {
  const invalidar = useInvalidarEspecialidades();
  return useMutation({
    mutationFn: (vars: { medicoId: string; especialidadId: string }) =>
      quitarEspecialidad(vars.medicoId, vars.especialidadId),
    onSuccess: invalidar,
  });
};
