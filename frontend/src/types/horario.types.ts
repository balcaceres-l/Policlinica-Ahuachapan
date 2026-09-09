export type DiaSemana =
  | 'LUNES'
  | 'MARTES'
  | 'MIERCOLES'
  | 'JUEVES'
  | 'VIERNES'
  | 'SABADO'
  | 'DOMINGO';

/**
 * Fila tal cual vive en la tabla `horarios_medicos`. Los nombres van en
 * snake_case a propósito: son los mismos de la migración, para que al
 * conectar la API real no haya que renombrar nada.
 */
export interface HorarioMedico {
  id: number;
  medico_id: number;
  dia_semana: DiaSemana;
  /** Formato 'HH:mm' — la columna es TIME en la base. */
  hora_inicio: string;
  hora_fin: string;
}

/** Payload de alta/edición (HU-34); el id lo asigna la base. */
export type NuevoHorario = Omit<HorarioMedico, 'id'>;
