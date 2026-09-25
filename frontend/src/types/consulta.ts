
export type EstadoConsulta =
  | 'espera'
  | 'consulta'
  | 'atendido';

export type TipoAtencion =
  | 'Con cita'
  | 'Sin cita';

export interface SignosVitales {
  sistolica: string;
  diastolica: string;
  temperatura: string;
  frecuencia: string;
  saturacion: string;
  peso: string;
  talla: string;
}

export interface PacienteConsulta {
  id: string;
  nombre: string;
  expediente: string;
  edad: number;
  tipo: TipoAtencion;
  horaLlegada: string;
  motivo: string;
  estado: EstadoConsulta;

  // Marcas de tiempo en milisegundos.
  inicio?: number;
  fin?: number;

  signos: SignosVitales;

  anamnesis: string;
  examen: string;
  diagnostico: string;
  plan: string;
  observaciones: string;
}