import { useQuery } from '@tanstack/react-query';
import {
  getDashboardAdmin,
  getDashboardMedico,
} from '@/services/dashboard/dashboard.service';
import type { ParametrosFiltroDashboard } from '@/types/dashboard.types';

export const dashboardKeys = {
  admin: (filtros?: ParametrosFiltroDashboard) => ['dashboard', 'admin', filtros] as const,
  medico: (filtros?: ParametrosFiltroDashboard) => ['dashboard', 'medico', filtros] as const,
};

export const useDashboardAdmin = (filtros?: ParametrosFiltroDashboard) => {
  return useQuery({
    queryKey: dashboardKeys.admin(filtros),
    queryFn: () => getDashboardAdmin(filtros),
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
};

export const useDashboardMedico = (filtros?: ParametrosFiltroDashboard) => {
  return useQuery({
    queryKey: dashboardKeys.medico(filtros),
    queryFn: () => getDashboardMedico(filtros),
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
};
