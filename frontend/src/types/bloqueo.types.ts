export type TipoBloqueo = 'COMPLETO' | 'PARCIAL';

export interface BloqueoAgenda {
  id: number;
  medico_id: string;
  medicoNombre: string;
  fecha: string; // YYYY-MM-DD
  tipo_bloqueo: TipoBloqueo;
  hora_inicio?: string; // HH:MM
  hora_fin?: string; // HH:MM
  motivo: string;
  creado_por_id: string;
  fecha_creacion: string;
}

export interface NuevoBloqueo {
  medico_id: string;
  fecha: string;
  tipo_bloqueo: TipoBloqueo;
  hora_inicio?: string;
  hora_fin?: string;
  motivo: string;
}
