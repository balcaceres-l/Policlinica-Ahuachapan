export interface Paciente {
  id: string;
  numero_expediente: string;
  nombre_completo: string;
  fecha_nacimiento: string;
  dui: string;
  telefono?: string;
  es_menor_edad: boolean;
  responsable_nombre?: string;
  responsable_telefono?: string;
  responsable_parentesco?: string;
  fecha_registro: string;
}

export interface NuevoPaciente {
  nombre_completo: string;
  fecha_nacimiento: string;
  dui: string;
  telefono?: string;
  es_menor_edad: boolean;
  responsable_nombre?: string;
  responsable_telefono?: string;
  responsable_parentesco?: string;
}
