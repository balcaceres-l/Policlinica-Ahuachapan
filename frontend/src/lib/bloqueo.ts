import type { BloqueoGestionable } from '@/components/bloqueo/CitasAfectadasModal';
import type { Cita } from '@/types/cita.types';

/** Texto corto del lapso bloqueado: "16:00 - 17:00" o "Día completo". */
export const lapsoDeBloqueo = (
  b: { tipo_bloqueo: 'COMPLETO' | 'PARCIAL'; hora_inicio: string | null; hora_fin: string | null },
): string =>
  b.tipo_bloqueo === 'PARCIAL' && b.hora_inicio && b.hora_fin
    ? `${b.hora_inicio} - ${b.hora_fin}`
    : 'Día completo';

/** El bloqueo que afecta a la cita, en la forma que pide CitasAfectadasModal; null si no la afecta. */
export const bloqueoDeCita = (cita: Cita): BloqueoGestionable | null => {
  if (!cita.afectada_por_bloqueo || !cita.bloqueo) return null;

  return {
    id: cita.bloqueo.id,
    medicoNombre: cita.medicoNombre,
    fecha: cita.fecha,
    tipo_bloqueo: cita.bloqueo.tipo_bloqueo,
    hora_inicio: cita.bloqueo.hora_inicio,
    hora_fin: cita.bloqueo.hora_fin,
    motivo: cita.bloqueo.motivo,
  };
};
