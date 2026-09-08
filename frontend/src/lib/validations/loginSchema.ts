import { z } from 'zod';

/**
 * Validación mínima del formulario de login.
 * No se valida formato de correo a propósito: el backend acepta cualquier
 * cadena en `usuario`, y ser más estricto aquí bloquearía usuarios válidos.
 * Cuando el equipo confirme que siempre es un correo, añadir .email().
 */
export const loginSchema = z.object({
  usuario: z.string().trim().min(1, 'Ingresa tu usuario.'),
  password: z.string().min(1, 'Ingresa tu contraseña.'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
