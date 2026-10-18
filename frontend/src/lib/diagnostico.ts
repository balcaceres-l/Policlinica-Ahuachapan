/** Fila de diagnóstico en edición dentro de la consulta (HU-20 / HU-44). */
export interface DiagnosticoLocal {
  /** Identificador estable de la fila en pantalla (no se envía). */
  clave: string;
  descripcion: string;
  /** null mientras sea texto libre. */
  codigo_cie11: string | null;
  uri_foundation: string | null;
  uri_linearizacion: string | null;
  /** Textos que puso la OMS al elegir: si el médico los cambia, pasa a texto libre. */
  textosOms?: string[];
}

export const nuevoDiagnosticoLocal = (datos: Partial<DiagnosticoLocal> = {}): DiagnosticoLocal => ({
  clave: crypto.randomUUID(),
  descripcion: '',
  codigo_cie11: null,
  uri_foundation: null,
  uri_linearizacion: null,
  ...datos,
});
