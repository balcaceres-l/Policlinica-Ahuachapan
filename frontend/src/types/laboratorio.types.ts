/** Adjunto de un resultado. El archivo se pide aparte, con la sesión. */
export interface ArchivoLaboratorio {
  nombre: string;
  mime: string;
  /** Bytes. */
  tamano: number;
}

/** Resultado de laboratorio del paciente (HU-41 / HU-23). */
export interface ResultadoLaboratorio {
  id: string;
  paciente_id: string;
  /** Solo vienen en el listado general, que cruza pacientes. */
  pacienteNombre?: string | null;
  pacienteExpediente?: string | null;
  consulta_id: string | null;
  nombre_examen: string;
  /** YYYY-MM-DD */
  fecha_examen: string;
  resultado_texto: string | null;
  archivo: ArchivoLaboratorio | null;
  registrado_por_id: string;
  registradoPorNombre?: string | null;
  fecha_registro: string | null;
}

export interface NuevoResultadoLaboratorio {
  nombre_examen: string;
  fecha_examen: string;
  resultado_texto?: string;
  archivo?: File | null;
  /** Consulta activa desde la que se registra, si la hay. */
  consulta_id?: string | null;
}
