import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface InfoTooltipProps {
  titulo: string;
  children: string;
  className?: string;
}

/**
 * Indicador "!" con una explicación breve. Abre al pasar el cursor, al enfocar con
 * teclado o al tocar, y no depende del `title` nativo del navegador.
 */
export function InfoTooltip({ titulo, children, className }: InfoTooltipProps) {
  const boton = useRef<HTMLButtonElement>(null);
  const [posicion, setPosicion] = useState<{ top: number; left: number } | null>(null);
  const abierto = posicion !== null;

  // Posición fija y acotada a la ventana: así no se corta contra el menú lateral ni el borde derecho.
  const abrir = () => {
    const caja = boton.current?.getBoundingClientRect();
    if (!caja) return;
    const ancho = 288;
    const margen = 16;
    const left = Math.min(Math.max(caja.left, margen), window.innerWidth - ancho - margen);
    setPosicion({ top: caja.bottom + 8, left });
  };
  const cerrar = () => setPosicion(null);

  return (
    <span
      className={cn('relative inline-flex', className)}
      onMouseEnter={abrir}
      onMouseLeave={cerrar}
    >
      <button
        ref={boton}
        type="button"
        aria-label={`¿Para qué sirve? ${titulo}`}
        aria-expanded={abierto}
        onClick={() => (abierto ? cerrar() : abrir())}
        onFocus={abrir}
        onBlur={cerrar}
        onKeyDown={(e) => e.key === 'Escape' && cerrar()}
        className="flex size-7 cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-sm font-bold text-brand-600 transition-colors hover:border-brand-600 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/15"
      >
        !
      </button>

      {posicion && (
        <span
          role="tooltip"
          style={{ top: posicion.top, left: posicion.left }}
          className="fixed z-50 w-72 rounded-card border border-line bg-surface p-4 text-left shadow-pop"
        >
          <span className="mb-1 flex items-center gap-1.5 text-sm font-bold text-ink">
            <i className="ri-information-line text-base text-brand-600" aria-hidden="true" />
            {titulo}
          </span>
          <span className="block text-xs leading-relaxed text-muted">{children}</span>
        </span>
      )}
    </span>
  );
}

export default InfoTooltip;
