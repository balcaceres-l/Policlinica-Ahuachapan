import api from '@/services/api';
import type { ApiResponse } from '@/types/api.types';
import type {
  DashboardAdminData,
  DashboardMedicoData,
  ParametrosFiltroDashboard,
} from '@/types/dashboard.types';

export const getDashboardAdmin = async (
  filtros?: ParametrosFiltroDashboard,
): Promise<DashboardAdminData> => {
  const { data } = await api.get<ApiResponse<DashboardAdminData>>('/dashboard/admin', {
    params: filtros,
  });
  return data.data;
};

export const getDashboardMedico = async (
  filtros?: ParametrosFiltroDashboard,
): Promise<DashboardMedicoData> => {
  const { data } = await api.get<ApiResponse<DashboardMedicoData>>('/dashboard/medico', {
    params: filtros,
  });
  return data.data;
};
