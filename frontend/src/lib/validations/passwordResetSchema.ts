import { z } from 'zod';

export const recuperarPasswordSchema = z.object({
  usuario: z
    .string()
    .trim()
    .min(1, 'Ingresa tu correo o usuario institucional.'),
});

export type RecuperarPasswordFormValues = z.infer<typeof recuperarPasswordSchema>;

export const restablecerPasswordSchema = z
  .object({
    password: z
      .string()
      .min(1, 'Ingresa tu nueva contraseña.')
      .min(10, 'La nueva contraseña debe tener al menos 10 caracteres.')
      .regex(/[a-z]/, 'Debe incluir al menos una letra minúscula.')
      .regex(/[A-Z]/, 'Debe incluir al menos una letra mayúscula.')
      .regex(/[0-9]/, 'Debe incluir al menos un número.')
      .regex(/[^a-zA-Z0-9]/, 'Debe incluir al menos un símbolo o carácter especial (!@#$%...).'),
    password_confirmation: z
      .string()
      .min(1, 'Confirma tu nueva contraseña.'),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: 'Las contraseñas no coinciden.',
    path: ['password_confirmation'],
  });

export type RestablecerPasswordFormValues = z.infer<typeof restablecerPasswordSchema>;
