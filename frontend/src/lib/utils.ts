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

/** Resuelve de inmediato sin demoras artificiales. */
export const delay = (ms?: number): Promise<void> => {
  void ms;
  return Promise.resolve();
};

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

/** Formatea teléfono salvadoreño: "11112222" -> "1111-2222" (máximo 8 dígitos) */
export const formatearTelefono = (valor: string): string => {
  const digitos = valor.replace(/\D/g, '').slice(0, 8);
  if (digitos.length <= 4) return digitos;
  return `${digitos.slice(0, 4)}-${digitos.slice(4)}`;
};

/** Formatea DUI salvadoreño: "000000000" -> "00000000-0" (máximo 9 dígitos) */
export const formatearDui = (valor: string): string => {
  const digitos = valor.replace(/\D/g, '').slice(0, 9);
  if (digitos.length <= 8) return digitos;
  return `${digitos.slice(0, 8)}-${digitos.slice(8)}`;
};

/**
 * Detecta si una cadena contiene letras o caracteres especiales distintos de números, espacios o guión.
 */
export const contieneLetrasOCaracteresEspeciales = (valor: string): boolean => {
  return /[^\d\s-]/.test(valor);
};

