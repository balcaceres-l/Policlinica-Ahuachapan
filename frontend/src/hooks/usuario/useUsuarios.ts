import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NuevoUsuario } from '@/types/user.types';
import { crearUsuario, getMedicos, getUsuarios } from '@/services/usuario/usuario.service';

export const usuariosKeys = {
  all: ['usuarios'] as const,
  medicos: ['usuarios', 'medicos'] as const,
};

/** Invalida todos los listados de usuarios tras una mutación. */
const useInvalidarUsuarios = () => {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: usuariosKeys.all });
  };
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

/** HU-03 */
export const useCrearUsuario = () => {
  const invalidar = useInvalidarUsuarios();
  return useMutation({
    mutationFn: (payload: NuevoUsuario) => crearUsuario(payload),
    onSuccess: invalidar,
  });
};
