import type { HorarioMedico } from '@/types/horario.types';

/* ------------------------------------------------------------------
   Datos simulados en memoria. Solo queda Agendamiento (EP-04): el
   backend tiene las migraciones escritas pero todavía no expone
   controladores ni rutas. Usuarios y especialidades ya consumen la API
   real, así que sus mocks se eliminaron.
   ------------------------------------------------------------------ */

/**
 * Horarios de atención por médico (HU-34). Los `medico_id` corresponden a los
 * médicos del seeder. El horario base de la policlínica es 3:00–6:30 PM entre
 * semana y 8:00–12:00 MD los sábados; dermatología (médico 3) atiende por la
 * mañana y pediatría (médico 4) parte el sábado en dos bloques, que es el caso
 * que la validación de traslapes debe permitir.
 */
export const mockHorariosMedicos: HorarioMedico[] = [
  // Dra. Elena Ramírez Alfaro — Ginecología
  { id: 1, medico_id: 1, dia_semana: 'LUNES', hora_inicio: '15:00', hora_fin: '18:30' },
  { id: 2, medico_id: 1, dia_semana: 'MIERCOLES', hora_inicio: '15:00', hora_fin: '18:30' },
  { id: 3, medico_id: 1, dia_semana: 'VIERNES', hora_inicio: '15:00', hora_fin: '18:30' },
  { id: 4, medico_id: 1, dia_semana: 'SABADO', hora_inicio: '08:00', hora_fin: '12:00' },

  // Dr. Miguel Ángel Torres — Medicina Interna
  { id: 5, medico_id: 2, dia_semana: 'MARTES', hora_inicio: '15:00', hora_fin: '18:30' },
  { id: 6, medico_id: 2, dia_semana: 'JUEVES', hora_inicio: '15:00', hora_fin: '18:30' },

  // Dra. Carla Sofía Peña — Dermatología (horario propio, por la mañana)
  { id: 7, medico_id: 3, dia_semana: 'LUNES', hora_inicio: '08:00', hora_fin: '12:00' },
  { id: 8, medico_id: 3, dia_semana: 'MARTES', hora_inicio: '08:00', hora_fin: '12:00' },

  // Dr. Josué Hernández Cruz — Pediatría (sábado partido en dos bloques)
  { id: 9, medico_id: 4, dia_semana: 'LUNES', hora_inicio: '15:00', hora_fin: '18:30' },
  { id: 10, medico_id: 4, dia_semana: 'MIERCOLES', hora_inicio: '15:00', hora_fin: '18:30' },
  { id: 11, medico_id: 4, dia_semana: 'SABADO', hora_inicio: '08:00', hora_fin: '10:00' },
  { id: 12, medico_id: 4, dia_semana: 'SABADO', hora_inicio: '10:30', hora_fin: '12:00' },

  // Dr. Roberto Cañas Portillo — Cirugía General
  { id: 13, medico_id: 6, dia_semana: 'JUEVES', hora_inicio: '15:00', hora_fin: '18:30' },
  { id: 14, medico_id: 6, dia_semana: 'VIERNES', hora_inicio: '15:00', hora_fin: '18:30' },

  // Dr. Fernando Alvarenga — Medicina Interna
  { id: 15, medico_id: 7, dia_semana: 'MARTES', hora_inicio: '15:00', hora_fin: '18:30' },
];

/** Generador de IDs mientras no exista AUTO_INCREMENT. */
export const siguienteIdHorario = (): number =>
  Math.max(0, ...mockHorariosMedicos.map((h) => h.id)) + 1;
