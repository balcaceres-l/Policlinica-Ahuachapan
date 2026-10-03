export type TipoCita = 'REGULAR' | 'EMERGENCIA' | 'SOBRECUPO';

export type EstadoCita =
  | 'AGENDADA'
  | 'EN_ESPERA'
  | 'EN_ATENCION'
  | 'ATENDIDA'
  | 'CANCELADA'
  | 'NO_ASISTIO';

export interface SignosVitales {
  id?: string;
  cita_id?: string;
  presion_sistolica?: number | null;
  presion_diastolica?: number | null;
  frecuencia_cardiaca?: number | null;
  frecuencia_respiratoria?: number | null;
  temperatura_c?: number | null;
  peso_kg?: number | null;
  talla_cm?: number | null;
  imc?: number | null;
  saturacion_oxigeno?: number | null;
  observaciones?: string | null;
  registrado_por_id?: string;
  fecha_registro?: string;
}

export interface Cita {
  id: string;
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
  consulta_id?: string;
  consulta_precio?: number | null;
  consulta_total?: number | null;
  /** Minutos desde la hora agendada mientras el paciente no llega (RF-44). */
  minutos_retraso: number;
  retrasada: boolean;
  /** Pendiente que cae dentro de un bloqueo de agenda: recepción debe contactar al paciente. */
  afectada_por_bloqueo?: boolean;
  bloqueo?: BloqueoDeCita | null;
}

/** El bloqueo que afecta a una cita, tal como lo resume el listado de citas. */
export interface BloqueoDeCita {
  id: string;
  tipo_bloqueo: 'COMPLETO' | 'PARCIAL';
  hora_inicio: string | null;
  hora_fin: string | null;
  motivo: string;
}

export interface DesplazarAgendaPayload {
  fecha: string;
  minutos: number;
  /** Si se omite, se corre toda la jornada del día. */
  desde_hora?: string;
}

export interface AgendaDesplazada {
  citas: Cita[];
  /** Citas que quedaron fuera del horario del médico tras el desplazamiento. */
  fueraDeHorario: string[];
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
  medico_id?: string;
  especialidad_id?: string;
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
