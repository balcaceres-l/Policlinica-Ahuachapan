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
}
