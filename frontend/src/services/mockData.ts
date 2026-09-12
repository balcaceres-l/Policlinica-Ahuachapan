import type { BloqueoAgenda } from '@/types/bloqueo.types';
import type { Cita } from '@/types/cita.types';
import type { HorarioMedico } from '@/types/horario.types';
import type { Paciente } from '@/types/paciente.types';
import type { Usuario } from '@/types/user.types';

/* ------------------------------------------------------------------
   Datos simulados en memoria para Agendamiento (EP-04).
   Solo frontend: permite interactuar con citas, pacientes y bloqueos.
   ------------------------------------------------------------------ */

/**
 * Médicos especialistas de la Policlínica (coincidentes con el seeder del backend).
 */
const medicoIds = {
  elena: '70f5a2b0-7e2d-4ad1-8b1b-000000000001',
  miguel: '70f5a2b0-7e2d-4ad1-8b1b-000000000002',
  carla: '70f5a2b0-7e2d-4ad1-8b1b-000000000003',
  josue: '70f5a2b0-7e2d-4ad1-8b1b-000000000004',
  roberto: '70f5a2b0-7e2d-4ad1-8b1b-000000000006',
  fernando: '70f5a2b0-7e2d-4ad1-8b1b-000000000007',
} as const;

const administradorId = '80f5a2b0-7e2d-4ad1-8b1b-000000000001';

export const mockMedicos: Usuario[] = [
  {
    id: medicoIds.elena,
    nombreCompleto: 'Dra. Elena Ramírez Alfaro',
    usuario: 'eramirez@policlinica.com',
    cargo: 'Ginecología',
    rol: 'MEDICO',
    estado: 'ACTIVO',
    telefono: '2443-1020',
    fechaRegistro: '2026-01-15',
  },
  {
    id: medicoIds.miguel,
    nombreCompleto: 'Dr. Miguel Ángel Torres',
    usuario: 'mtorres@policlinica.com',
    cargo: 'Medicina Interna',
    rol: 'MEDICO',
    estado: 'ACTIVO',
    telefono: '2443-1021',
    fechaRegistro: '2026-01-15',
  },
  {
    id: medicoIds.carla,
    nombreCompleto: 'Dra. Carla Sofía Peña',
    usuario: 'cpena@policlinica.com',
    cargo: 'Dermatología',
    rol: 'MEDICO',
    estado: 'ACTIVO',
    telefono: '2443-1022',
    fechaRegistro: '2026-01-15',
  },
  {
    id: medicoIds.josue,
    nombreCompleto: 'Dr. Josué Hernández Cruz',
    usuario: 'jhernandez@policlinica.com',
    cargo: 'Pediatría',
    rol: 'MEDICO',
    estado: 'ACTIVO',
    telefono: '2443-1023',
    fechaRegistro: '2026-01-15',
  },
  {
    id: medicoIds.roberto,
    nombreCompleto: 'Dr. Roberto Cañas Portillo',
    usuario: 'rcanas@policlinica.com',
    cargo: 'Cirugía General',
    rol: 'MEDICO',
    estado: 'ACTIVO',
    telefono: '2443-1025',
    fechaRegistro: '2026-01-15',
  },
  {
    id: medicoIds.fernando,
    nombreCompleto: 'Dr. Fernando Alvarenga',
    usuario: 'falvarenga@policlinica.com',
    cargo: 'Medicina Interna',
    rol: 'MEDICO',
    estado: 'ACTIVO',
    telefono: '2443-1026',
    fechaRegistro: '2026-01-15',
  },
];

/**
 * Horarios de atención por médico (HU-34).
 */
export const mockHorariosMedicos: HorarioMedico[] = [
  // Dra. Elena Ramírez Alfaro — Ginecología
  { id: 1, medico_id: medicoIds.elena, dia_semana: 'LUNES', hora_inicio: '15:00', hora_fin: '18:30' },
  { id: 2, medico_id: medicoIds.elena, dia_semana: 'MIERCOLES', hora_inicio: '15:00', hora_fin: '18:30' },
  { id: 3, medico_id: medicoIds.elena, dia_semana: 'VIERNES', hora_inicio: '15:00', hora_fin: '18:30' },
  { id: 4, medico_id: medicoIds.elena, dia_semana: 'SABADO', hora_inicio: '08:00', hora_fin: '12:00' },

  // Dr. Miguel Ángel Torres — Medicina Interna
  { id: 5, medico_id: medicoIds.miguel, dia_semana: 'MARTES', hora_inicio: '15:00', hora_fin: '18:30' },
  { id: 6, medico_id: medicoIds.miguel, dia_semana: 'JUEVES', hora_inicio: '15:00', hora_fin: '18:30' },

  // Dra. Carla Sofía Peña — Dermatología (horario propio, por la mañana)
  { id: 7, medico_id: medicoIds.carla, dia_semana: 'LUNES', hora_inicio: '08:00', hora_fin: '12:00' },
  { id: 8, medico_id: medicoIds.carla, dia_semana: 'MARTES', hora_inicio: '08:00', hora_fin: '12:00' },

  // Dr. Josué Hernández Cruz — Pediatría (sábado partido en dos bloques)
  { id: 9, medico_id: medicoIds.josue, dia_semana: 'LUNES', hora_inicio: '15:00', hora_fin: '18:30' },
  { id: 10, medico_id: medicoIds.josue, dia_semana: 'MIERCOLES', hora_inicio: '15:00', hora_fin: '18:30' },
  { id: 11, medico_id: medicoIds.josue, dia_semana: 'SABADO', hora_inicio: '08:00', hora_fin: '10:00' },
  { id: 12, medico_id: medicoIds.josue, dia_semana: 'SABADO', hora_inicio: '10:30', hora_fin: '12:00' },

  // Dr. Roberto Cañas Portillo — Cirugía General
  { id: 13, medico_id: medicoIds.roberto, dia_semana: 'JUEVES', hora_inicio: '15:00', hora_fin: '18:30' },
  { id: 14, medico_id: medicoIds.roberto, dia_semana: 'VIERNES', hora_inicio: '15:00', hora_fin: '18:30' },

  // Dr. Fernando Alvarenga — Medicina Interna
  { id: 15, medico_id: medicoIds.fernando, dia_semana: 'MARTES', hora_inicio: '15:00', hora_fin: '18:30' },
];

