export type TipoCita = 'REGULAR' | 'EMERGENCIA' | 'SOBRECUPO';

export type EstadoCita =
  | 'AGENDADA'
  | 'EN_ESPERA'
  | 'EN_ATENCION'
  | 'ATENDIDA'
  | 'CANCELADA'
  | 'NO_ASISTIO';

export interface SignosVitales {
  id?: number;
  cita_id?: number;
  presion_sistolica?: number;
  presion_diastolica?: number;
  frecuencia_cardiaca?: number;
  frecuencia_respiratoria?: number;
  temperatura_c?: number;
  peso_kg?: number;
  talla_cm?: number;
  imc?: number;
  saturacion_oxigeno?: number;
  observaciones?: string;
  registrado_por_id?: number;
  fecha_registro?: string;
}

export interface Cita {
  id: number;
  paciente_id: number;
  pacienteNombre: string;
  pacienteExpediente: string;
  medico_id: number;
  medicoNombre: string;
  especialidad_id?: number;
  especialidadNombre?: string;
  fecha: string; // YYYY-MM-DD
  hora_inicio: string; // HH:MM
  hora_fin: string; // HH:MM
  tipo_cita: TipoCita;
  estado: EstadoCita;
  motivo_cancelacion?: string;
  hora_llegada?: string;
  orden_atencion?: number;
  creado_por_id: number;
  signos_vitales?: SignosVitales;
}

export interface NuevaCita {
  paciente_id: number;
  medico_id: number;
  especialidad_id?: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  tipo_cita: TipoCita;
}

export interface ReprogramarCitaPayload {
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
}

/** HU-37 — datos para recorrer la agenda de un médico cuando presenta atraso. */
export interface AtrasoMedicoPayload {
  medico_id: number;
  fecha: string;
  minutos_atraso: number;
}

/** HU-37 — resultado de comparar el horario anterior contra el propuesto por el atraso. */
export interface CitaReubicada {
  citaId: number;
  pacienteNombre: string;
  horaInicioAnterior: string;
  horaFinAnterior: string;
  horaInicioNueva: string;
  horaFinNueva: string;
  /** true si el nuevo horario choca con un sobrecupo fijo o un bloqueo de agenda. */
  tieneColision: boolean;
}

export const ESTADO_CITA_LABEL: Record<EstadoCita, string> = {
  AGENDADA: 'Agendada',
  EN_ESPERA: 'En espera',
  EN_ATENCION: 'En atención',
  ATENDIDA: 'Atendida',
  CANCELADA: 'Cancelada',
  NO_ASISTIO: 'No asistió',
};

export const TIPO_CITA_LABEL: Record<TipoCita, string> = {
  REGULAR: 'Regular',
  EMERGENCIA: 'Emergencia',
  SOBRECUPO: 'Sobrecupo',
};
