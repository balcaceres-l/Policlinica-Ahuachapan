import { delay } from '@/lib/utils';
import { mockConsultasHistorial, mockPacientes } from '@/services/mockData';
import { consultasService } from '@/services/medico/consulta.service';
import type { PacienteConsulta } from '@/types/consulta';
import type { ConsultaHistorial } from '@/types/historial.types';

const dosDigitos = (n: number): string => String(n).padStart(2, '0');

/** Marca de tiempo en milisegundos -> `YYYY-MM-DD HH:mm:ss` (hora local), como lo entrega Laravel. */
const aFechaHora = (ms: number): string => {
  const d = new Date(ms);
  const fecha = `${d.getFullYear()}-${dosDigitos(d.getMonth() + 1)}-${dosDigitos(d.getDate())}`;
  const hora = `${dosDigitos(d.getHours())}:${dosDigitos(d.getMinutes())}:${dosDigitos(d.getSeconds())}`;
  return `${fecha} ${hora}`;
};

/**
 * HU-19 — una consulta finalizada en `ConsultaPage` pasa a ser parte del
 * historial: su examen físico, diagnóstico y plan quedan asociados al paciente.
 * El diagnóstico y el plan son textos libres hasta que existan HU-20, 21 y 44.
 */
const desdeConsultaAtendida = (c: PacienteConsulta): ConsultaHistorial => {
  const diagnostico = c.diagnostico.trim();
  const plan = c.plan.trim();
  const examen = c.examen.trim();

  return {
    id: c.id,
    paciente_id: c.pacienteId,
    cita_id: c.id,
    fecha_hora_inicio: aFechaHora(c.inicio ?? Date.now()),
    fecha_hora_fin: c.fin !== undefined ? aFechaHora(c.fin) : null,
    medico_id: c.medicoId ?? '',
    medicoNombre: c.medicoNombre ?? 'Médico tratante',
    especialidad_atencion_id: null,
    especialidadNombre: c.especialidadNombre ?? null,
    motivo_consulta: c.motivo.trim() || null,
    examen_fisico: examen || null,
    diagnosticos: diagnostico
      ? [
          {
            id: `${c.id}-diagnostico`,
            consulta_id: c.id,
            codigo_cie10: null,
            descripcion: diagnostico,
            es_texto_libre: true,
          },
        ]
      : [],
    plan_manejo: plan ? { id: `${c.id}-plan`, consulta_id: c.id, indicaciones: plan } : null,
  };
};

/**
 * HU-22 — Consultas previas del paciente con sus diagnósticos, plan de manejo
 * y examen físico. Se devuelven de la más reciente a la más antigua; la vista
 * puede invertir el orden.
 */
export const getHistorialPaciente = async (pacienteId: string): Promise<ConsultaHistorial[]> => {
  // TODO: api.get<ApiResponse<ConsultaHistorial[]>>(`/pacientes/${pacienteId}/historial-clinico`)
  // Con la API real, las consultas finalizadas ya vienen del backend y desaparece
  // la mezcla con `consultasService` (mock de la sala de espera).
  await delay(300);

  if (!mockPacientes.some((p) => p.id === pacienteId)) {
    throw new Error('No se encontró el expediente del paciente.');
  }

  const atendidas = consultasService
    .obtenerPacientes()
    .filter((c) => c.pacienteId === pacienteId && c.estado === 'atendido')
    .map(desdeConsultaAtendida);

  return [...mockConsultasHistorial.filter((c) => c.paciente_id === pacienteId), ...atendidas]
    .sort((a, b) => b.fecha_hora_inicio.localeCompare(a.fecha_hora_inicio))
    .map((c) => ({ ...c, diagnosticos: [...c.diagnosticos] }));
};
