import { z } from 'zod';

export const especialidadSchema = z.object({
  nombre: z
    .string()
    .min(1, 'El nombre de la especialidad es obligatorio')
    .min(3, 'Debe tener al menos 3 caracteres')
    .max(60, 'No puede superar los 60 caracteres'),
  descripcion: z
    .string()
    .max(200, 'La descripción no puede superar los 200 caracteres'),
});

export type EspecialidadFormValues = z.infer<typeof especialidadSchema>;

export const especialidadFormDefaults: EspecialidadFormValues = {
  nombre: '',
  descripcion: '',
};
