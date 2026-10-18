/** Pase del backend para usar el proxy de la CIE-11 (JWT con `exp`). */
export interface PaseCie11 {
  token: string;
  /** Unix timestamp. */
  vence: number;
}

export interface ConfiguracionCie11 {
  /** Versión de la CIE-11, ej. "2026-01". */
  release: string;
  idioma: string;
  linearizacion: string;
}

/** Lo que entrega la herramienta de la OMS al elegir una opción. */
export interface EntidadSeleccionadaEct {
  iNo: string;
  code: string;
  title: string;
  selectedText?: string;
  foundationUri?: string;
  linearizationUri?: string;
  searchQuery?: string;
}

export interface NodoCie11 {
  codigo: string | null;
  titulo: string | null;
  tipo: 'category' | 'block' | 'chapter' | string | null;
  block_id: string | null;
  uri: string;
}

/** Jerarquía de una categoría: del capítulo hacia la categoría. */
export interface JerarquiaCie11 {
  categoria: NodoCie11;
  /** Bloque más cercano a la categoría. */
  bloque: NodoCie11 | null;
  bloques: NodoCie11[];
  capitulo: NodoCie11 | null;
}
