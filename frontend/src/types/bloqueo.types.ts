export type TipoBloqueo = 'COMPLETO' | 'PARCIAL';

export interface BloqueoAgenda {
  id: string;
  medico_id: string;
  medicoNombre: string;
  fecha: string; // YYYY-MM-DD
  tipo_bloqueo: TipoBloqueo;
  /** HH:MM; null si el bloqueo es de día completo. */
  hora_inicio: string | null;
  hora_fin: string | null;
  motivo: string;
  creado_por_id: string;
  creadoPorNombre?: string;
  fecha_creacion: string;
  /** Citas pendientes que hoy siguen dentro del bloqueo; solo viene en el listado. */
  citas_afectadas_total?: number;
}

export interface NuevoBloqueo {
  medico_id: string;
  fecha: string;
  tipo_bloqueo: TipoBloqueo;
  hora_inicio?: string;
  hora_fin?: string;
  motivo: string;
}
