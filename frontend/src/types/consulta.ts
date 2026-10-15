import type { DiagnosticoConsulta } from '@/types/historial.types';

export interface ExamenFisico {
  id?: string;
  consulta_id?: string;
  region_anatomica?: string | null;
  hallazgos?: string | null;
}

export interface PlanManejo {
  id?: string;
  consulta_id?: string;
  descripcion?: string | null;
  indicaciones?: string | null;
}

export interface DetalleReceta {
  id?: string;
  receta_id?: string;
  nombre_medicamento: string;
  dosis: string;
  via_administracion?: string | null;
  frecuencia: string;
  duracion?: string | null;
  indicaciones?: string | null;
}

export interface RecetaMedica {
  id?: string;
  consulta_id?: string;
  fecha_emision?: string;
  observaciones_generales?: string | null;
  detalles: DetalleReceta[];
}

export interface ConsultaDetalle {
  id: string;
  cita_id: string;
  medico_id: string;
  medicoNombre?: string;
  medicoTelefono?: string;
  medicoCargo?: string;
  /** Número de junta del médico; lo imprime la receta. */
  medicoJvpm?: string | null;
  especialidad_atencion_id?: string | null;
  especialidadNombre?: string | null;
  fecha_hora_inicio: string;
  fecha_hora_fin?: string | null;
  motivo_consulta?: string | null;
  notas_adicionales?: string | null;
  precio?: number | null;
  total?: number | null;
  abierta: boolean;
  minutos_transcurridos: number;
  segundos_transcurridos?: number;
  en_pausa?: boolean;
  signos_vitales?: {
    id?: string;
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
  } | null;
  paciente?: {
    id: string;
    nombre: string;
    expediente: string;
    fecha_nacimiento?: string;
    dui?: string;
    telefono?: string;
  };
  examenes_fisicos: ExamenFisico[];
  diagnosticos?: DiagnosticoConsulta[];
  plan_manejo?: PlanManejo | null;
  receta?: RecetaMedica | null;
}