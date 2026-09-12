export type TipoDocumento = 'DUI' | 'PASAPORTE';

export interface Paciente {
  id: string;
  numero_expediente: string;
  nombre_completo: string;
  fecha_nacimiento: string;
  tipo_documento?: TipoDocumento;
  dui: string;
  telefono?: string;
  es_menor_edad: boolean;
  responsable_nombre?: string;
  responsable_tipo_documento?: TipoDocumento;
  responsable_telefono?: string;
  responsable_parentesco?: string;
  responsable_documento?: string;
  fecha_registro: string;
}

export interface NuevoPaciente {
  nombre_completo: string;
  fecha_nacimiento: string;
  tipo_documento?: TipoDocumento;
  dui: string;
  telefono?: string;
  es_menor_edad: boolean;
  responsable_nombre?: string;
  responsable_tipo_documento?: TipoDocumento;
  responsable_telefono?: string;
  responsable_parentesco?: string;
  responsable_documento?: string;
}
