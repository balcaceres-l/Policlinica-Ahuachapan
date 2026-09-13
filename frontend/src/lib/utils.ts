/** Une clases condicionalmente (versión mínima de clsx). */
export const cn = (...classes: Array<string | false | null | undefined>): string =>
  classes.filter(Boolean).join(' ');

/** "Elena Ramírez Alfaro" -> "ER" */
export const getIniciales = (nombreCompleto: string): string => {
  const partes = nombreCompleto
    .replace(/^(Dr\.|Dra\.|Lic\.|Ing\.)\s*/i, '')
    .trim()
    .split(/\s+/);

  const primera = partes[0]?.charAt(0) ?? '';
  const segunda = partes.length > 1 ? partes[1].charAt(0) : '';
  return (primera + segunda).toUpperCase();
};

/** Simula la latencia de red mientras no exista backend. */
export const delay = (ms = 300): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** Normaliza texto para comparar/buscar sin tildes ni mayúsculas. */
export const normalizar = (texto: string): string =>
  texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

export const formatearFecha = (iso: string): string =>
  new Date(iso).toLocaleDateString('es-SV', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

/** Suma (o resta, si es negativo) minutos a una hora "HH:MM". Usa módulo 24h. */
export const sumarMinutos = (horaHHMM: string, minutos: number): string => {
  const [h, m] = horaHHMM.split(':').map(Number);
  const total = ((h * 60 + m + minutos) % 1440 + 1440) % 1440;
  const horas = String(Math.floor(total / 60)).padStart(2, '0');
  const mins = String(total % 60).padStart(2, '0');
  return `${horas}:${mins}`;
};

/**
 * Minutos transcurridos entre una hora "HH:MM" (de hoy) y el momento actual.
 * Negativo si la hora todavía no llega. Usado por la alerta de retraso (HU-38).
 */
export const minutosTranscurridosDesde = (horaHHMM: string, ahora: Date = new Date()): number => {
  const [h, m] = horaHHMM.split(':').map(Number);
  const inicio = new Date(ahora);
  inicio.setHours(h, m, 0, 0);
  return Math.floor((ahora.getTime() - inicio.getTime()) / 60000);
};
