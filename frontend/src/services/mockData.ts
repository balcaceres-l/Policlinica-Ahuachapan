import type { Especialidad, EspecialidadConMedicos } from '@/types/especialidad.types';
import type { ConsultaHistorial, DiagnosticoConsulta } from '@/types/historial.types';
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
  { id: '1', medico_id: medicoIds.elena, dia_semana: 'LUNES', hora_inicio: '15:00', hora_fin: '18:30' },
  { id: '2', medico_id: medicoIds.elena, dia_semana: 'MIERCOLES', hora_inicio: '15:00', hora_fin: '18:30' },
  { id: '3', medico_id: medicoIds.elena, dia_semana: 'VIERNES', hora_inicio: '15:00', hora_fin: '18:30' },
  { id: '4', medico_id: medicoIds.elena, dia_semana: 'SABADO', hora_inicio: '08:00', hora_fin: '12:00' },

  // Dr. Miguel Ángel Torres — Medicina Interna
  { id: '5', medico_id: medicoIds.miguel, dia_semana: 'MARTES', hora_inicio: '15:00', hora_fin: '18:30' },
  { id: '6', medico_id: medicoIds.miguel, dia_semana: 'JUEVES', hora_inicio: '15:00', hora_fin: '18:30' },

  // Dra. Carla Sofía Peña — Dermatología (horario propio, por la mañana)
  { id: '7', medico_id: medicoIds.carla, dia_semana: 'LUNES', hora_inicio: '08:00', hora_fin: '12:00' },
  { id: '8', medico_id: medicoIds.carla, dia_semana: 'MARTES', hora_inicio: '08:00', hora_fin: '12:00' },

  // Dr. Josué Hernández Cruz — Pediatría (sábado partido en dos bloques)
  { id: '9', medico_id: medicoIds.josue, dia_semana: 'LUNES', hora_inicio: '15:00', hora_fin: '18:30' },
  { id: '10', medico_id: medicoIds.josue, dia_semana: 'MIERCOLES', hora_inicio: '15:00', hora_fin: '18:30' },
  { id: '11', medico_id: medicoIds.josue, dia_semana: 'SABADO', hora_inicio: '08:00', hora_fin: '10:00' },
  { id: '12', medico_id: medicoIds.josue, dia_semana: 'SABADO', hora_inicio: '10:30', hora_fin: '12:00' },

  // Dr. Roberto Cañas Portillo — Cirugía General
  { id: '13', medico_id: medicoIds.roberto, dia_semana: 'JUEVES', hora_inicio: '15:00', hora_fin: '18:30' },
  { id: '14', medico_id: medicoIds.roberto, dia_semana: 'VIERNES', hora_inicio: '15:00', hora_fin: '18:30' },

  // Dr. Fernando Alvarenga — Medicina Interna
  { id: '15', medico_id: medicoIds.fernando, dia_semana: 'MARTES', hora_inicio: '15:00', hora_fin: '18:30' },
];

/** Días abreviados para mostrar horarios de médicos */
const NOMBRES_DIAS_CORTO: Record<string, string> = {
  LUNES: 'Lun',
  MARTES: 'Mar',
  MIERCOLES: 'Mié',
  JUEVES: 'Jue',
  VIERNES: 'Vie',
  SABADO: 'Sáb',
  DOMINGO: 'Dom',
};

export const getHorarioResumidoMedico = (medicoId: string): string => {
  const horarios = mockHorariosMedicos.filter((h) => h.medico_id === medicoId);
  if (horarios.length === 0) return 'Horario por coordinar';

  return horarios
    .map((h) => `${NOMBRES_DIAS_CORTO[h.dia_semana] ?? h.dia_semana} ${h.hora_inicio} - ${h.hora_fin}`)
    .join(' · ');
};

/** IDs de especialidades médicas */
export const especialidadIds = {
  ginecologia: '90f5a2b0-7e2d-4ad1-8b1b-000000000001',
  medicinaInterna: '90f5a2b0-7e2d-4ad1-8b1b-000000000002',
  dermatologia: '90f5a2b0-7e2d-4ad1-8b1b-000000000003',
  pediatria: '90f5a2b0-7e2d-4ad1-8b1b-000000000004',
  cirugiaGeneral: '90f5a2b0-7e2d-4ad1-8b1b-000000000005',
  clinicaUlceras: '90f5a2b0-7e2d-4ad1-8b1b-000000000006',
} as const;

