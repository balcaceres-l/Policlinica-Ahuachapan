import api from '@/services/api';
import type { ApiResponse } from '@/types/api.types';
import type { BloqueoAgenda, NuevoBloqueo } from '@/types/bloqueo.types';
import type { Cita } from '@/types/cita.types';

export interface FiltrosBloqueoQuery {
  medicoId?: string;
  desde?: string;
  hasta?: string;
}

/** El backend devuelve las citas que quedaron dentro del bloqueo para que recepción las gestione. */
export interface BloqueoCreado {
  bloqueo: BloqueoAgenda;
  citasAfectadas: Cita[];
}

export interface CitasCorridas {
  /** Solo las citas que se movieron: las que ya estaban libres no se tocan. */
  citas: Cita[];
  /** Citas que quedaron fuera del horario del médico tras correrlas. */
  fueraDeHorario: string[];
}

/** Sirve de vigentes y de historial: el backend no descarta las fechas pasadas. */
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
  const parcial = payload.tipo_bloqueo === 'PARCIAL';

  const { data } = await api.post<ApiResponse<BloqueoCreado>>('/bloqueos', {
    medico_id: payload.medico_id,
    fecha: payload.fecha,
    // Sin horas, el backend lo registra como día completo.
    hora_inicio: parcial ? payload.hora_inicio : undefined,
    hora_fin: parcial ? payload.hora_fin : undefined,
    motivo: payload.motivo,
  });
  return data.data;
};

export const eliminarBloqueo = async (id: string): Promise<void> => {
  await api.delete(`/bloqueos/${id}`);
};

/** Citas pendientes que hoy siguen dentro del bloqueo. */
export const getCitasAfectadas = async (id: string): Promise<Cita[]> => {
  const { data } = await api.get<ApiResponse<Cita[]>>(`/bloqueos/${id}/citas-afectadas`);
  return data.data;
};

/**
 * Para pacientes ya en la clínica: las citas afectadas pasan a empezar al terminar
 * el bloqueo, en orden, y solo se corren las siguientes que choquen con ellas.
 */
export const correrCitasTrasBloqueo = async (id: string): Promise<CitasCorridas> => {
  const { data } = await api.patch<ApiResponse<CitasCorridas>>(`/bloqueos/${id}/correr-citas`);
  return data.data;
};
