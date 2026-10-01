import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { Cita } from '@/types/cita.types';

interface FilaAtencionProps {
  citas: Cita[];
  /** Oculta el nombre del médico cuando la fila ya es de uno solo. */
  mostrarMedico?: boolean;
}

/**
 * HU-43 / RF-41 — orden de atención según llegada. El turno no depende de la
 * hora agendada: lo marca el momento en que recepción registra al paciente.
 */
export function FilaAtencion({ citas, mostrarMedico = true }: FilaAtencionProps) {
  const fila = useMemo(
    () =>
      citas
        .filter((c) => c.estado === 'EN_ESPERA' || c.estado === 'EN_ATENCION')
        .sort((a, b) => (a.orden_atencion ?? 0) - (b.orden_atencion ?? 0)),
    [citas],
  );

  if (fila.length === 0) {
    return (
      <div className="rounded-card border border-line bg-surface p-6 text-center shadow-card">
        <i className="ri-user-received-2-line mb-2 block text-2xl text-muted" />
        <p className="text-sm font-semibold text-ink">Nadie en sala de espera</p>
        <p className="mt-1 text-xs text-muted">
          Los pacientes aparecen aquí en cuanto recepción registra su llegada.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
      <header className="flex items-center justify-between border-b border-line px-5 py-3">
        <div className="flex items-center gap-2">
          <i className="ri-list-ordered text-base text-brand-600" />
          <h2 className="text-sm font-bold text-ink">Fila de atención</h2>
        </div>
        <span className="rounded-full bg-info-soft px-2.5 py-0.5 text-xs font-semibold text-info">
          {fila.length} esperando
        </span>
      </header>

      <ol className="divide-y divide-line">
        {fila.map((cita, indice) => {
          const enAtencion = cita.estado === 'EN_ATENCION';
          const esSiguiente = !enAtencion && indice === 0;

          return (
            <li
              key={cita.id}
              className={cn(
                'flex items-center gap-4 px-5 py-3',
                enAtencion && 'bg-success-soft/40',
                esSiguiente && 'bg-brand-50/60',
              )}
            >
              <span
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                  enAtencion
                    ? 'bg-success text-white'
                    : esSiguiente
                      ? 'bg-brand-600 text-white'
                      : 'bg-canvas text-muted',
                )}
              >
                {cita.orden_atencion ?? indice + 1}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{cita.pacienteNombre}</p>
                <p className="truncate text-xs text-muted">
                  Exp: {cita.pacienteExpediente}
                  {mostrarMedico && ` · ${cita.medicoNombre}`}
                </p>
              </div>

              <div className="shrink-0 text-right">
                {enAtencion ? (
                  <span className="rounded-full bg-success px-2.5 py-0.5 text-[11px] font-bold text-white">
                    En atención
                  </span>
                ) : esSiguiente ? (
                  <span className="rounded-full bg-brand-600 px-2.5 py-0.5 text-[11px] font-bold text-white">
                    Siguiente
                  </span>
                ) : (
                  <span className="text-xs text-muted">Cita {cita.hora_inicio}</span>
                )}
                {cita.hora_llegada && (
                  <p className="mt-0.5 text-[10px] text-muted">
                    Llegó {cita.hora_llegada.slice(11, 16)}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default FilaAtencion;
