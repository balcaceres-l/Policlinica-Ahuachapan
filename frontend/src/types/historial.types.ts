/**
 * Contrato de datos del historial clínico (HU-19, HU-20, HU-21, HU-22, HU-44).
 *
 * Los nombres siguen las convenciones del backend: columnas en snake_case y
 * `medicoNombre` / `especialidadNombre` como en `ConsultaResource`. Las fechas
 * llegan como `YYYY-MM-DD HH:mm:ss` (`toDateTimeString()` de Laravel).
 *
 * Aún no existen las tablas de diagnóstico ni de plan de manejo: ver
 * `docs/avance-historial-clinico-hu-19-22.md`.
 */

/** Diagnóstico registrado en una consulta (HU-20). */
export interface DiagnosticoConsulta {
  id: string;
  consulta_id: string;
  /** Código CIE-10 del catálogo (HU-44); null si se escribió como texto libre. */
  codigo_cie10: string | null;
  /** Descripción del catálogo o texto libre escrito por el médico. */
  descripcion: string;
  es_texto_libre: boolean;
}

/** Plan de manejo o tratamiento indicado en una consulta (HU-21). */
export interface PlanManejo {
  id: string;
  consulta_id: string;
  indicaciones: string;
}

/** Una consulta ya atendida, con lo que se registró en ella. */
export interface ConsultaHistorial {
  id: string;
  paciente_id: string;
  cita_id: string;
  fecha_hora_inicio: string;
  fecha_hora_fin: string | null;
  medico_id: string;
  medicoNombre: string;
  especialidad_atencion_id: string | null;
  especialidadNombre: string | null;
  motivo_consulta: string | null;
  /** Texto libre, sin estructura por región o sistema corporal (HU-19). */
  examen_fisico: string | null;
  diagnosticos: DiagnosticoConsulta[];
  plan_manejo: PlanManejo | null;
}
