import type { DiaSemana, HorarioMedico, NuevoHorario } from '@/types/horario.types';
import { DIA_LABEL, DIAS_SEMANA, formatearHora } from '@/lib/constants/dias';
import { mockHorariosMedicos, siguienteIdHorario } from '@/services/mockData';

export interface BloqueHorarioSemanal {
  dia_semana: DiaSemana;
  hora_inicio: string;
  hora_fin: string;
}

/** Dos rangos se cruzan si cada uno empieza antes de que el otro termine. */
const seSolapan = (inicioA: string, finA: string, inicioB: string, finB: string): boolean =>
  inicioA < finB && inicioB < finA;

const ordenar = (horarios: HorarioMedico[]): HorarioMedico[] =>
  [...horarios].sort(
    (a, b) =>
      DIAS_SEMANA.indexOf(a.dia_semana) - DIAS_SEMANA.indexOf(b.dia_semana) ||
      a.hora_inicio.localeCompare(b.hora_inicio),
  );

/**
 * Regla de negocio (HU-34): un médico puede tener varios bloques el mismo día
 * —turno partido— pero no pueden traslaparse entre sí.
 */
const validarSolapamiento = (payload: NuevoHorario, ignorarId?: number): void => {
  const cruce = mockHorariosMedicos.find(
    (horario) =>
      horario.id !== ignorarId &&
      horario.medico_id === payload.medico_id &&
      horario.dia_semana === payload.dia_semana &&
      seSolapan(payload.hora_inicio, payload.hora_fin, horario.hora_inicio, horario.hora_fin),
  );

  if (cruce) {
    throw new Error(
      `Ese rango se cruza con el bloque de ${DIA_LABEL[cruce.dia_semana]} ` +
        `${formatearHora(cruce.hora_inicio)} – ${formatearHora(cruce.hora_fin)} ya registrado.`,
    );
  }
};

const buscarIndice = (id: number): number => {
  const indice = mockHorariosMedicos.findIndex((horario) => horario.id === id);
  if (indice < 0) {
    throw new Error('El horario ya no existe.');
  }
  return indice;
};

export const getHorariosDeMedico = async (medicoId: string): Promise<HorarioMedico[]> => {
  // TODO: api.get<ApiResponse<HorarioMedico[]>>(`/medicos/${medicoId}/horarios`)
  return ordenar(mockHorariosMedicos.filter((horario) => horario.medico_id === medicoId));
};

/** HU-34 — alta de un bloque horario. */
export const crearHorario = async (payload: NuevoHorario): Promise<HorarioMedico> => {
  // TODO: api.post<ApiResponse<HorarioMedico>>('/horarios-medicos', payload)
  validarSolapamiento(payload);

  const nuevo: HorarioMedico = { id: siguienteIdHorario(), ...payload };
  mockHorariosMedicos.push(nuevo);
  return nuevo;
};

export const actualizarHorario = async (
  id: number,
  payload: NuevoHorario,
): Promise<HorarioMedico> => {
  // TODO: api.put<ApiResponse<HorarioMedico>>(`/horarios-medicos/${id}`, payload)
  const indice = buscarIndice(id);
  validarSolapamiento(payload, id);

  const actualizado: HorarioMedico = { ...mockHorariosMedicos[indice], ...payload };
  mockHorariosMedicos[indice] = actualizado;
  return actualizado;
};

export const eliminarHorario = async (id: number): Promise<void> => {
  // TODO: api.delete(`/horarios-medicos/${id}`)
  mockHorariosMedicos.splice(buscarIndice(id), 1);
};

/**
 * Guarda y sincroniza la semana laboral completa de un médico.
 * Valida formato, orden de inicio/fin y ausencia de solapamiento entre turnos del mismo día.
 * Reemplaza los bloques existentes del médico por los nuevos configurados.
 */
export const guardarHorariosSemanales = async (
  medicoId: string,
  bloques: BloqueHorarioSemanal[],
): Promise<HorarioMedico[]> => {
  // TODO: api.put<ApiResponse<HorarioMedico[]>>(`/medicos/${medicoId}/horarios-semanales`, { bloques })

  // Validar formato y orden
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

  // Validar solapamientos internos dentro del mismo día
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

  // Remover bloques previos de este médico
  const restantes = mockHorariosMedicos.filter((h) => h.medico_id !== medicoId);
  mockHorariosMedicos.length = 0;
  mockHorariosMedicos.push(...restantes);

  // Asignar IDs incrementales
  let maxId = Math.max(0, ...mockHorariosMedicos.map((h) => h.id));
  const nuevos: HorarioMedico[] = bloques.map((b) => {
    maxId += 1;
    return {
      id: maxId,
      medico_id: medicoId,
      dia_semana: b.dia_semana,
      hora_inicio: b.hora_inicio,
      hora_fin: b.hora_fin,
    };
  });

  mockHorariosMedicos.push(...nuevos);
  return ordenar(nuevos);
};

