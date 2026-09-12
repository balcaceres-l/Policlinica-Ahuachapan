import type { Cita, NuevaCita, ReprogramarCitaPayload, SignosVitales } from '@/types/cita.types';
import { delay } from '@/lib/utils';
import { mockCitas, mockPacientes, siguienteIdCita } from '@/services/mockData';

export interface FiltrosCitasQuery {
  fecha?: string;
  medico_id?: string;
  estado?: string;
}

export const getCitas = async (filtros?: FiltrosCitasQuery): Promise<Cita[]> => {
  await delay(250);
  let resultado = [...mockCitas];

  if (filtros?.fecha) {
    resultado = resultado.filter((c) => c.fecha === filtros.fecha);
  }
  if (filtros?.medico_id) {
    resultado = resultado.filter((c) => c.medico_id === filtros.medico_id);
  }
  if (filtros?.estado && filtros.estado !== 'TODOS') {
    resultado = resultado.filter((c) => c.estado === filtros.estado);
  }

  return resultado.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
};

export const agendarCita = async (payload: NuevaCita, usuarioId = ''): Promise<Cita> => {
  await delay(350);

  // Validación de disponibilidad si no es emergencia ni sobrecupo
  if (payload.tipo_cita === 'REGULAR') {
    const colision = mockCitas.find(
      (c) =>
        c.medico_id === payload.medico_id &&
        c.fecha === payload.fecha &&
        c.estado !== 'CANCELADA' &&
        c.hora_inicio < payload.hora_fin &&
        payload.hora_inicio < c.hora_fin,
    );

    if (colision) {
      throw new Error(
        `El médico ya tiene una cita agendada a las ${colision.hora_inicio} en esa fecha.`,
      );
    }
  }

  const paciente = mockPacientes.find((p) => p.id === payload.paciente_id);

  const nueva: Cita = {
    id: siguienteIdCita(),
    paciente_id: payload.paciente_id,
    pacienteNombre: paciente?.nombre_completo ?? 'Paciente desconocido',
    pacienteExpediente: paciente?.numero_expediente ?? 'S/E',
    medico_id: payload.medico_id,
    medicoNombre: 'Médico Asignado', // se resolverá según el select
    especialidad_id: payload.especialidad_id,
    fecha: payload.fecha,
    hora_inicio: payload.hora_inicio,
    hora_fin: payload.hora_fin,
    tipo_cita: payload.tipo_cita,
    estado: 'AGENDADA',
    creado_por_id: usuarioId,
  };

  mockCitas.push(nueva);
  return nueva;
};

export const marcarLlegadaCita = async (id: number): Promise<Cita> => {
  await delay(300);
  const cita = mockCitas.find((c) => c.id === id);
  if (!cita) throw new Error('La cita no fue encontrada.');

  const ahora = new Date();
  const horaActual = `${String(ahora.getHours()).padStart(2, '0')}:${String(
    ahora.getMinutes(),
  ).padStart(2, '0')}`;

  const citasEnEspera = mockCitas.filter(
    (c) => c.fecha === cita.fecha && c.medico_id === cita.medico_id && c.estado === 'EN_ESPERA',
  );

  cita.estado = 'EN_ESPERA';
  cita.hora_llegada = horaActual;
  cita.orden_atencion = citasEnEspera.length + 1;

  return cita;
};

export const reprogramarCita = async (
  id: number,
  payload: ReprogramarCitaPayload,
): Promise<Cita> => {
  await delay(350);
  const cita = mockCitas.find((c) => c.id === id);
  if (!cita) throw new Error('La cita no fue encontrada.');

  // Validar conflicto
  const colision = mockCitas.find(
    (c) =>
      c.id !== id &&
      c.medico_id === cita.medico_id &&
      c.fecha === payload.fecha &&
      c.estado !== 'CANCELADA' &&
      c.hora_inicio < payload.hora_fin &&
      payload.hora_inicio < c.hora_fin,
  );

  if (colision) {
    throw new Error('Ese horario no está disponible para el médico seleccionado.');
  }

  cita.fecha = payload.fecha;
  cita.hora_inicio = payload.hora_inicio;
  cita.hora_fin = payload.hora_fin;
  cita.estado = 'AGENDADA';

  return cita;
};

export const cancelarCita = async (id: number, motivo: string): Promise<Cita> => {
  await delay(300);
  const cita = mockCitas.find((c) => c.id === id);
  if (!cita) throw new Error('La cita no fue encontrada.');

  cita.estado = 'CANCELADA';
  cita.motivo_cancelacion = motivo;
  return cita;
};

export const guardarSignosVitales = async (
  id: number,
  datos: SignosVitales,
  usuarioId = '',
): Promise<Cita> => {
  await delay(300);
  const cita = mockCitas.find((c) => c.id === id);
  if (!cita) throw new Error('La cita no fue encontrada.');

  // Cálculo automático del IMC si se ingresaron peso y talla
  let imcCalculado = datos.imc;
  if (datos.peso_kg && datos.talla_cm && datos.talla_cm > 0) {
    const tallaMetros = datos.talla_cm / 100;
    imcCalculado = Number((datos.peso_kg / (tallaMetros * tallaMetros)).toFixed(1));
  }

  const ahora = new Date();
  const fechaHoraActual = ahora.toISOString().replace('T', ' ').substring(0, 19);

  cita.signos_vitales = {
    ...datos,
    cita_id: id,
    imc: imcCalculado,
    registrado_por_id: usuarioId,
    fecha_registro: fechaHoraActual,
  };

  return cita;
};

