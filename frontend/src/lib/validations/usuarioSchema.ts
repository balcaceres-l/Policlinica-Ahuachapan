import { z } from 'zod';

/** Los nombres de campo son los que espera el backend, en snake_case. */
export const editarUsuarioSchema = z.object({
  nombre_completo: z
    .string()
    .trim()
    .min(1, 'El nombre completo es obligatorio.')
    .min(3, 'Debe tener al menos 3 caracteres.')
    .max(150, 'No puede superar los 150 caracteres.'),
  usuario: z
    .string()
    .trim()
    .min(1, 'El usuario es obligatorio.')
    .email('Debe ser un correo válido.')
    .max(150, 'No puede superar los 150 caracteres.'),
  cargo: z
    .string()
    .trim()
    .min(1, 'El cargo es obligatorio.')
    .max(100, 'No puede superar los 100 caracteres.'),
  rol: z.enum(['ADMINISTRADOR', 'MEDICO', 'RECEPCIONISTA'], {
    message: 'Selecciona un rol.',
  }),
  telefono: z
    .string()
    .trim()
    .max(25, 'No puede superar los 25 caracteres.')
    .optional(),
});

export const usuarioSchema = editarUsuarioSchema.extend({
  password: z
    .string()
    .min(8, 'Debe tener al menos 8 caracteres.')
    .regex(/[a-zA-Z]/, 'Debe incluir al menos una letra.')
    .regex(/[0-9]/, 'Debe incluir al menos un número.'),
});

export type EditarUsuarioFormValues = z.infer<typeof editarUsuarioSchema>;
export type UsuarioFormValues = z.infer<typeof usuarioSchema>;

export const usuarioFormDefaults: UsuarioFormValues = {
  nombre_completo: '',
  usuario: '',
  cargo: '',
  rol: 'MEDICO',
  telefono: '',
  password: '',
};
