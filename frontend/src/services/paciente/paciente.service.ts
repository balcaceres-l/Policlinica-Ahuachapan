import type { NuevoPaciente, Paciente } from '@/types/paciente.types';
import { normalizar } from '@/lib/utils';
import { mockPacientes, nuevoUuid } from '@/services/mockData';

const generarNumeroExpediente = (nombreCompleto: string): string => {
  const palabras = nombreCompleto.trim().split(/\s+/);
  const ini1 = palabras[0]?.[0]?.toUpperCase() ?? 'X';
  const ini2 = palabras[1]?.[0]?.toUpperCase() ?? 'X';
  const count = mockPacientes.length + 1;
  const num = String(count).padStart(2, '0');
  const anio = new Date().getFullYear();
  return `${ini1}${ini2}${num}-${anio}`;
};

export const getPacientes = async (busqueda = ''): Promise<Paciente[]> => {
  const termino = normalizar(busqueda);
  if (!termino) return [...mockPacientes];

  return mockPacientes.filter(
    (p) =>
      normalizar(p.nombre_completo).includes(termino) ||
      normalizar(p.numero_expediente).includes(termino) ||
      normalizar(p.dui).includes(termino),
  );
};

export const crearPaciente = async (payload: NuevoPaciente): Promise<Paciente> => {
  const expediente = generarNumeroExpediente(payload.nombre_completo);
  const nuevo: Paciente = {
    id: nuevoUuid(),
    numero_expediente: expediente,
    nombre_completo: payload.nombre_completo,
    fecha_nacimiento: payload.fecha_nacimiento,
    tipo_documento: payload.tipo_documento ?? 'DUI',
    dui: payload.dui,
    telefono: payload.telefono,
    es_menor_edad: payload.es_menor_edad,
    responsable_nombre: payload.responsable_nombre,
    responsable_tipo_documento: payload.responsable_tipo_documento ?? 'DUI',
    responsable_telefono: payload.responsable_telefono,
    responsable_parentesco: payload.responsable_parentesco,
    responsable_documento: payload.responsable_documento,
    fecha_registro: new Date().toISOString().split('T')[0],
  };

  mockPacientes.unshift(nuevo);
  return nuevo;
};
