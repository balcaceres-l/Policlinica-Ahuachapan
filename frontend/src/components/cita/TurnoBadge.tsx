import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn, getIniciales } from '@/lib/utils';
import type { Cita } from '@/types/cita.types';

interface TurnoBadgeProps {
  cita: Cita;
}

/**
 * El turno se cuenta por médico y por día: dos pacientes pueden tener el turno 1 si son de
 * médicos distintos. Por eso el número va con las iniciales del médico y, al hacer clic,
 * se explica de quién es.
 */
export function TurnoBadge({ cita }: TurnoBadgeProps) {
  const boton = useRef<HTMLButtonElement>(null);
  const [posicion, setPosicion] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!posicion) return undefined;
    const cerrar = () => setPosicion(null);
    const alTeclear = (e: KeyboardEvent) => e.key === 'Escape' && cerrar();
    document.addEventListener('mousedown', cerrar);
    document.addEventListener('keydown', alTeclear);
    window.addEventListener('scroll', cerrar, true);
    window.addEventListener('resize', cerrar);
    return () => {
      document.removeEventListener('mousedown', cerrar);
      document.removeEventListener('keydown', alTeclear);
      window.removeEventListener('scroll', cerrar, true);
      window.removeEventListener('resize', cerrar);
    };
  }, [posicion]);

  if (!cita.orden_atencion) return <span className="text-xs text-muted">—</span>;

  const abrir = () => {
    const caja = boton.current?.getBoundingClientRect();
    if (!caja) return;
    setPosicion({ top: caja.bottom + 8, left: caja.left + caja.width / 2 });
  };

  const llegada = cita.hora_llegada?.slice(11, 16);

  return (
    <>
      <button
        ref={boton}
        type="button"
        // mousedown cierra el popover abierto; sin esto el clic lo cerraría y reabriría.
        onMouseDown={(e) => e.stopPropagation()}
        onClick={() => (posicion ? setPosicion(null) : abrir())}
        aria-label={`Turno ${cita.orden_atencion} de ${cita.medicoNombre}. Clic para ver detalles.`}
        className={cn(
          'inline-flex cursor-pointer flex-col items-center rounded-field border px-2 py-1 transition-colors',
          posicion
            ? 'border-brand-600 bg-brand-50'
            : 'border-brand-600/20 bg-brand-50/60 hover:border-brand-600/50 hover:bg-brand-50',
        )}
      >
        <span className="text-sm font-bold leading-none text-brand-700">{cita.orden_atencion}</span>
        <span className="mt-1 text-[10px] font-semibold leading-none text-brand-600">
          {getIniciales(cita.medicoNombre)}
        </span>
      </button>

      {posicion &&
        createPortal(
          <div
            role="dialog"
            onMouseDown={(e) => e.stopPropagation()}
            style={{ top: posicion.top, left: posicion.left }}
            className="fixed z-50 w-64 -translate-x-1/2 rounded-card border border-line bg-surface p-4 text-left shadow-pop"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Turno</p>
            <p className="mt-0.5 text-sm font-bold text-ink">
              N.º {cita.orden_atencion} de {cita.medicoNombre}
            </p>
            {llegada && <p className="mt-1 text-xs text-muted">Paciente llegó a las {llegada}</p>}
            <p className="mt-2 border-t border-line pt-2 text-[11px] leading-relaxed text-muted">
              Cada médico tiene su propia numeración cada día, según el orden de llegada. Por eso
              puede haber varios turnos 1 de médicos distintos.
            </p>
          </div>,
          document.body,
        )}
    </>
  );
}

export default TurnoBadge;
