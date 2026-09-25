
import type { PacienteConsulta } from '@/types/consulta';
import type { ConsultaService } from './consulta.service';

const STORAGE_KEY = 'policlinica-demo-consulta-v1';

const inicial: PacienteConsulta[] = [
  {
    id: 'demo-1',
    nombre: 'María Patricia Ramírez Romero',
    expediente: 'EXP-2024-1007',
    edad: 50,
    tipo: 'Sin cita',
    horaLlegada: '08:10',
    motivo: 'Malestar general desde ayer',
    estado: 'espera',
    signos: {
      sistolica: '120',
      diastolica: '80',
      temperatura: '36.5',
      frecuencia: '80',
      saturacion: '98',
      peso: '68',
      talla: '167',
    },
    anamnesis: '',
    examen: '',
    diagnostico: '',
    plan: '',
    observaciones: '',
  },
  {
    id: 'demo-2',
    nombre: 'José Daniel Martínez',
    expediente: 'EXP-2025-0231',
    edad: 42,
    tipo: 'Con cita',
    horaLlegada: '08:35',
    motivo: 'Control de seguimiento',
    estado: 'espera',
    signos: {
      sistolica: '118',
      diastolica: '76',
      temperatura: '36.8',
      frecuencia: '74',
      saturacion: '97',
      peso: '79',
      talla: '175',
    },
    anamnesis: '',
    examen: '',
    diagnostico: '',
    plan: '',
    observaciones: '',
  },
  {
    id: 'demo-3',
    nombre: 'Ana Lucía Pérez',
    expediente: 'EXP-2023-0845',
    edad: 31,
    tipo: 'Con cita',
    horaLlegada: '09:05',
    motivo: 'Consulta general',
    estado: 'espera',
    signos: {
      sistolica: '110',
      diastolica: '70',
      temperatura: '36.7',
      frecuencia: '72',
      saturacion: '99',
      peso: '61',
      talla: '162',
    },
    anamnesis: '',
    examen: '',
    diagnostico: '',
    plan: '',
    observaciones: '',
  },
];

// Estado compartido entre los componentes.
let pacientes: PacienteConsulta[] = cargarPacientes();

const suscriptores = new Set<() => void>();

function cargarPacientes(): PacienteConsulta[] {
  try {
    const guardado = sessionStorage.getItem(STORAGE_KEY);

    return guardado
      ? JSON.parse(guardado) as PacienteConsulta[]
      : inicial;
  } catch {
    return inicial;
  }
}

function guardarPacientes(
  siguientes: PacienteConsulta[]
): void {
  pacientes = siguientes;

  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(pacientes)
    );
  } catch {
    // El estado en memoria continúa funcionando.
  }

  suscriptores.forEach((callback) => callback());
}

function suscribir(callback: () => void): () => void {
  suscriptores.add(callback);

  return () => {
    suscriptores.delete(callback);
  };
}

function obtenerPacientes(): PacienteConsulta[] {
  return pacientes;
}

async function iniciar(id: string): Promise<boolean> {
  const paciente = pacientes.find(
    (item) => item.id === id
  );

  if (!paciente || paciente.estado !== 'espera') {
    return false;
  }

  const hayConsultaActiva = pacientes.some(
    (item) => item.estado === 'consulta'
  );

  if (hayConsultaActiva) {
    return false;
  }

  guardarPacientes(
    pacientes.map((item) =>
      item.id === id
        ? {
            ...item,
            estado: 'consulta',
            inicio: Date.now(),
            fin: undefined,
          }
        : item
    )
  );

  return true;
}

async function modificar(
  id: string,
  cambios: Partial<PacienteConsulta>
): Promise<void> {
  const paciente = pacientes.find(
    (item) => item.id === id
  );

  if (!paciente) {
    throw new Error('Paciente no encontrado.');
  }

  guardarPacientes(
    pacientes.map((item) =>
      item.id === id
        ? {
            ...item,
            ...cambios,
            signos: cambios.signos
              ? { ...item.signos, ...cambios.signos }
              : item.signos,
          }
        : item
    )
  );
}

async function finalizar(id: string): Promise<void> {
  const paciente = pacientes.find(
    (item) => item.id === id
  );

  if (!paciente || paciente.estado !== 'consulta') {
    throw new Error('No existe una consulta activa.');
  }

  guardarPacientes(
    pacientes.map((item) =>
      item.id === id
        ? {
            ...item,
            estado: 'atendido',
            fin: Date.now(),
          }
        : item
    )
  );
}

async function reiniciar(): Promise<void> {
  guardarPacientes(
    inicial.map((paciente) => ({
      ...paciente,
      signos: { ...paciente.signos },
    }))
  );
}

export const consultaMockService: ConsultaService = {
  suscribir,
  obtenerPacientes,
  iniciar,
  modificar,
  finalizar,
  reiniciar,
};