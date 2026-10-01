import type { DiaSemana, HorarioMedico } from '@/types/horario.types';

/** Orden de la semana; define también el orden de las tablas de horarios. */
export const DIAS_SEMANA: DiaSemana[] = [
  'LUNES',
  'MARTES',
  'MIERCOLES',
  'JUEVES',
  'VIERNES',
  'SABADO',
  'DOMINGO',
];

export const DIA_LABEL: Record<DiaSemana, string> = {
  LUNES: 'Lunes',
  MARTES: 'Martes',
  MIERCOLES: 'Miércoles',
  JUEVES: 'Jueves',
  VIERNES: 'Viernes',
  SABADO: 'Sábado',
  DOMINGO: 'Domingo',
};

/**
 * Horario de referencia de la policlínica. Se muestra como guía en el
 * formulario, pero no restringe: cada médico configura el suyo y hay
 * especialidades (dermatología) que atienden en otro horario.
 */
export const HORARIO_BASE_TEXTO =
  'Referencia: lunes a viernes 3:00 PM – 6:30 PM · sábados 8:00 AM – 12:00 MD.';

/** Abreviatura para resúmenes compactos. */
export const DIA_CORTO: Record<DiaSemana, string> = {
  LUNES: 'Lun',
  MARTES: 'Mar',
  MIERCOLES: 'Mié',
  JUEVES: 'Jue',
  VIERNES: 'Vie',
  SABADO: 'Sáb',
  DOMINGO: 'Dom',
};

/** '15:00' -> '3:00 PM' */
export const formatearHora = (hora: string): string => {
  const [horas, minutos] = hora.split(':').map(Number);
  const periodo = horas < 12 ? 'AM' : 'PM';
  const hora12 = horas % 12 === 0 ? 12 : horas % 12;
  return `${hora12}:${String(minutos).padStart(2, '0')} ${periodo}`;
};

/** 'Lun 3:00 PM - 6:30 PM · Mar 3:00 PM - 6:30 PM' */
export const resumirHorarios = (horarios?: HorarioMedico[]): string => {
  if (!horarios?.length) return 'Horario por coordinar';

  return [...horarios]
    .sort(
      (a, b) =>
        DIAS_SEMANA.indexOf(a.dia_semana) - DIAS_SEMANA.indexOf(b.dia_semana) ||
        a.hora_inicio.localeCompare(b.hora_inicio),
    )
    .map(
      (h) =>
        `${DIA_CORTO[h.dia_semana]} ${formatearHora(h.hora_inicio)} - ${formatearHora(h.hora_fin)}`,
    )
    .join(' · ');
};
