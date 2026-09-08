import { z } from 'zod';

/**
 * Reglas mínimas comunes a todos los entornos. En producción el backend exige
 * más (10 caracteres, mayúsculas y símbolos) y el cliente no puede saberlo, así
 * que su rechazo se muestra tal cual llega.
 */
export const cambiarPasswordSchema = z
  .object({
    password_actual: z.string().min(1, 'Ingresa tu contraseña actual.'),
    password: z
      .string()
      .min(8, 'Debe tener al menos 8 caracteres.')
      .regex(/[a-zA-Z]/, 'Debe incluir al menos una letra.')
      .regex(/[0-9]/, 'Debe incluir al menos un número.'),
    password_confirmation: z.string().min(1, 'Confirma la nueva contraseña.'),
  })
  .refine((datos) => datos.password === datos.password_confirmation, {
    message: 'La confirmación no coincide con la nueva contraseña.',
    path: ['password_confirmation'],
  })
  .refine((datos) => datos.password !== datos.password_actual, {
    message: 'La nueva contraseña debe ser distinta de la actual.',
    path: ['password'],
  });

export type CambiarPasswordFormValues = z.infer<typeof cambiarPasswordSchema>;

export const cambiarPasswordDefaults: CambiarPasswordFormValues = {
  password_actual: '',
  password: '',
  password_confirmation: '',
};
