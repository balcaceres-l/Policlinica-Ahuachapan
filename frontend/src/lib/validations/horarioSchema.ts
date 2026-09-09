import { z } from 'zod';

/**
 * HU-34 — Bloque horario de atención de un médico.
 *
 * No se valida contra el horario base de la policlínica a propósito: cada
 * médico configura el suyo y hay especialidades que atienden en otro horario.
 * El cruce con bloques ya existentes lo valida el servicio, que es quien
 * conoce los demás horarios del médico.
 */
export const horarioSchema = z
  .object({
    dia_semana: z.enum([
      'LUNES',
      'MARTES',
      'MIERCOLES',
      'JUEVES',
      'VIERNES',
      'SABADO',
      'DOMINGO',
    ]),
    hora_inicio: z.string().min(1, 'Indica la hora de inicio.'),
    hora_fin: z.string().min(1, 'Indica la hora de fin.'),
  })
  .refine((datos) => datos.hora_fin > datos.hora_inicio, {
    message: 'La hora de fin debe ser posterior a la de inicio.',
    path: ['hora_fin'],
  });

export type HorarioFormValues = z.infer<typeof horarioSchema>;

/** Arranca en el horario base de entre semana, que es el caso más común. */
export const horarioFormDefaults: HorarioFormValues = {
  dia_semana: 'LUNES',
  hora_inicio: '15:00',
  hora_fin: '18:30',
};
