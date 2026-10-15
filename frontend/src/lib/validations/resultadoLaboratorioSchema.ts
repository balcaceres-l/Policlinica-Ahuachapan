import { z } from 'zod';
import { obtenerFechaLocal } from '@/lib/utils';

/** HU-41 — el adjunto va aparte: es un `File` y no pasa por el esquema. */
export const resultadoLaboratorioSchema = z.object({
  nombre_examen: z
    .string()
    .trim()
    .min(1, 'Indica qué examen se realizó.')
    .max(150, 'No puede superar los 150 caracteres.'),
  fecha_examen: z
    .string()
    .min(1, 'La fecha del examen es obligatoria.')
    .refine((fecha) => fecha <= obtenerFechaLocal(), 'La fecha del examen no puede ser futura.'),
  resultado_texto: z.string().trim().max(5000, 'No puede superar los 5000 caracteres.').optional(),
});

export type ResultadoLaboratorioFormValues = z.infer<typeof resultadoLaboratorioSchema>;

export const resultadoLaboratorioDefaults = (): ResultadoLaboratorioFormValues => ({
  nombre_examen: '',
  fecha_examen: obtenerFechaLocal(),
  resultado_texto: '',
});

export const TIPOS_ADJUNTO_LABORATORIO = 'image/jpeg,image/png,image/webp,application/pdf';
export const TAMANO_MAXIMO_ADJUNTO = 5 * 1024 * 1024;