/** Pacientes de prueba */
export const nuevoUuid = (): string => crypto.randomUUID();

const pacienteIds = {
  carlos: '0f8fad5b-d9cb-469f-a165-708677289501',
  maria: '1f8fad5b-d9cb-469f-a165-708677289502',
  juan: '2f8fad5b-d9cb-469f-a165-708677289503',
  sofia: '3f8fad5b-d9cb-469f-a165-708677289504',
  luis: '4f8fad5b-d9cb-469f-a165-708677289505',
  ana: '5f8fad5b-d9cb-469f-a165-708677289506',
  mateo: '6f8fad5b-d9cb-469f-a165-708677289507',
} as const;

export const mockPacientes: Paciente[] = [
  {
    id: pacienteIds.carlos,
    numero_expediente: 'CM01-2026',
    nombre_completo: 'Carlos Eduardo Mendoza',
    fecha_nacimiento: '1988-04-12',
    dui: '04829103-5',
    telefono: '7823-4412',
    es_menor_edad: false,
    fecha_registro: '2026-02-15',
  },
  {
    id: pacienteIds.maria,
    numero_expediente: 'MA02-2026',
    nombre_completo: 'María Antonieta Alvarado',
    fecha_nacimiento: '1995-11-23',
    dui: '03918274-1',
    telefono: '7190-8821',
    es_menor_edad: false,
    fecha_registro: '2026-02-20',
  },
  {
    id: pacienteIds.juan,
    numero_expediente: 'JR03-2026',
    nombre_completo: 'Juan Roberto Ramos',
    fecha_nacimiento: '1976-08-05',
    dui: '01928475-8',
    telefono: '7541-2309',
    es_menor_edad: false,
    fecha_registro: '2026-03-01',
  },
  {
    id: pacienteIds.sofia,
    numero_expediente: 'SH04-2026',
    nombre_completo: 'Sofía Valentina Hernández',
    fecha_nacimiento: '2018-06-14',
    dui: 'MENOR-0001',
    telefono: '7920-1122',
    es_menor_edad: true,
    responsable_nombre: 'Gloria Hernández de Cruz',
    responsable_telefono: '7920-1122',
    responsable_parentesco: 'Madre',
    fecha_registro: '2026-03-05',
  },
  {
    id: pacienteIds.luis,
    numero_expediente: 'LP05-2026',
    nombre_completo: 'Luis Fernando Portillo',
    fecha_nacimiento: '1982-01-30',
    dui: '05829104-9',
    telefono: '7234-9012',
    es_menor_edad: false,
    fecha_registro: '2026-03-10',
  },
  {
    id: pacienteIds.ana,
    numero_expediente: 'AG06-2026',
    nombre_completo: 'Ana Gabriela Gómez',
    fecha_nacimiento: '2001-09-17',
    dui: '06192837-4',
    telefono: '7789-3456',
    es_menor_edad: false,
    fecha_registro: '2026-03-12',
  },
  {
    id: pacienteIds.mateo,
    numero_expediente: 'ME07-2026',
    nombre_completo: 'Mateo Alejandro Escobar',
    fecha_nacimiento: '2021-02-08',
    dui: 'MENOR-0002',
    telefono: '7412-8956',
    es_menor_edad: true,
    responsable_nombre: 'Alejandro Escobar Pineda',
    responsable_telefono: '7412-8956',
    responsable_parentesco: 'Padre',
    fecha_registro: '2026-03-15',
  },
];

