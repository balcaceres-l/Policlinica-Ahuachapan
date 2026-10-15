import { useEffect, useState } from 'react';

/** Devuelve `valor` solo cuando dejó de cambiar durante `ms`, para no consultar en cada tecla. */
export function useDebounce<T>(valor: T, ms = 350): T {
  const [estable, setEstable] = useState(valor);

  useEffect(() => {
    const temporizador = setTimeout(() => setEstable(valor), ms);
    return () => clearTimeout(temporizador);
  }, [valor, ms]);

  return estable;
}
