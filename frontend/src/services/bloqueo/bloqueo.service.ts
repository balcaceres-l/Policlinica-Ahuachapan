import type { BloqueoAgenda, NuevoBloqueo } from '@/types/bloqueo.types';
import { mockBloqueosAgenda, siguienteIdBloqueo } from '@/services/mockData';

export interface FiltrosBloqueoQuery {
  medicoId?: string;
  fecha?: string;
  tipoBloqueo?: string;
}

export const getBloqueos = async (filtros?: FiltrosBloqueoQuery): Promise<BloqueoAgenda[]> => {
  let lista = [...mockBloqueosAgenda];

  if (filtros?.medicoId) {
    lista = lista.filter((b) => b.medico_id === filtros.medicoId);
  }
  if (filtros?.fecha) {
    lista = lista.filter((b) => b.fecha === filtros.fecha);
  }
  if (filtros?.tipoBloqueo && filtros.tipoBloqueo !== 'TODOS') {
    lista = lista.filter((b) => b.tipo_bloqueo === filtros.tipoBloqueo);
  }

  return lista.sort((a, b) => b.fecha.localeCompare(a.fecha));
};

export const crearBloqueo = async (
  payload: NuevoBloqueo,
  medicoNombre: string,
  usuarioId = '',
): Promise<BloqueoAgenda> => {
  // Validación: si es completo, no puede haber otro bloqueo en la misma fecha
  if (payload.tipo_bloqueo === 'COMPLETO') {
    const duplicado = mockBloqueosAgenda.find(
      (b) => b.medico_id === payload.medico_id && b.fecha === payload.fecha,
    );
    if (duplicado) {
      throw new Error('El médico ya tiene un bloqueo de agenda registrado para esta fecha.');
    }
  } else {
    // Si es parcial, verificar si ya hay uno completo o si se cruzan las horas
    const bloqueoCompleto = mockBloqueosAgenda.find(
      (b) =>
        b.medico_id === payload.medico_id &&
        b.fecha === payload.fecha &&
        b.tipo_bloqueo === 'COMPLETO',
    );
    if (bloqueoCompleto) {
      throw new Error('El médico ya tiene un bloqueo completo para todo el día en esta fecha.');
    }

    if (payload.hora_inicio && payload.hora_fin) {
      const traslape = mockBloqueosAgenda.find(
        (b) =>
          b.medico_id === payload.medico_id &&
          b.fecha === payload.fecha &&
          b.tipo_bloqueo === 'PARCIAL' &&
          b.hora_inicio &&
          b.hora_fin &&
          b.hora_inicio < payload.hora_fin! &&
          payload.hora_inicio! < b.hora_fin,
      );
      if (traslape) {
        throw new Error(
          `Ya existe un bloqueo parcial en ese horario (${traslape.hora_inicio} - ${traslape.hora_fin}).`,
        );
      }
    }
  }

  const nuevo: BloqueoAgenda = {
    id: siguienteIdBloqueo(),
    medico_id: payload.medico_id,
    medicoNombre,
    fecha: payload.fecha,
    tipo_bloqueo: payload.tipo_bloqueo,
    hora_inicio: payload.hora_inicio,
    hora_fin: payload.hora_fin,
    motivo: payload.motivo,
    creado_por_id: usuarioId,
    fecha_creacion: new Date().toISOString().split('T')[0],
  };

  mockBloqueosAgenda.unshift(nuevo);
  return nuevo;
};

export const eliminarBloqueo = async (id: number): Promise<void> => {
  const idx = mockBloqueosAgenda.findIndex((b) => b.id === id);
  if (idx >= 0) {
    mockBloqueosAgenda.splice(idx, 1);
  }
};
