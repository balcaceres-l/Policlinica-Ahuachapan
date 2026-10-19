import { z } from 'zod';

/** HU-31 */
export const constanciaSchema = z.object({
  motivo: z
    .string()
    .trim()
    .min(5, 'Escribe el motivo de la constancia (al menos 5 caracteres).')
    .max(2000, 'El motivo no puede superar los 2000 caracteres.'),
});

export type ConstanciaFormValues = z.infer<typeof constanciaSchema>;

export const constanciaFormDefaults: ConstanciaFormValues = { motivo: '' };

/**
 * HU-32 — la interna pide el médico de la policlínica; la externa, a quién se
 * refiere y la información clínica que llevará (el expediente no se adjunta).
 */
export const referenciaSchema = z
  .object({
    tipo: z.enum(['INTERNA', 'EXTERNA']),
    medico_destino_id: z.string(),
    destino: z.string().trim().max(200, 'Máximo 200 caracteres.'),
    especialidad_destino: z.string().trim().max(150, 'Máximo 150 caracteres.'),
    motivo: z
      .string()
      .trim()
      .min(5, 'Escribe el motivo de la referencia (al menos 5 caracteres).')
      .max(2000, 'El motivo no puede superar los 2000 caracteres.'),
    resumen_clinico: z.string().trim().max(5000, 'Máximo 5000 caracteres.'),
  })
  .superRefine((valores, ctx) => {
    if (valores.tipo === 'INTERNA' && !valores.medico_destino_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['medico_destino_id'],
        message: 'Elige el médico de la policlínica al que refieres.',
      });
    }
    if (valores.tipo === 'EXTERNA' && !valores.destino) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['destino'],
        message: 'Indica el especialista o la institución a la que refieres.',
      });
    }
    if (valores.tipo === 'EXTERNA' && !valores.resumen_clinico) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['resumen_clinico'],
        message: 'Escribe la información clínica que llevará la referencia.',
      });
    }
  });

export type ReferenciaFormValues = z.infer<typeof referenciaSchema>;

export const referenciaFormDefaults: ReferenciaFormValues = {
  tipo: 'INTERNA',
  medico_destino_id: '',
  destino: '',
  especialidad_destino: '',
  motivo: '',
  resumen_clinico: '',
};
