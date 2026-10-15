import { useQuery } from '@tanstack/react-query';
import { buscarCie10 } from '@/services/cie10/cie10.service';

export const cie10Keys = {
  all: ['cie10'] as const,
  busqueda: (texto: string) => ['cie10', texto] as const,
};

export const LONGITUD_MINIMA_BUSQUEDA_CIE10 = 2;

/** HU-44 — códigos CIE-10 que coinciden con el texto. */
export const useBuscarCie10 = (texto: string) => {
  const termino = texto.trim();

  return useQuery({
    queryKey: cie10Keys.busqueda(termino.toLowerCase()),
    queryFn: () => buscarCie10(termino),
    enabled: termino.length >= LONGITUD_MINIMA_BUSQUEDA_CIE10,
    // Un catálogo sin cargar no se arregla reintentando.
    retry: false,
  });
};