/** Listado general de especialidades (HU-07) */
export const mockEspecialidades: Especialidad[] = [
  {
    id: especialidadIds.ginecologia,
    nombre: 'Ginecología',
    descripcion: 'Atención integral de la salud femenina y control prenatal.',
    estado: 'ACTIVA',
    cantidadMedicos: 1,
    fechaRegistro: '2026-01-10',
  },
  {
    id: especialidadIds.medicinaInterna,
    nombre: 'Medicina Interna',
    descripcion: 'Diagnóstico y tratamiento integral de enfermedades del adulto.',
    estado: 'ACTIVA',
    cantidadMedicos: 3,
    fechaRegistro: '2026-01-10',
  },
  {
    id: especialidadIds.dermatologia,
    nombre: 'Dermatología',
    descripcion: 'Diagnóstico y tratamiento de afecciones de la piel, cabello y uñas.',
    estado: 'ACTIVA',
    cantidadMedicos: 1,
    fechaRegistro: '2026-01-10',
  },
  {
    id: especialidadIds.pediatria,
    nombre: 'Pediatría',
    descripcion: 'Atención médica y seguimiento del desarrollo de niñas y niños de 0 a 12 años.',
    estado: 'ACTIVA',
    cantidadMedicos: 1,
    fechaRegistro: '2026-01-10',
  },
  {
    id: especialidadIds.cirugiaGeneral,
    nombre: 'Cirugía General',
    descripcion: 'Evaluación prequirúrgica, procedimientos menores y seguimiento postoperatorio.',
    estado: 'ACTIVA',
    cantidadMedicos: 1,
    fechaRegistro: '2026-01-10',
  },
  {
    id: especialidadIds.clinicaUlceras,
    nombre: 'Clínica de Úlceras',
    descripcion: 'Curación y seguimiento de úlceras y heridas crónicas.',
    estado: 'INACTIVA',
    cantidadMedicos: 0,
    fechaRegistro: '2026-01-10',
  },
];

/** Catálogo enriquecido con médicos vinculados (HU-09) */
export const mockCatalogoEspecialidades: EspecialidadConMedicos[] = [
  {
    id: especialidadIds.ginecologia,
    nombre: 'Ginecología',
    descripcion: 'Atención integral de la salud femenina y control prenatal.',
    estado: 'ACTIVA',
    cantidadMedicos: 1,
    fechaRegistro: '2026-01-10',
    medicos: [mockMedicos[0]], // Dra. Elena Ramírez Alfaro
  },
  {
    id: especialidadIds.medicinaInterna,
    nombre: 'Medicina Interna',
    descripcion: 'Diagnóstico y tratamiento integral de enfermedades del adulto.',
    estado: 'ACTIVA',
    cantidadMedicos: 3,
    fechaRegistro: '2026-01-10',
    medicos: [mockMedicos[1], mockMedicos[4], mockMedicos[5]], // Dr. Miguel Ángel Torres, Dr. Roberto Cañas Portillo, Dr. Fernando Alvarenga
  },
  {
    id: especialidadIds.dermatologia,
    nombre: 'Dermatología',
    descripcion: 'Diagnóstico y tratamiento de afecciones de la piel, cabello y uñas.',
    estado: 'ACTIVA',
    cantidadMedicos: 1,
    fechaRegistro: '2026-01-10',
    medicos: [mockMedicos[2]], // Dra. Carla Sofía Peña
  },
  {
    id: especialidadIds.pediatria,
    nombre: 'Pediatría',
    descripcion: 'Atención médica y seguimiento del desarrollo de niñas y niños de 0 a 12 años.',
    estado: 'ACTIVA',
    cantidadMedicos: 1,
    fechaRegistro: '2026-01-10',
    medicos: [mockMedicos[3]], // Dr. Josué Hernández Cruz
  },
  {
    id: especialidadIds.cirugiaGeneral,
    nombre: 'Cirugía General',
    descripcion: 'Evaluación prequirúrgica, procedimientos menores y seguimiento postoperatorio.',
    estado: 'ACTIVA',
    cantidadMedicos: 1,
    fechaRegistro: '2026-01-10',
    medicos: [mockMedicos[4]], // Dr. Roberto Cañas Portillo
  },
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
  john: '7f8fad5b-d9cb-469f-a165-708677289508',
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
    responsable_documento: '01827364-5',
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
    responsable_documento: '02918273-4',
    responsable_telefono: '7412-8956',
    responsable_parentesco: 'Padre',
    fecha_registro: '2026-03-15',
  },
  {
    id: pacienteIds.john,
    numero_expediente: 'JS08-2026',
    nombre_completo: 'John Michael Smith',
    fecha_nacimiento: '1985-07-22',
    tipo_documento: 'PASAPORTE',
    dui: 'PA8492019',
    telefono: '7999-1234',
    es_menor_edad: false,
    fecha_registro: '2026-03-18',
  },
];

/** Función auxiliar para generar fechas relativas para los mocks */
export const obtenerFechaRelativa = (offsetDias: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDias);
  const anio = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
};

