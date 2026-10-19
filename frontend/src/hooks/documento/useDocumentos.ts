import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { historialKeys } from '@/hooks/historial/useHistorial';
import { consultaKeys } from '@/hooks/medico/useConsultas';
import {
  crearConstancia,
  crearReferencia,
  getMedicosDestino,
  obtenerPdf,
} from '@/services/documento/documento.service';
import type { NuevaReferencia } from '@/types/documento.types';

export const documentoKeys = {
  medicosDestino: ['documentos', 'medicos-destino'] as const,
  pdf: (ruta: string) => ['documentos', 'pdf', ruta] as const,
};

/** Al emitir un documento, la consulta y el expediente lo muestran. */
const useInvalidarDocumentos = () => {
  const queryClient = useQueryClient();
  return (consultaId: string) => {
    void queryClient.invalidateQueries({ queryKey: consultaKeys.detalle(consultaId) });
    void queryClient.invalidateQueries({ queryKey: historialKeys.all });
  };
};

/** HU-31 */
export const useCrearConstancia = () => {
  const invalidar = useInvalidarDocumentos();
  return useMutation({
    mutationFn: ({ consultaId, motivo }: { consultaId: string; motivo: string }) =>
      crearConstancia(consultaId, motivo),
    onSuccess: (_data, { consultaId }) => invalidar(consultaId),
  });
};

/** HU-32 */
export const useCrearReferencia = () => {
  const invalidar = useInvalidarDocumentos();
  return useMutation({
    mutationFn: ({ consultaId, payload }: { consultaId: string; payload: NuevaReferencia }) =>
      crearReferencia(consultaId, payload),
    onSuccess: (_data, { consultaId }) => invalidar(consultaId),
  });
};

export const useMedicosDestino = (habilitado: boolean) =>
  useQuery({
    queryKey: documentoKeys.medicosDestino,
    queryFn: getMedicosDestino,
    enabled: habilitado,
  });

/**
 * HU-33 — PDF de un documento como URL en memoria para verlo o imprimirlo;
 * solo se pide al abrir el visor. `liberar` la revoca: llamarla al cerrar.
 */
export const useDocumentoPdf = (ruta: string | null) => {
  const queryClient = useQueryClient();
  const consulta = useQuery({
    queryKey: documentoKeys.pdf(ruta ?? ''),
    queryFn: async () => URL.createObjectURL(await obtenerPdf(ruta!)),
    enabled: ruta !== null,
    // Cada apertura trae la versión vigente del documento.
    gcTime: 0,
  });

  const liberar = () => {
    if (consulta.data) URL.revokeObjectURL(consulta.data);
    if (ruta) queryClient.removeQueries({ queryKey: documentoKeys.pdf(ruta) });
  };

  return { ...consulta, liberar };
};
