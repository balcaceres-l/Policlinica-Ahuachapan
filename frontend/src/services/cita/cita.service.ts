import api from '@/services/api';
import type { ApiResponse } from '@/types/api.types';
import type {
  AgendaDesplazada,
  Cita,
  DesplazarAgendaPayload,
  NuevaCita,
  ReprogramarCitaPayload,
  SignosVitales,
} from '@/types/cita.types';

export interface FiltrosCitasQuery {
  fecha?: string;
  desde?: string;
  hasta?: string;
  medico_id?: string;
  paciente_id?: string;
  estado?: string;
}

export interface BloqueDisponible {
  hora_inicio: string;
  hora_fin: string;
}

export interface Disponibilidad {
  bloqueado: boolean;
  bloques: BloqueDisponible[];
}

export const getCitas = async (filtros?: FiltrosCitasQuery): Promise<Cita[]> => {
  const { data } = await api.get<ApiResponse<Cita[]>>('/citas', {
    params: {
      fecha: filtros?.fecha,
      desde: filtros?.desde,
      hasta: filtros?.hasta,
      medico_id: filtros?.medico_id,
      paciente_id: filtros?.paciente_id,
      estado: filtros?.estado === 'TODOS' ? undefined : filtros?.estado,
    },
  });
  return data.data;
};

/** Bloques libres del día, ya descontando bloqueos y citas regulares. */
export const getDisponibilidad = async (
  medicoId: string,
  fecha: string,
): Promise<Disponibilidad> => {
  const { data } = await api.get<ApiResponse<Disponibilidad>>('/agenda/disponibilidad', {
    params: { medico_id: medicoId, fecha },
  });
  return data.data;
};

export const agendarCita = async (payload: NuevaCita): Promise<Cita> => {
  const { data } = await api.post<ApiResponse<Cita>>('/citas', payload);
  return data.data;
};

export const marcarLlegadaCita = async (id: string): Promise<Cita> => {
  const { data } = await api.patch<ApiResponse<Cita>>(`/citas/${id}/llegada`);
  return data.data;
};

/** Manda al final de la fila a quien llega con retraso. */
export const moverCitaAlFinal = async (id: string): Promise<Cita> => {
  const { data } = await api.patch<ApiResponse<Cita>>(`/citas/${id}/mover-al-final`);
  return data.data;
};

export const reprogramarCita = async (
  id: string,
  payload: ReprogramarCitaPayload,
): Promise<Cita> => {
  const { data } = await api.patch<ApiResponse<Cita>>(`/citas/${id}/reprogramar`, payload);
  return data.data;
};

export const cancelarCita = async (id: string, motivo: string): Promise<Cita> => {
  const { data } = await api.patch<ApiResponse<Cita>>(`/citas/${id}/cancelar`, {
    motivo_cancelacion: motivo,
  });
  return data.data;
};

/** HU-37 — corre las citas pendientes cuando el médico llega tarde. */
export const desplazarAgenda = async (
  medicoId: string,
  payload: DesplazarAgendaPayload,
): Promise<AgendaDesplazada> => {
  const { data } = await api.patch<ApiResponse<AgendaDesplazada>>(
    `/medicos/${medicoId}/agenda/desplazar`,
    payload,
  );
  return data.data;
};

/**
 * Pendiente de Sprint 2: los signos vitales cuelgan de `consulta`, que todavía
 * no existe en la base. La pantalla los calcula pero no se persisten.
 */
export const guardarSignosVitales = async (
  _id: string,
  datos: SignosVitales,
): Promise<SignosVitales> => {
  let imc = datos.imc;
  if (datos.peso_kg && datos.talla_cm && datos.talla_cm > 0) {
    const metros = datos.talla_cm / 100;
    imc = Number((datos.peso_kg / (metros * metros)).toFixed(1));
  }

  throw Object.assign(
    new Error('El registro de signos vitales estará disponible en el siguiente sprint.'),
    { imcCalculado: imc },
  );
};
