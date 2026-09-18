import api from '@/services/api';
import type { ApiResponse } from '@/types/api.types';
import type { DiaSemana, HorarioMedico, NuevoHorario } from '@/types/horario.types';
import { DIA_LABEL, formatearHora } from '@/lib/constants/dias';

export interface BloqueHorarioSemanal {
  dia_semana: DiaSemana;
  hora_inicio: string;
  hora_fin: string;
}

const seSolapan = (inicioA: string, finA: string, inicioB: string, finB: string): boolean =>
  inicioA < finB && inicioB < finA;

export const getHorariosDeMedico = async (medicoId: string): Promise<HorarioMedico[]> => {
  const { data } = await api.get<ApiResponse<HorarioMedico[]>>(`/medicos/${medicoId}/horarios`);
  return data.data;
};

export const crearHorario = async (payload: NuevoHorario): Promise<HorarioMedico> => {
  const { medico_id, ...tramo } = payload;
  const { data } = await api.post<ApiResponse<HorarioMedico>>(
    `/medicos/${medico_id}/horarios`,
    tramo,
  );
  return data.data;
};

export const actualizarHorario = async (
  id: string,
  payload: NuevoHorario,
): Promise<HorarioMedico> => {
  const { data } = await api.put<ApiResponse<HorarioMedico>>(`/horarios/${id}`, {
    dia_semana: payload.dia_semana,
    hora_inicio: payload.hora_inicio,
    hora_fin: payload.hora_fin,
  });
  return data.data;
};

export const eliminarHorario = async (id: string): Promise<void> => {
  await api.delete(`/horarios/${id}`);
};

/**
 * Reemplaza la semana completa. Se valida antes de enviar para dar respuesta
 * inmediata al usuario; el backend vuelve a comprobarlo de todos modos.
 */
export const guardarHorariosSemanales = async (
  medicoId: string,
  bloques: BloqueHorarioSemanal[],
): Promise<HorarioMedico[]> => {
  for (const b of bloques) {
    if (!b.hora_inicio || !b.hora_fin) {
      throw new Error(`En ${DIA_LABEL[b.dia_semana]}, debes ingresar hora de inicio y fin.`);
    }
    if (b.hora_inicio >= b.hora_fin) {
      throw new Error(
        `En ${DIA_LABEL[b.dia_semana]}, la hora de inicio (${b.hora_inicio}) debe ser anterior a la de fin (${b.hora_fin}).`,
      );
    }
  }

  for (let i = 0; i < bloques.length; i++) {
    for (let j = i + 1; j < bloques.length; j++) {
      const b1 = bloques[i];
      const b2 = bloques[j];
      if (
        b1.dia_semana === b2.dia_semana &&
        seSolapan(b1.hora_inicio, b1.hora_fin, b2.hora_inicio, b2.hora_fin)
      ) {
        throw new Error(
          `En ${DIA_LABEL[b1.dia_semana]}, se cruzan los turnos ` +
            `${formatearHora(b1.hora_inicio)}–${formatearHora(b1.hora_fin)} y ` +
            `${formatearHora(b2.hora_inicio)}–${formatearHora(b2.hora_fin)}.`,
        );
      }
    }
  }

  const { data } = await api.put<ApiResponse<HorarioMedico[]>>(
    `/medicos/${medicoId}/horarios`,
    { horarios: bloques },
  );
  return data.data;
};
