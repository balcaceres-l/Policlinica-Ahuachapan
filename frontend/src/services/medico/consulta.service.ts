import api from '@/services/api';
import type { ApiResponse } from '@/types/api.types';
import type { Cita } from '@/types/cita.types';
import type { ConsultaDetalle } from '@/types/consulta';

export interface GuardarConsultaPayload {
  motivo_consulta?: string | null;
  notas_adicionales?: string | null;
  precio?: number | null;
  total?: number | null;
  segundos_transcurridos?: number | null;
  en_pausa?: boolean | null;
  examenes_fisicos?: Array<{
    id_examen?: string;
    region_anatomica?: string | null;
    hallazgos?: string | null;
  }>;
  /** HU-20 / HU-44 — sin código ni URI se guarda como texto libre. */
  diagnosticos?: Array<{
    descripcion: string;
    codigo_cie11?: string | null;
    uri_foundation?: string | null;
    uri_linearizacion?: string | null;
  }>;
  plan_manejo?: {
    descripcion?: string | null;
    indicaciones?: string | null;
  } | null;
  receta?: {
    observaciones_generales?: string | null;
    detalles?: Array<{
      nombre_medicamento: string;
      dosis: string;
      via_administracion?: string | null;
      frecuencia: string;
      duracion?: string | null;
      indicaciones?: string | null;
    }>;
  } | null;
}

export interface FinalizarConsultaPayload {
  notas_adicionales?: string | null;
  precio?: number | null;
  total?: number | null;
  segundos_transcurridos?: number | null;
}

export interface EspecialidadDisponible {
  id: string;
  nombre: string;
  estado: string;
}

/** Obtiene la lista de citas del día para la sala de espera del médico autenticado. */
export const getSalaEspera = async (): Promise<Cita[]> => {
  const { data } = await api.get<ApiResponse<Cita[]>>('/medico/sala-espera');
  return data.data;
};

/** Inicia la consulta médica de una cita. */
export const iniciarConsulta = async (
  citaId: string,
  especialidadAtencionId?: string,
): Promise<ConsultaDetalle> => {
  const { data } = await api.post<ApiResponse<ConsultaDetalle>>(`/citas/${citaId}/consulta`, {
    especialidad_atencion_id: especialidadAtencionId,
  });
  return data.data;
};

export interface ConsultaInmediataPayload {
  paciente_id: string;
  especialidad_atencion_id?: string;
  motivo_consulta?: string;
}

/**
 * Consulta inmediata: atiende a un paciente sin cita previa. El backend crea
 * una cita SIN_CITA para ahora mismo y abre su consulta.
 */
export const iniciarConsultaInmediata = async (
  payload: ConsultaInmediataPayload,
): Promise<ConsultaDetalle> => {
  const { data } = await api.post<ApiResponse<ConsultaDetalle>>('/medico/consulta-inmediata', payload);
  return data.data;
};

/** Obtiene el detalle completo de una consulta médica. */
export const getConsulta = async (consultaId: string): Promise<ConsultaDetalle> => {
  const { data } = await api.get<ApiResponse<ConsultaDetalle>>(`/consultas/${consultaId}`);
  return data.data;
};

/** Guarda o actualiza los datos clínicos, examen físico, plan y receta. */
export const actualizarConsulta = async (
  consultaId: string,
  payload: GuardarConsultaPayload,
): Promise<ConsultaDetalle> => {
  const { data } = await api.put<ApiResponse<ConsultaDetalle>>(`/consultas/${consultaId}`, payload);
  return data.data;
};

/** Finaliza la consulta médica y marca la cita como ATENDIDA. */
export const finalizarConsulta = async (
  consultaId: string,
  payload?: FinalizarConsultaPayload,
): Promise<ConsultaDetalle> => {
  const { data } = await api.patch<ApiResponse<ConsultaDetalle>>(
    `/consultas/${consultaId}/finalizar`,
    payload ?? {},
  );
  return data.data;
};

/** Especialidades con las que el médico puede atender consultas. */
export const getEspecialidadesDisponibles = async (): Promise<EspecialidadDisponible[]> => {
  const { data } = await api.get<ApiResponse<EspecialidadDisponible[]>>(
    '/consultas/especialidades-disponibles',
  );
  return data.data;
};