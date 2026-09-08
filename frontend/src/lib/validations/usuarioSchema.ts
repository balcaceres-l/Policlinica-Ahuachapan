import { z } from 'zod';

/**
 * HU-03 — Registro de cuentas de usuario.
 *
 * La política de contraseña replica la de HU-02 (mínimo 8, con letra y número).
 * En producción el backend exige más mediante Password::defaults(); si rechaza
 * la contraseña, su mensaje se muestra tal cual.
 */
export const registrarUsuarioSchema = z
  .object({
    nombreCompleto: z
      .string()
      .min(1, 'El nombre completo es obligatorio.')
      .min(5, 'Debe tener al menos 5 caracteres.')
      .max(80, 'No puede superar los 80 caracteres.'),
    usuario: z
      .string()
      .min(1, 'El correo institucional es obligatorio.')
      .email('Ingresa un correo electrónico válido.')
      .max(80, 'No puede superar los 80 caracteres.'),
    cargo: z
      .string()
      .min(1, 'El cargo es obligatorio.')
      .max(60, 'No puede superar los 60 caracteres.'),
    rol: z.enum(['ADMINISTRADOR', 'MEDICO', 'RECEPCIONISTA']),
    telefono: z
      .string()
      .regex(/^$|^\d{4}-?\d{4}$/, 'Formato esperado: 2443-1020.'),
    password: z
      .string()
      .min(8, 'Debe tener al menos 8 caracteres.')
      .regex(/[a-zA-Z]/, 'Debe incluir al menos una letra.')
      .regex(/[0-9]/, 'Debe incluir al menos un número.'),
    password_confirmation: z.string().min(1, 'Confirma la contraseña.'),
  })
  .refine((datos) => datos.password === datos.password_confirmation, {
    message: 'La confirmación no coincide con la contraseña.',
    path: ['password_confirmation'],
  });

export type RegistrarUsuarioFormValues = z.infer<typeof registrarUsuarioSchema>;

export const registrarUsuarioDefaults: RegistrarUsuarioFormValues = {
  nombreCompleto: '',
  usuario: '',
  cargo: '',
  rol: 'MEDICO',
  telefono: '',
  password: '',
  password_confirmation: '',
};
