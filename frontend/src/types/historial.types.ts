/**
 * Contrato de datos del historial clínico (HU-19, HU-20, HU-21, HU-22, HU-44).
 *
 * Los nombres siguen las convenciones del backend: columnas en snake_case y
 * `medicoNombre` / `especialidadNombre` como en `ConsultaResource`. Las fechas
 * llegan como `YYYY-MM-DD HH:mm:ss` (`toDateTimeString()` de Laravel).
 */

/** Diagnóstico registrado en una consulta (HU-20). */
export interface DiagnosticoConsulta {
  id: string;
  consulta_id: string;
  /** Código CIE-11 de la OMS (HU-44); null si se escribió como texto libre. */
  codigo_cie11: string | null;
  /** Nombre oficial en español de la OMS, o el texto libre del médico. */
  descripcion: string;
  uri_foundation: string | null;
  /** URI de linearización MMS: con ella se pide a la OMS el bloque y el capítulo. */
  uri_linearizacion: string | null;
  /** Versión de la CIE-11 de la que salió el código, ej. "2026-01". */
  release_cie11: string | null;
  es_texto_libre: boolean;
}

/** Plan de manejo o tratamiento indicado en una consulta (HU-21). */
export interface PlanManejo {
  id: string;
  consulta_id: string;
  indicaciones: string;
}

import type { EstadoCita, SignosVitales, TipoCita } from './cita.types';
import type { ConstanciaMedica, ReferenciaMedica } from './documento.types';

/** Una consulta ya atendida o cita registrada, con lo que se registró en ella. */
export interface ConsultaHistorial {
  id: string;
  paciente_id: string;
  cita_id: string;
  fecha_hora_inicio: string;
  fecha_hora_fin: string | null;
  medico_id: string;
  medicoNombre: string;
  medicoJvpm?: string | null;
  especialidad_atencion_id: string | null;
  especialidadNombre: string | null;
  motivo_consulta: string | null;
  notas_adicionales?: string | null;
  /** Texto libre o consolidado de hallazgos. */
  examen_fisico: string | null;
  examenes_fisicos?: Array<{
    id?: string;
    region_anatomica?: string | null;
    hallazgos?: string | null;
  }>;
  diagnosticos: DiagnosticoConsulta[];
  plan_manejo: PlanManejo | null;
  receta?: {
    id?: string;
    observaciones_generales?: string | null;
    detalles: Array<{
      id?: string;
      nombre_medicamento: string;
      dosis: string;
      via_administracion?: string | null;
      frecuencia: string;
      duracion?: string | null;
      indicaciones?: string | null;
    }>;
  } | null;
  /** HU-31, HU-32 — documentos emitidos en esta consulta. */
  constancias?: ConstanciaMedica[];
  referencias?: ReferenciaMedica[];
  signos_vitales?: SignosVitales | null;
  cita_estado?: EstadoCita;
  tipo_cita?: TipoCita;
  precio?: number | null;
  total?: number | null;
}
