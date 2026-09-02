import { useQuery } from '@tanstack/react-query';
import { getMedicos, getUsuarios } from '@/services/usuario/usuario.service';

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
