export type PeriodoFiltro =
  | 'mes_actual'
  | 'mes_anterior'
  | 'ultimos_30_dias'
  | 'ano_actual'
  | 'personalizado';

export interface RangoPeriodo {
  desde: string;
  hasta: string;
  periodo: string;
}

export interface TendenciaDiaria {
  fecha: string;
  dia: string;
  etiqueta: string;
  atendidas: number;
  canceladas: number;
  total: number;
}

export interface EspecialidadDemandada {
  id: string;
  nombre: string;
  total: number;
  porcentaje: number;
}

export interface MedicoRendimiento {
  id: string;
  nombre_completo: string;
  jvpm: string | null;
  consultas_atendidas: number;
  total_ingresos: number;
}

export interface DiagnosticoFrecuente {
  codigo: string;
  descripcion: string;
  total: number;
}

export interface DashboardAdminData {
  rango: RangoPeriodo;
  kpis: {
    consultas_atendidas: number;
    total_citas: number;
    tasa_efectividad: number;
    ingresos_estimados: number;
    pacientes_nuevos: number;
    pacientes_total: number;
    medicos_activos: number;
  };
  citas_por_estado: {
    ATENDIDA: number;
    AGENDADA: number;
    EN_ESPERA: number;
    EN_ATENCION: number;
    CANCELADA: number;
    NO_ASISTIO: number;
  };
  especialidades_demandadas: EspecialidadDemandada[];
  top_medicos: MedicoRendimiento[];
  tendencia: TendenciaDiaria[];
}

export interface DashboardMedicoData {
  rango: RangoPeriodo;
  kpis: {
    consultas_atendidas: number;
    total_citas: number;
    tasa_asistencia: number;
    tiempo_promedio_min: number;
    ingresos_generados: number;
    total_recetas: number;
    citas_hoy: number;
    en_espera_hoy: number;
    atendidos_hoy: number;
  };
  citas_por_estado: {
    ATENDIDA: number;
    AGENDADA: number;
    EN_ESPERA: number;
    EN_ATENCION: number;
    CANCELADA: number;
    NO_ASISTIO: number;
  };
  top_diagnosticos_cie11: DiagnosticoFrecuente[];
  tendencia: TendenciaDiaria[];
}

export interface ParametrosFiltroDashboard {
  periodo?: PeriodoFiltro;
  desde?: string;
  hasta?: string;
}
