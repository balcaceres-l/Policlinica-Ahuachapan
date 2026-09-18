import api from '@/services/api';
import type { ApiResponse } from '@/types/api.types';
import type { BloqueoAgenda, NuevoBloqueo } from '@/types/bloqueo.types';
import type { Cita } from '@/types/cita.types';

export interface FiltrosBloqueoQuery {
  medicoId?: string;
  desde?: string;
  hasta?: string;
}

/** El backend devuelve las citas del día bloqueado para que recepción las gestione. */
export interface BloqueoCreado {
  bloqueo: BloqueoAgenda;
  citasAfectadas: Cita[];
}

export const getBloqueos = async (filtros?: FiltrosBloqueoQuery): Promise<BloqueoAgenda[]> => {
  const { data } = await api.get<ApiResponse<BloqueoAgenda[]>>('/bloqueos', {
    params: {
      medico_id: filtros?.medicoId,
      desde: filtros?.desde,
      hasta: filtros?.hasta,
    },
  });
  return data.data;
};

export const crearBloqueo = async (payload: NuevoBloqueo): Promise<BloqueoCreado> => {
  // El bloqueo parcial existe en la interfaz pero no está soportado: RF-38 y el
  // ERD solo contemplan bloquear el día completo.
  if (payload.tipo_bloqueo === 'PARCIAL') {
    throw new Error('Por ahora solo puede bloquearse el día completo.');
  }

  const { data } = await api.post<ApiResponse<BloqueoCreado>>('/bloqueos', {
    medico_id: payload.medico_id,
    fecha: payload.fecha,
    motivo: payload.motivo,
  });
  return data.data;
};

export const eliminarBloqueo = async (id: string): Promise<void> => {
  await api.delete(`/bloqueos/${id}`);
};
