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
