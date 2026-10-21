import Tooltip from '@/components/ui/Tooltip';
import { cn } from '@/lib/utils';
import type { Cita } from '@/types/cita.types';

interface CitaAvisosProps {
  cita: Cita;
  className?: string;
}

const MOTIVO_CORRIDA = {
  EMERGENCIA: 'una emergencia',
  BLOQUEO: 'un bloqueo de agenda',
  ATRASO: 'el atraso del médico',
} as const;

/**
 * Avisos de una cita pendiente que recepción debe atender: quedó fuera del horario del
 * médico o choca con otra cita suya. Solo vienen en los listados; en otras vistas no se
 * muestra nada.
 */
export function CitaAvisos({ cita, className }: CitaAvisosProps) {
  // Solo importa mientras la cita sigue pendiente.
  const corrida =
    cita.corrida_por && (cita.estado === 'AGENDADA' || cita.estado === 'EN_ESPERA')
      ? cita.corrida_por
      : null;

  if (!cita.fuera_de_horario && !cita.empalmada && !corrida) return null;

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {corrida && (
        <Tooltip
          texto={
            cita.hora_inicio_original
              ? `Se corrió por ${MOTIVO_CORRIDA[corrida]}. Estaba a las ${cita.hora_inicio_original}`
              : `Se corrió por ${MOTIVO_CORRIDA[corrida]}`
          }
        >
          <span className="inline-flex items-center gap-1 rounded bg-info-soft px-1.5 py-0.5 text-[10px] font-bold text-info">
            <i className="ri-history-line" aria-hidden="true" />
            Corrida por {MOTIVO_CORRIDA[corrida]}
            {cita.hora_inicio_original && ` · antes ${cita.hora_inicio_original}`}
          </span>
        </Tooltip>
      )}
      {cita.empalmada && (
        <Tooltip texto="Choca con otra cita del mismo médico">
          <span className="inline-flex items-center gap-1 rounded bg-danger-soft px-1.5 py-0.5 text-[10px] font-bold text-danger">
            <i className="ri-error-warning-line" aria-hidden="true" />
            Choca con otra cita · reagendar
          </span>
        </Tooltip>
      )}
      {cita.fuera_de_horario && (
        <Tooltip texto="Esta cita está fuera del horario del médico">
          <span className="inline-flex items-center gap-1 rounded bg-warning-soft px-1.5 py-0.5 text-[10px] font-bold text-warning">
            <i className="ri-time-line" aria-hidden="true" />
            Fuera de su horario
          </span>
        </Tooltip>
      )}
    </div>
  );
}

export default CitaAvisos;
