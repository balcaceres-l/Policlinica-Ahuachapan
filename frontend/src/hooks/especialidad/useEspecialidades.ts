import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NuevaEspecialidad } from '@/types/especialidad.types';
import {
  asignarEspecialidad,
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
  deMedico: (medicoId: number) => ['especialidades', 'medico', medicoId] as const,
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

export const useEspecialidadesDeMedico = (medicoId: number | null) =>
  useQuery({
    queryKey: especialidadesKeys.deMedico(medicoId ?? 0),
    queryFn: () => getEspecialidadesDeMedico(medicoId as number),
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

/** HU-08 */
export const useAsignarEspecialidad = () => {
  const invalidar = useInvalidarEspecialidades();
  return useMutation({
    mutationFn: (vars: { medicoId: number; especialidadId: number }) =>
      asignarEspecialidad(vars.medicoId, vars.especialidadId),
    onSuccess: invalidar,
  });
};

export const useQuitarEspecialidad = () => {
  const invalidar = useInvalidarEspecialidades();
  return useMutation({
    mutationFn: (vars: { medicoId: number; especialidadId: number }) =>
      quitarEspecialidad(vars.medicoId, vars.especialidadId),
    onSuccess: invalidar,
  });
};
