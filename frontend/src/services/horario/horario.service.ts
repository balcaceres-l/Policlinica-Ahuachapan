import type { HorarioMedico, NuevoHorario } from '@/types/horario.types';
import { DIA_LABEL, DIAS_SEMANA, formatearHora } from '@/lib/constants/dias';
import { delay } from '@/lib/utils';
import { mockHorariosMedicos, siguienteIdHorario } from '@/services/mockData';

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
  await delay(300);
  return ordenar(mockHorariosMedicos.filter((horario) => horario.medico_id === medicoId));
};

/** HU-34 — alta de un bloque horario. */
export const crearHorario = async (payload: NuevoHorario): Promise<HorarioMedico> => {
  // TODO: api.post<ApiResponse<HorarioMedico>>('/horarios-medicos', payload)
  await delay(450);
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
  await delay(450);

  const indice = buscarIndice(id);
  validarSolapamiento(payload, id);

  const actualizado: HorarioMedico = { ...mockHorariosMedicos[indice], ...payload };
  mockHorariosMedicos[indice] = actualizado;
  return actualizado;
};

export const eliminarHorario = async (id: number): Promise<void> => {
  // TODO: api.delete(`/horarios-medicos/${id}`)
  await delay(350);
  mockHorariosMedicos.splice(buscarIndice(id), 1);
};
