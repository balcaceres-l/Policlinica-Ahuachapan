import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  actualizarConsulta,
  finalizarConsulta,
  getConsulta,
  getEspecialidadesDisponibles,
  getSalaEspera,
  iniciarConsulta,
  type FinalizarConsultaPayload,
  type GuardarConsultaPayload,
} from '@/services/medico/consulta.service';

export const consultaKeys = {
  salaEspera: ['medico', 'sala-espera'] as const,
  detalle: (id: string) => ['consulta', id] as const,
  especialidades: ['medico', 'especialidades-consulta'] as const,
};

/** Hook para obtener la lista de espera real del día para el médico autenticado */
export const useSalaEspera = () => {
  return useQuery({
    queryKey: consultaKeys.salaEspera,
    queryFn: getSalaEspera,
    refetchInterval: 30000, // Refrescar cada 30 segundos
  });
};

/** Hook para obtener los datos clínicos completos de una consulta */
export const useConsulta = (id: string) => {
  return useQuery({
    queryKey: consultaKeys.detalle(id),
    queryFn: () => getConsulta(id),
    enabled: Boolean(id),
  });
};

/** Hook para consultar las especialidades con las que el médico puede atender */
export const useEspecialidadesDisponibles = () => {
  return useQuery({
    queryKey: consultaKeys.especialidades,
    queryFn: getEspecialidadesDisponibles,
  });
};

/** Hook para iniciar la atención de una cita */
export const useIniciarConsulta = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      citaId,
      especialidadId,
    }: {
      citaId: string;
      especialidadId?: string;
    }) => iniciarConsulta(citaId, especialidadId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: consultaKeys.salaEspera });
      void queryClient.invalidateQueries({ queryKey: ['citas'] });
    },
  });
};

/** Hook para guardar el progreso clínico de la consulta (motivo, examen, plan, receta, precios) */
export const useActualizarConsulta = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: GuardarConsultaPayload;
    }) => actualizarConsulta(id, payload),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: consultaKeys.detalle(variables.id) });
      void queryClient.invalidateQueries({ queryKey: consultaKeys.salaEspera });
    },
  });
};

/** Hook para finalizar la consulta */
export const useFinalizarConsulta = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload?: FinalizarConsultaPayload;
    }) => finalizarConsulta(id, payload),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: consultaKeys.detalle(variables.id) });
      void queryClient.invalidateQueries({ queryKey: consultaKeys.salaEspera });
      void queryClient.invalidateQueries({ queryKey: ['citas'] });
    },
  });
};