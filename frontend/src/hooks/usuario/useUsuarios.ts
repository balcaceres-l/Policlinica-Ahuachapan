import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { crearUsuario, getMedicos, getUsuarios } from '@/services/usuario/usuario.service';
import type { NuevoUsuario } from '@/types/user.types';

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

export const useCrearUsuario = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: NuevoUsuario) => crearUsuario(payload),
    onSuccess: () => {
      // El selector de médicos de la vista de especialidades lee la
      // misma colección.
      void queryClient.invalidateQueries({ queryKey: usuariosKeys.all });
      void queryClient.invalidateQueries({ queryKey: usuariosKeys.medicos });
    },
  });
};
