import type { EspecialidadBase, MedicoEspecialidad } from '@/types/especialidad.types';
import type { Usuario } from '@/types/user.types';

/* ------------------------------------------------------------------
   Datos ficticios en memoria. Se mutan durante la sesión para que
   los formularios (HU-07) y las asociaciones (HU-08) se sientan reales.
   Al conectar el backend, este archivo desaparece.
   ------------------------------------------------------------------ */

export const mockUsuarios: Usuario[] = [
  {
    id: 1,
    nombreCompleto: 'Dra. Elena Ramírez Alfaro',
    usuario: 'eramirez@policlinica.com',
    cargo: 'Ginecología',
    rol: 'MEDICO',
    estado: 'ACTIVO',
    telefono: '2443-1020',
    fechaRegistro: '2024-02-12',
  },
  {
    id: 2,
    nombreCompleto: 'Dr. Miguel Ángel Torres',
    usuario: 'mtorres@policlinica.com',
    cargo: 'Medicina Interna',
    rol: 'MEDICO',
    estado: 'ACTIVO',
    telefono: '2443-1021',
    fechaRegistro: '2024-03-04',
  },
  {
    id: 3,
    nombreCompleto: 'Dra. Carla Sofía Peña',
    usuario: 'cpena@policlinica.com',
    cargo: 'Dermatología',
    rol: 'MEDICO',
    estado: 'ACTIVO',
    telefono: '2443-1022',
    fechaRegistro: '2024-03-19',
  },
  {
    id: 4,
    nombreCompleto: 'Dr. Josué Hernández Cruz',
    usuario: 'jhernandez@policlinica.com',
    cargo: 'Pediatría',
    rol: 'MEDICO',
    estado: 'ACTIVO',
    telefono: '2443-1023',
    fechaRegistro: '2024-04-02',
  },
  {
    id: 5,
    nombreCompleto: 'Dra. Ana Lucía Menjívar',
    usuario: 'amenjivar@policlinica.com',
    cargo: 'Clínica de Úlceras',
    rol: 'MEDICO',
    estado: 'INACTIVO',
    telefono: '2443-1024',
    fechaRegistro: '2024-05-15',
  },
  {
    id: 6,
    nombreCompleto: 'Dr. Roberto Cañas Portillo',
    usuario: 'rcanas@policlinica.com',
    cargo: 'Cirugía General',
    rol: 'MEDICO',
    estado: 'ACTIVO',
    telefono: '2443-1025',
    fechaRegistro: '2024-06-01',
  },
  {
    id: 7,
    nombreCompleto: 'Dr. Fernando Alvarenga',
    usuario: 'falvarenga@policlinica.com',
    cargo: 'Medicina Interna',
    rol: 'MEDICO',
    estado: 'ACTIVO',
    telefono: '2443-1026',
    fechaRegistro: '2024-07-11',
  },
  {
    id: 8,
    nombreCompleto: 'Karla Beatriz Solórzano',
    usuario: 'ksolorzano@policlinica.com',
    cargo: 'Recepción Principal',
    rol: 'RECEPCIONISTA',
    estado: 'ACTIVO',
    telefono: '2443-1000',
    fechaRegistro: '2024-01-08',
  },
  {
    id: 9,
    nombreCompleto: 'Marta Elena Guevara',
    usuario: 'mguevara@policlinica.com',
    cargo: 'Recepción — Turno Vespertino',
    rol: 'RECEPCIONISTA',
    estado: 'ACTIVO',
    telefono: '2443-1001',
    fechaRegistro: '2024-01-08',
  },
  {
    id: 10,
    nombreCompleto: 'Sofía Marroquín Rivas',
    usuario: 'smarroquin@policlinica.com',
    cargo: 'Recepción / Archivo Clínico',
    rol: 'RECEPCIONISTA',
    estado: 'INACTIVO',
    telefono: '2443-1002',
    fechaRegistro: '2024-08-20',
  },
  {
    id: 11,
    nombreCompleto: 'Carlos Soto Mejía',
    usuario: 'csoto@policlinica.com',
    cargo: 'Sistemas',
    rol: 'ADMINISTRADOR',
    estado: 'INACTIVO',
    telefono: '2443-1010',
    fechaRegistro: '2023-11-30',
  },
  {
    id: 12,
    nombreCompleto: 'Katherinne Algarín',
    usuario: 'kalgarin@policlinica.com',
    cargo: 'Coordinación TI',
    rol: 'ADMINISTRADOR',
    estado: 'ACTIVO',
    telefono: '2443-1011',
    fechaRegistro: '2023-11-30',
  },
];

/** Las 6 especialidades reales de la policlínica. */
export const mockEspecialidades: EspecialidadBase[] = [
  {
    id: 1,
    nombre: 'Ginecología',
    descripcion: 'Atención integral de la salud femenina y control prenatal.',
    estado: 'ACTIVA',
    fechaRegistro: '2024-01-10',
  },
  {
    id: 2,
    nombre: 'Medicina Interna',
    descripcion: 'Diagnóstico y tratamiento de enfermedades del adulto.',
    estado: 'ACTIVA',
    fechaRegistro: '2024-01-10',
  },
  {
    id: 3,
    nombre: 'Dermatología',
    descripcion: 'Diagnóstico y tratamiento de afecciones de la piel.',
    estado: 'ACTIVA',
    fechaRegistro: '2024-01-10',
  },
  {
    id: 4,
    nombre: 'Pediatría',
    descripcion: 'Atención médica de niñas y niños de 0 a 12 años.',
    estado: 'ACTIVA',
    fechaRegistro: '2024-01-10',
  },
  {
    id: 5,
    nombre: 'Clínica de Úlceras',
    descripcion: 'Curación y seguimiento de úlceras y heridas crónicas.',
    estado: 'INACTIVA',
    fechaRegistro: '2024-02-01',
  },
  {
    id: 6,
    nombre: 'Cirugía General',
    descripcion: 'Evaluación prequirúrgica y procedimientos menores.',
    estado: 'ACTIVA',
    fechaRegistro: '2024-02-01',
  },
];

/** Un médico puede tener varias especialidades (HU-08). */
export const mockMedicoEspecialidades: MedicoEspecialidad[] = [
  { medicoId: 1, especialidadId: 1 },
  { medicoId: 2, especialidadId: 2 },
  { medicoId: 2, especialidadId: 5 },
  { medicoId: 3, especialidadId: 3 },
  { medicoId: 4, especialidadId: 4 },
  { medicoId: 5, especialidadId: 5 },
  { medicoId: 6, especialidadId: 6 },
  { medicoId: 6, especialidadId: 2 },
  { medicoId: 7, especialidadId: 2 },
];

/** Generador de IDs mientras no exista AUTO_INCREMENT. */
export const siguienteIdEspecialidad = (): number =>
  Math.max(0, ...mockEspecialidades.map((e) => e.id)) + 1;
