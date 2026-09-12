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
  registrado_por_id?: string;
  fecha_registro?: string;
}

export interface Cita {
  id: number;
  paciente_id: string;
  pacienteNombre: string;
  pacienteExpediente: string;
  medico_id: string;
  medicoNombre: string;
  especialidad_id?: string;
  especialidadNombre?: string;
  fecha: string; // YYYY-MM-DD
  hora_inicio: string; // HH:MM
  hora_fin: string; // HH:MM
  tipo_cita: TipoCita;
  estado: EstadoCita;
  motivo_cancelacion?: string;
  hora_llegada?: string;
  orden_atencion?: number;
  creado_por_id: string;
  signos_vitales?: SignosVitales;
}

export interface NuevaCita {
  paciente_id: string;
  medico_id: string;
  especialidad_id?: string;
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
