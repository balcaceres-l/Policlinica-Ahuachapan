import { useRef, useState, type ReactNode } from 'react';

interface TooltipProps {
  /** Texto de la etiqueta; normalmente el nombre de la acción. */
  texto: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Etiqueta flotante al pasar el cursor (o enfocar con teclado) sobre un botón o aviso. Va con
 * posición fija para que no la corte un contenedor con desplazamiento, y se abre hacia abajo
 * si arriba no hay lugar.
 */
export function Tooltip({ texto, children, className }: TooltipProps) {
  const contenedor = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ x: number; top?: number; bottom?: number } | null>(null);

  const abrir = () => {
    const caja = contenedor.current?.getBoundingClientRect();
    if (!caja) return;
    const x = caja.left + caja.width / 2;
    setPos(
      caja.top > 56
        ? { x, bottom: window.innerHeight - caja.top + 6 }
        : { x, top: caja.bottom + 6 },
    );
  };
  const cerrar = () => setPos(null);

  return (
    <span
      ref={contenedor}
      className={className ?? 'inline-flex'}
      onMouseEnter={abrir}
      onMouseLeave={cerrar}
      onFocus={abrir}
      onBlur={cerrar}
    >
      {children}
      {pos && (
        <span
          role="tooltip"
          style={{ left: pos.x, top: pos.top, bottom: pos.bottom }}
          className="pointer-events-none fixed z-60 max-w-64 -translate-x-1/2 rounded-field bg-ink px-2.5 py-1.5 text-center text-xs font-semibold leading-snug text-white shadow-pop dark:bg-slate-800 dark:text-slate-100 dark:border dark:border-slate-700"
        >
          {texto}
        </span>
      )}
    </span>
  );
}

export default Tooltip;
