import { useState } from 'react';
import CitaAvisos from '@/components/cita/CitaAvisos';
import Tooltip from '@/components/ui/Tooltip';
import { lapsoDeBloqueo } from '@/lib/bloqueo';
import { cn } from '@/lib/utils';
import { COLOR_ESTADO_CITA, ESTADO_CITA_LABEL, TIPO_CITA_LABEL, type Cita } from '@/types/cita.types';

/**
 * Una cita en una sola línea (hora, paciente y estado) para que una agenda con muchas
 * citas no se alargue. Al hacer clic se abre el detalle: expediente, especialidad, tipo y avisos.
 */
interface CitaFilaCompactaProps {
  cita: Cita;
  /** Si se pasan, las citas que necesitan atención (fuera de horario o que chocan) muestran estos botones. */
  onReagendar?: (cita: Cita) => void;
  onCancelar?: (cita: Cita) => void;
  /** Abre las citas afectadas del bloqueo para correrlas ese mismo día (solo bloqueos parciales). */
  onCorrer?: (cita: Cita) => void;
}

export function CitaFilaCompacta({ cita, onReagendar, onCancelar, onCorrer }: CitaFilaCompactaProps) {
  const [abierta, setAbierta] = useState(false);

  const color = COLOR_ESTADO_CITA[cita.estado];
  const cancelada = cita.estado === 'CANCELADA';
  const tieneAviso = Boolean(cita.fuera_de_horario || cita.empalmada || cita.afectada_por_bloqueo);
  // Solo estas citas necesitan una decisión de recepción: se resuelve desde aquí, sin ir a Citas.
  const necesitaDecision = Boolean(cita.fuera_de_horario || cita.empalmada || cita.afectada_por_bloqueo);
  // Correr solo tiene sentido si el paciente ya llegó (está en espera) y el bloqueo es por horas:
  // el de día completo no deja dónde correrla.
  const sePuedeCorrer = Boolean(
    onCorrer &&
      cita.estado === 'EN_ESPERA' &&
      cita.afectada_por_bloqueo &&
      cita.bloqueo?.tipo_bloqueo === 'PARCIAL',
  );

  return (
    <div
      className={cn(
        'rounded-field border border-l-[6px] border-line bg-surface text-xs transition-colors',
        color.barra,
        cancelada && 'bg-canvas opacity-60',
        cita.tipo_cita === 'EMERGENCIA' && 'bg-danger-soft/30',
        abierta && 'shadow-card',
      )}
    >
      <button
        type="button"
        onClick={() => setAbierta((v) => !v)}
        aria-expanded={abierta}
        title={`Estado: ${ESTADO_CITA_LABEL[cita.estado]}`}
        className="block w-full cursor-pointer px-2 py-1.5 text-left"
      >
        <span className="flex items-center justify-between gap-2">
          <span className="font-bold tabular-nums text-ink">
            {cita.hora_inicio} - {cita.hora_fin}
          </span>
          <span className="flex items-center gap-1.5">
            {cita.corrida_por && (cita.estado === 'AGENDADA' || cita.estado === 'EN_ESPERA') && (
              <i
                className="ri-history-line text-sm text-info"
                title="Se corrió: abre el detalle"
                aria-label="Cita corrida"
              />
            )}
            {tieneAviso && (
              <i
                className="ri-alarm-warning-fill text-sm text-warning"
                title="Esta cita necesita atención: abre el detalle"
                aria-label="Necesita atención"
              />
            )}
          </span>
        </span>
        <span
          className={cn('block truncate font-semibold text-ink', cancelada && 'line-through')}
        >
          {cita.pacienteNombre}
        </span>
      </button>

      {abierta && (
        <div className="space-y-1 border-t border-line px-2 py-2">
          <p className="text-[11px] text-muted">
            Exp: {cita.pacienteExpediente} · <span className="font-semibold">{ESTADO_CITA_LABEL[cita.estado]}</span>
          </p>
          {cita.especialidadNombre && (
            <p className="flex items-center gap-1 text-[11px] font-medium text-brand-700">
              <i className="ri-stethoscope-line" />
              <span className="truncate">{cita.especialidadNombre}</span>
            </p>
          )}
          {cita.tipo_cita !== 'REGULAR' && (
            <span className="inline-block rounded bg-warning-soft px-1.5 py-0.5 text-[10px] font-bold uppercase text-warning">
              {TIPO_CITA_LABEL[cita.tipo_cita]}
            </span>
          )}
          {cita.afectada_por_bloqueo && cita.bloqueo && (
            <p
              className="inline-flex items-center gap-1 rounded bg-warning-soft px-1.5 py-0.5 text-[10px] font-bold text-warning"
              title="Cae dentro de un bloqueo: recepción debe contactar al paciente."
            >
              <i className="ri-alarm-warning-line" />
              En bloqueo ({lapsoDeBloqueo(cita.bloqueo)})
            </p>
          )}
          <CitaAvisos cita={cita} />
          {necesitaDecision && (onReagendar || onCancelar) && (
            <div className="flex gap-1.5 pt-1">
              {sePuedeCorrer && onCorrer && (
                <Tooltip texto="Correr citas del bloqueo (el paciente ya llegó)">
                  <button
                    type="button"
                    onClick={() => onCorrer(cita)}
                    aria-label="Correr citas del bloqueo"
                    className="flex size-8 cursor-pointer items-center justify-center rounded-field border border-line bg-surface text-brand-600 transition-colors hover:bg-brand-50"
                  >
                    <i className="ri-time-line text-base" />
                  </button>
                </Tooltip>
              )}
              {onReagendar && (
                <Tooltip texto="Reagendar">
                  <button
                    type="button"
                    onClick={() => onReagendar(cita)}
                    aria-label="Reagendar"
                    className="flex size-8 cursor-pointer items-center justify-center rounded-field border border-line bg-surface text-brand-600 transition-colors hover:bg-brand-50"
                  >
                    <i className="ri-calendar-line text-base" />
                  </button>
                </Tooltip>
              )}
              {onCancelar && (
                <Tooltip texto="Cancelar cita">
                  <button
                    type="button"
                    onClick={() => onCancelar(cita)}
                    aria-label="Cancelar cita"
                    className="flex size-8 cursor-pointer items-center justify-center rounded-field border border-line bg-surface text-muted transition-colors hover:bg-danger-soft hover:text-danger"
                  >
                    <i className="ri-close-circle-line text-base" />
                  </button>
                </Tooltip>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CitaFilaCompacta;
