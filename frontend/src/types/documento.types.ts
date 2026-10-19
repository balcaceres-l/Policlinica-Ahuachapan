/** HU-31 — constancia médica emitida desde una consulta. */
export interface ConstanciaMedica {
  id: string;
  consulta_id: string;
  paciente_id: string;
  medico_id: string;
  medicoNombre?: string | null;
  motivo: string;
  fecha_emision: string;
}

export type TipoReferencia = 'INTERNA' | 'EXTERNA';

/**
 * HU-32 — INTERNA: hacia otro médico de la policlínica, el PDF lleva el
 * expediente completo. EXTERNA: el PDF lleva solo lo que el médico escribe.
 */
export interface ReferenciaMedica {
  id: string;
  consulta_id: string;
  paciente_id: string;
  medico_id: string;
  medicoNombre?: string | null;
  tipo: TipoReferencia;
  medico_destino_id: string | null;
  medicoDestinoNombre?: string | null;
  destino: string | null;
  especialidad_destino: string | null;
  motivo: string;
  resumen_clinico: string | null;
  fecha_emision: string;
}

export interface NuevaReferencia {
  tipo: TipoReferencia;
  medico_destino_id?: string;
  destino?: string;
  especialidad_destino?: string;
  motivo: string;
  resumen_clinico?: string;
}

/** Médico de la policlínica al que se puede referir internamente. */
export interface MedicoDestino {
  id: string;
  nombre: string;
  especialidades: string[];
}
