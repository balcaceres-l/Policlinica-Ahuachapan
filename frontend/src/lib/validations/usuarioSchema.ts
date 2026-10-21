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
  rol: z.enum(['ADMINISTRADOR', 'MEDICO', 'RECEPCIONISTA'], {
    message: 'Selecciona un rol.',
  }),
  telefono: z
    .string()
    .trim()
    .refine((val) => !val || /^\d{4}-\d{4}$/.test(val), {
      message: 'El teléfono debe tener el formato 1111-1111 (8 dígitos).',
    })
    .optional(),
  /** Número de junta de vigilancia: JVPM para médicos, JVPE para enfermería. */
  jvpm: z.string().trim().max(20, 'No puede superar los 20 caracteres.').optional(),
  jvpe: z.string().trim().max(20, 'No puede superar los 20 caracteres.').optional(),
});

export const usuarioSchema = editarUsuarioSchema.extend({
  password: z
    .string()
    .min(1, 'La contraseña es obligatoria.')
    .min(10, 'La contraseña debe tener al menos 10 caracteres.')
    .regex(/[a-z]/, 'Debe incluir al menos una letra minúscula.')
    .regex(/[A-Z]/, 'Debe incluir al menos una letra mayúscula.')
    .regex(/[0-9]/, 'Debe incluir al menos un número.')
    .regex(/[^a-zA-Z0-9]/, 'Debe incluir al menos un símbolo o carácter especial (!@#$%...).'),
});

export type EditarUsuarioFormValues = z.infer<typeof editarUsuarioSchema>;
export type UsuarioFormValues = z.infer<typeof usuarioSchema>;

export const usuarioFormDefaults: UsuarioFormValues = {
  nombre_completo: '',
  usuario: '',
  rol: 'MEDICO',
  telefono: '',
  jvpm: '',
  jvpe: '',
  password: '',
};

/**
 * Cada junta aplica a un rol: al cambiar de rol el número que ya no
 * corresponde se envía en null para que no quede guardado.
 */
export const juntaSegunRol = (valores: Pick<EditarUsuarioFormValues, 'rol' | 'jvpm' | 'jvpe'>) => ({
  jvpm: valores.rol === 'MEDICO' ? valores.jvpm?.trim() || null : null,
  jvpe: valores.rol === 'RECEPCIONISTA' ? valores.jvpe?.trim() || null : null,
});
