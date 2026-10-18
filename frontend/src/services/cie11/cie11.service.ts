import api from '@/services/api';
import type { ApiResponse } from '@/types/api.types';
import type { ConfiguracionCie11, JerarquiaCie11, PaseCie11 } from '@/types/cie11.types';

/**
 * HU-44 — pase de corta duración para el buscador. No es el token de la OMS: ese
 * se queda en el servidor, que hace de intermediario.
 */
export const obtenerPaseCie11 = async (): Promise<PaseCie11> => {
  const { data } = await api.get<ApiResponse<PaseCie11>>('/cie11/pase');
  return data.data;
};

/** Versión vigente de la CIE-11 con la que trabaja el buscador. */
export const obtenerConfiguracionCie11 = async (): Promise<ConfiguracionCie11> => {
  const { data } = await api.get<ApiResponse<ConfiguracionCie11>>('/cie11/configuracion');
  return data.data;
};

/** Bloque y capítulo de un diagnóstico guardado, pedidos a la OMS bajo demanda. */
export const obtenerJerarquiaCie11 = async (uriLinearizacion: string): Promise<JerarquiaCie11> => {
  const { data } = await api.get<ApiResponse<JerarquiaCie11>>('/cie11/jerarquia', {
    params: { uri: uriLinearizacion },
  });
  return data.data;
};

/** Dirección del proxy de la OMS en nuestro backend: la ECT nunca habla directo con la OMS. */
export const urlProxyCie11 = (): string => `${String(api.defaults.baseURL).replace(/\/$/, '')}/oms-icd`;