/* ------------------------------------------------------------------
   Historial clínico simulado (HU-19, HU-20, HU-21, HU-22).
   Consultas ya atendidas, con datos ficticios de prueba. Los pacientes
   luis, ana, mateo y john no tienen consultas previas a propósito, para
   probar el estado vacío del historial.
   ------------------------------------------------------------------ */

const idHistorial = (bloque: string, n: number): string =>
  `${bloque}f5a2b0-7e2d-4ad1-8b1b-${String(n).padStart(12, '0')}`;

/** Diagnóstico de catálogo (CIE-10) o de texto libre. */
const diagnostico = (
  consultaId: string,
  n: number,
  descripcion: string,
  codigoCie10: string | null = null,
): DiagnosticoConsulta => ({
  id: idHistorial('b0', n),
  consulta_id: consultaId,
  codigo_cie10: codigoCie10,
  descripcion,
  es_texto_libre: codigoCie10 === null,
});

const consultaIds = {
  carlos1: idHistorial('a0', 1),
  carlos2: idHistorial('a0', 2),
  carlos3: idHistorial('a0', 3),
  maria1: idHistorial('a0', 4),
  maria2: idHistorial('a0', 5),
  juan1: idHistorial('a0', 6),
  sofia1: idHistorial('a0', 7),
} as const;

