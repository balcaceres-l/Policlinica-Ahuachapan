export type TipoDocumento = 'DUI' | 'PASAPORTE';

export type EstadoPaciente = 'ACTIVO' | 'FALLECIDO' | 'TODOS';

export interface Paciente {
  id: string;
  numero_expediente: string;
  nombre_completo: string;
  fecha_nacimiento: string;
  tipo_documento?: TipoDocumento | null;
  dui: string | null;
  telefono?: string | null;
  direccion?: string | null;
  es_menor_edad: boolean;
  estado?: 'ACTIVO' | 'FALLECIDO';
  /** Adulto sin documento: se registró de menor y ya cumplió 18 años, o fue una emergencia. */
  documento_pendiente?: boolean;
  /** Menor registrado en emergencia: falta su responsable. */
  responsable_pendiente?: boolean;
  /** Lo registró el médico en una consulta inmediata; la recepcionista debe completarlo. */
  datos_pendientes?: boolean;
  id_responsable?: string | null;
  responsable_nombre?: string | null;
  responsable_tipo_documento?: TipoDocumento | null;
  responsable_telefono?: string | null;
  responsable_parentesco?: string | null;
  responsable_documento?: string | null;
  fecha_registro: string;
}

export interface NuevoPaciente {
  nombre_completo: string;
  fecha_nacimiento: string;
  tipo_documento?: TipoDocumento;
  dui?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  es_menor_edad: boolean;
  /** Emergencia: basta el nombre y la fecha de nacimiento; el registro queda pendiente de completar. */
  registro_rapido?: boolean;
  responsable_nombre?: string | null;
  responsable_tipo_documento?: TipoDocumento | null;
  responsable_telefono?: string | null;
  responsable_parentesco?: string | null;
  responsable_documento?: string | null;
}

export interface FiltrosPacienteQuery {
  buscar?: string;
  estado?: EstadoPaciente;
  categoria?: 'TODOS' | 'ADULTO' | 'MENOR';
  /** Solo los registrados por el médico que faltan completar. */
  pendientes?: boolean;
}

export interface EditarPaciente {
  nombre_completo: string;
  telefono?: string | null;
  /** Solo se acepta si el paciente aún no tiene documento (se registró de menor). */
  dui?: string;
  direccion?: string | null;
  responsable_nombre?: string | null;
  /** Solo si el menor aún no tiene responsable (registro de emergencia): se agrega con todos sus datos. */
  responsable_documento?: string | null;
  responsable_telefono?: string | null;
  responsable_parentesco?: string | null;
}