/** Citas médicas iniciales */
export const mockCitas: Cita[] = [
  {
    id: 1,
    paciente_id: pacienteIds.carlos,
    pacienteNombre: 'Carlos Eduardo Mendoza',
    pacienteExpediente: 'CM01-2026',
    medico_id: medicoIds.miguel, // Dr. Miguel Ángel Torres
    medicoNombre: 'Dr. Miguel Ángel Torres',
    especialidadNombre: 'Medicina Interna',
    fecha: '2026-09-10',
    hora_inicio: '15:00',
    hora_fin: '15:30',
    tipo_cita: 'REGULAR',
    estado: 'EN_ESPERA',
    hora_llegada: '14:50',
    orden_atencion: 1,
    creado_por_id: administradorId,
  },
  {
    id: 2,
    paciente_id: pacienteIds.maria,
    pacienteNombre: 'María Antonieta Alvarado',
    pacienteExpediente: 'MA02-2026',
    medico_id: medicoIds.miguel,
    medicoNombre: 'Dr. Miguel Ángel Torres',
    especialidadNombre: 'Medicina Interna',
    fecha: '2026-09-10',
    hora_inicio: '15:30',
    hora_fin: '16:00',
    tipo_cita: 'REGULAR',
    estado: 'AGENDADA',
    orden_atencion: 2,
    creado_por_id: administradorId,
  },
  {
    id: 3,
    paciente_id: pacienteIds.sofia,
    pacienteNombre: 'Sofía Valentina Hernández',
    pacienteExpediente: 'SH04-2026',
    medico_id: medicoIds.josue, // Dr. Josué Hernández Cruz
    medicoNombre: 'Dr. Josué Hernández Cruz',
    especialidadNombre: 'Pediatría',
    fecha: '2026-09-10',
    hora_inicio: '16:00',
    hora_fin: '16:30',
    tipo_cita: 'EMERGENCIA',
    estado: 'AGENDADA',
    creado_por_id: administradorId,
  },
  {
    id: 4,
    paciente_id: pacienteIds.juan,
    pacienteNombre: 'Juan Roberto Ramos',
    pacienteExpediente: 'JR03-2026',
    medico_id: medicoIds.roberto, // Dr. Roberto Cañas Portillo
    medicoNombre: 'Dr. Roberto Cañas Portillo',
    especialidadNombre: 'Cirugía General',
    fecha: '2026-09-10',
    hora_inicio: '16:30',
    hora_fin: '17:00',
    tipo_cita: 'REGULAR',
    estado: 'ATENDIDA',
    hora_llegada: '16:15',
    orden_atencion: 1,
    creado_por_id: administradorId,
  },
  {
    id: 5,
    paciente_id: pacienteIds.luis,
    pacienteNombre: 'Luis Fernando Portillo',
    pacienteExpediente: 'LP05-2026',
    medico_id: medicoIds.elena, // Dra. Elena Ramírez Alfaro
    medicoNombre: 'Dra. Elena Ramírez Alfaro',
    especialidadNombre: 'Ginecología',
    fecha: '2026-09-11',
    hora_inicio: '15:00',
    hora_fin: '15:30',
    tipo_cita: 'REGULAR',
    estado: 'AGENDADA',
    creado_por_id: administradorId,
  },
  {
    id: 6,
    paciente_id: pacienteIds.ana,
    pacienteNombre: 'Ana Gabriela Gómez',
    pacienteExpediente: 'AG06-2026',
    medico_id: medicoIds.carla, // Dra. Carla Sofía Peña
    medicoNombre: 'Dra. Carla Sofía Peña',
    especialidadNombre: 'Dermatología',
    fecha: '2026-09-11',
    hora_inicio: '08:30',
    hora_fin: '09:00',
    tipo_cita: 'SOBRECUPO',
    estado: 'AGENDADA',
    creado_por_id: administradorId,
  },
];

/** Bloqueos de agenda iniciales */
export const mockBloqueosAgenda: BloqueoAgenda[] = [
  {
    id: 1,
    medico_id: medicoIds.carla,
    medicoNombre: 'Dra. Carla Sofía Peña',
    fecha: '2026-09-15',
    tipo_bloqueo: 'COMPLETO',
    motivo: 'Participación en Congreso Nacional de Dermatología',
    creado_por_id: administradorId,
    fecha_creacion: '2026-09-08',
  },
  {
    id: 2,
    medico_id: medicoIds.elena,
    medicoNombre: 'Dra. Elena Ramírez Alfaro',
    fecha: '2026-09-22',
    tipo_bloqueo: 'COMPLETO',
    motivo: 'Permiso médico personal justificado',
    creado_por_id: administradorId,
    fecha_creacion: '2026-09-09',
  },
  {
    id: 3,
    medico_id: medicoIds.miguel,
    medicoNombre: 'Dr. Miguel Ángel Torres',
    fecha: '2026-09-10',
    tipo_bloqueo: 'PARCIAL',
    hora_inicio: '17:00',
    hora_fin: '18:30',
    motivo: 'Reunión clínica departamental de medicina interna',
    creado_por_id: administradorId,
    fecha_creacion: '2026-09-09',
  },
];

/** Generadores de IDs en memoria */
export const siguienteIdHorario = (): number =>
  Math.max(0, ...mockHorariosMedicos.map((h) => h.id)) + 1;


export const siguienteIdCita = (): number =>
  Math.max(0, ...mockCitas.map((c) => c.id)) + 1;

export const siguienteIdBloqueo = (): number =>
  Math.max(0, ...mockBloqueosAgenda.map((b) => b.id)) + 1;