export const mockConsultasHistorial: ConsultaHistorial[] = [
  {
    id: consultaIds.carlos1,
    paciente_id: pacienteIds.carlos,
    cita_id: idHistorial('c0', 1),
    fecha_hora_inicio: '2026-03-10 15:20:00',
    fecha_hora_fin: '2026-03-10 15:45:00',
    medico_id: medicoIds.miguel,
    medicoNombre: 'Dr. Miguel Ángel Torres',
    especialidad_atencion_id: especialidadIds.medicinaInterna,
    especialidadNombre: 'Medicina Interna',
    motivo_consulta: 'Cefalea persistente y mareos de una semana de evolución.',
    examen_fisico:
      'Paciente alerta, orientado, en buen estado general. Tórax simétrico, sin ruidos agregados a la auscultación. ' +
      'Ruidos cardíacos rítmicos, sin soplos. Abdomen blando, depresible, no doloroso. Extremidades sin edema.',
    diagnosticos: [diagnostico(consultaIds.carlos1, 1, 'Hipertensión esencial (primaria)', 'I10')],
    plan_manejo: {
      id: idHistorial('d0', 1),
      consulta_id: consultaIds.carlos1,
      indicaciones:
        'Iniciar tratamiento antihipertensivo indicado en receta. Dieta baja en sodio, actividad física ligera ' +
        'diaria y control de presión arterial en casa. Cita de control en 4 semanas.',
    },
  },
  {
    id: consultaIds.carlos2,
    paciente_id: pacienteIds.carlos,
    cita_id: idHistorial('c0', 2),
    fecha_hora_inicio: '2026-04-14 15:50:00',
    fecha_hora_fin: '2026-04-14 16:10:00',
    medico_id: medicoIds.miguel,
    medicoNombre: 'Dr. Miguel Ángel Torres',
    especialidad_atencion_id: especialidadIds.medicinaInterna,
    especialidadNombre: 'Medicina Interna',
    motivo_consulta: 'Control de presión arterial.',
    examen_fisico:
      'Sin cefalea ni mareos. Tórax sin alteraciones. Abdomen blando, depresible, no doloroso. Sin edema en extremidades.',
    diagnosticos: [diagnostico(consultaIds.carlos2, 2, 'Hipertensión esencial (primaria)', 'I10')],
    plan_manejo: {
      id: idHistorial('d0', 2),
      consulta_id: consultaIds.carlos2,
      indicaciones:
        'Continuar el mismo esquema de tratamiento. Mantener dieta baja en sodio. Control mensual con toma de presión.',
    },
  },
  {
    id: consultaIds.carlos3,
    paciente_id: pacienteIds.carlos,
    cita_id: idHistorial('c0', 3),
    fecha_hora_inicio: '2026-08-25 15:40:00',
    fecha_hora_fin: '2026-08-25 16:05:00',
    medico_id: medicoIds.fernando,
    medicoNombre: 'Dr. Fernando Alvarenga',
    especialidad_atencion_id: especialidadIds.medicinaInterna,
    especialidadNombre: 'Medicina Interna',
    motivo_consulta: 'Tos con congestión nasal y malestar general desde hace tres días.',
    examen_fisico:
      'Orofaringe hiperémica sin exudado. Mucosa nasal pálida y edematosa. Tórax simétrico, murmullo vesicular ' +
      'conservado, sin ruidos agregados.',
    diagnosticos: [
      diagnostico(
        consultaIds.carlos3,
        3,
        'Infección aguda de las vías respiratorias superiores, no especificada',
        'J06.9',
      ),
      diagnostico(consultaIds.carlos3, 4, 'Probable rinitis alérgica asociada'),
    ],
    plan_manejo: {
      id: idHistorial('d0', 3),
      consulta_id: consultaIds.carlos3,
      indicaciones:
        'Reposo relativo e hidratación abundante. Tratamiento sintomático indicado en receta. ' +
        'Regresar si hay fiebre mayor a 38.5 °C o dificultad para respirar.',
    },
  },
  {
    id: consultaIds.maria1,
    paciente_id: pacienteIds.maria,
    cita_id: idHistorial('c0', 4),
    fecha_hora_inicio: '2026-05-06 15:30:00',
    fecha_hora_fin: '2026-05-06 15:55:00',
    medico_id: medicoIds.elena,
    medicoNombre: 'Dra. Elena Ramírez Alfaro',
    especialidad_atencion_id: especialidadIds.ginecologia,
    especialidadNombre: 'Ginecología',
    motivo_consulta: 'Flujo vaginal con prurito de cinco días.',
    examen_fisico: 'Abdomen blando, depresible, sin dolor a la palpación. Especuloscopía con secreción aumentada.',
    diagnosticos: [diagnostico(consultaIds.maria1, 5, 'Vaginitis aguda', 'N76.0')],
    plan_manejo: {
      id: idHistorial('d0', 4),
      consulta_id: consultaIds.maria1,
      indicaciones: 'Tratamiento local y por vía oral indicado en receta. Abstinencia durante el tratamiento.',
    },
  },
  {
    id: consultaIds.maria2,
    paciente_id: pacienteIds.maria,
    cita_id: idHistorial('c0', 5),
    fecha_hora_inicio: '2026-07-15 16:00:00',
    fecha_hora_fin: '2026-07-15 16:25:00',
    medico_id: medicoIds.elena,
    medicoNombre: 'Dra. Elena Ramírez Alfaro',
    especialidad_atencion_id: especialidadIds.ginecologia,
    especialidadNombre: 'Ginecología',
    motivo_consulta: 'Retraso menstrual y prueba de embarazo positiva.',
    examen_fisico: 'Abdomen blando, depresible, útero no palpable por encima del pubis. Sin edema en extremidades.',
    diagnosticos: [diagnostico(consultaIds.maria2, 6, 'Supervisión de primer embarazo normal', 'Z34.0')],
    plan_manejo: {
      id: idHistorial('d0', 5),
      consulta_id: consultaIds.maria2,
      indicaciones:
        'Inicio de control prenatal. Suplemento vitamínico indicado en receta. Ultrasonido obstétrico y exámenes de ' +
        'laboratorio de rutina. Próximo control en 4 semanas.',
    },
  },
  {
    id: consultaIds.juan1,
    paciente_id: pacienteIds.juan,
    cita_id: idHistorial('c0', 6),
    fecha_hora_inicio: '2026-06-04 16:00:00',
    fecha_hora_fin: '2026-06-04 16:20:00',
    medico_id: medicoIds.roberto,
    medicoNombre: 'Dr. Roberto Cañas Portillo',
    especialidad_atencion_id: especialidadIds.cirugiaGeneral,
    especialidadNombre: 'Cirugía General',
    motivo_consulta: 'Dolor en la parte alta del abdomen después de comer.',
    examen_fisico: 'Abdomen blando, doloroso a la palpación en epigastrio, sin signos de irritación peritoneal.',
    diagnosticos: [diagnostico(consultaIds.juan1, 7, 'Gastritis, no especificada', 'K29.7')],
    // Sin plan de manejo registrado: sirve para probar ese estado en la vista.
    plan_manejo: null,
  },
  {
    id: consultaIds.sofia1,
    paciente_id: pacienteIds.sofia,
    cita_id: idHistorial('c0', 7),
    fecha_hora_inicio: '2026-06-20 09:00:00',
    fecha_hora_fin: '2026-06-20 09:25:00',
    medico_id: medicoIds.josue,
    medicoNombre: 'Dr. Josué Hernández Cruz',
    especialidad_atencion_id: especialidadIds.pediatria,
    especialidadNombre: 'Pediatría',
    motivo_consulta: 'Fiebre y dolor de garganta desde ayer.',
    examen_fisico:
      'Niña activa, reactiva, hidratada. Orofaringe hiperémica con amígdalas aumentadas de tamaño. ' +
      'Tórax sin ruidos agregados.',
    diagnosticos: [diagnostico(consultaIds.sofia1, 8, 'Faringitis aguda, no especificada', 'J02.9')],
    plan_manejo: {
      id: idHistorial('d0', 6),
      consulta_id: consultaIds.sofia1,
      indicaciones:
        'Antipirético y tratamiento indicados en receta según peso. Líquidos abundantes y reposo. ' +
        'Control en 3 días o antes si persiste la fiebre.',
    },
  },
];

/** Generadores de IDs en memoria */
