import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  actualizarUsuario,
  cambiarEstadoUsuario,
  crearUsuario,
  getMedicos,
  getUsuarios,
} from '@/services/usuario/usuario.service';
import type { EditarUsuario, EstadoUsuario, NuevoUsuario } from '@/types/user.types';

export const usuariosKeys = {
  all: ['usuarios'] as const,
  medicos: ['usuarios', 'medicos'] as const,
};

export const useUsuarios = () =>
  useQuery({
    queryKey: usuariosKeys.all,
    queryFn: getUsuarios,
  });

export const useMedicos = () =>
  useQuery({
    queryKey: usuariosKeys.medicos,
    queryFn: getMedicos,
  });

/** El selector de médicos de la vista de especialidades lee la misma colección. */
const useInvalidarUsuarios = () => {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: usuariosKeys.all });
    void queryClient.invalidateQueries({ queryKey: usuariosKeys.medicos });
  };
};

export const useCrearUsuario = () => {
  const invalidar = useInvalidarUsuarios();

  return useMutation({
    mutationFn: (payload: NuevoUsuario) => crearUsuario(payload),
    onSuccess: invalidar,
  });
};

export const useActualizarUsuario = () => {
  const invalidar = useInvalidarUsuarios();

  return useMutation({
    mutationFn: (vars: { id: string; payload: EditarUsuario }) =>
      actualizarUsuario(vars.id, vars.payload),
    onSuccess: invalidar,
  });
};

export const useCambiarEstadoUsuario = () => {
  const invalidar = useInvalidarUsuarios();

  return useMutation({
    mutationFn: (vars: { id: string; estado: EstadoUsuario }) =>
      cambiarEstadoUsuario(vars.id, vars.estado),
    onSuccess: invalidar,
  });
};
