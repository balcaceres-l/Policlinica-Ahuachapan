import { useEffect, useRef, useState } from 'react';
import { enlazarCampoCie11 } from '@/lib/ect';
import type { EntidadSeleccionadaEct } from '@/types/cie11.types';

let siguienteCampo = 0;

interface BuscadorCie11Props {
  valor: string;
  /** El médico escribió: lo que haya en el campo se guarda como texto libre. */
  onEscribir: (texto: string) => void;
  /** Eligió una categoría de la OMS (siempre con código). */
  onSeleccionar: (entidad: EntidadSeleccionadaEct) => void;
  disabled: boolean;
  className: string;
}

/**
 * HU-44 — campo del diagnóstico con las sugerencias de la CIE-11 de la OMS.
 * Mientras se escribe, la herramienta de la OMS propone diagnósticos; si el
 * médico no elige ninguno, lo escrito se guarda tal cual como texto libre.
 */
export function BuscadorCie11({ valor, onEscribir, onSeleccionar, disabled, className }: BuscadorCie11Props) {
  const [iNo] = useState(() => `dx${++siguienteCampo}`);
  const [aviso, setAviso] = useState<string | null>(null);
  // Tras elegir, las sugerencias se ocultan; vuelven en cuanto se escribe.
  const [sugerenciasOcultas, setSugerenciasOcultas] = useState(false);

  // Los manejadores cambian en cada render; la ECT se enlaza una sola vez.
  const seleccionar = useRef(onSeleccionar);
  useEffect(() => {
    seleccionar.current = onSeleccionar;
  });

  useEffect(() => {
    if (disabled) return;
    let soltar: (() => void) | undefined;
    let vigente = true;

    void enlazarCampoCie11(iNo, {
      alSeleccionar: (entidad) => {
        if (!entidad.code) {
          setAviso('Ese elemento es una agrupación sin código. Elige un diagnóstico más específico o déjalo como texto libre.');
          return;
        }
        setAviso(null);
        setSugerenciasOcultas(true);
        seleccionar.current(entidad);
      },
      alError: (mensaje) => {
        if (vigente) setAviso(mensaje);
      },
    }).then((fn) => {
      if (vigente) soltar = fn;
      else fn();
    });

    return () => {
      vigente = false;
      soltar?.();
    };
  }, [iNo, disabled]);

  return (
    <div className="relative">
      <input
        type="text"
        className={`ctw-input ${className}`}
        data-ctw-ino={iNo}
        autoComplete="off"
        disabled={disabled}
        maxLength={500}
        placeholder="Ej. hipertensión esencial, faringitis aguda…"
        value={valor}
        onChange={(e) => {
          setSugerenciasOcultas(false);
          onEscribir(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setSugerenciasOcultas(true);
        }}
      />
      {/* La ECT dibuja aquí las sugerencias; React no debe renderizar hijos. */}
      <div className={sugerenciasOcultas ? 'ctw-window hidden' : 'ctw-window'} data-ctw-ino={iNo} />
      {aviso && (
        <p role="alert" className="mt-1.5 text-xs text-warning">
          {aviso}
        </p>
      )}
    </div>
  );
}

export default BuscadorCie11;
