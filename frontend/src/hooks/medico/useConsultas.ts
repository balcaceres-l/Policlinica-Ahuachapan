import { useState, useSyncExternalStore } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  actualizarConsulta,
  consultasService,
  finalizarConsulta,
  getConsulta,
  getEspecialidadesDisponibles,
  getSalaEspera,
  iniciarConsulta,
  type FinalizarConsultaPayload,
  type GuardarConsultaPayload,
} from '@/services/medico/consulta.service';
import type { PacienteConsulta } from '@/types/consulta';

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

/** Hook legacy para componentes que usaban external store */
export function useConsultas() {
  const pacientes = useSyncExternalStore(
    consultasService.suscribir,
    consultasService.obtenerPacientes,
    consultasService.obtenerPacientes,
  );

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ejecutar = async <T,>(operacion: () => Promise<T>): Promise<T> => {
    setCargando(true);
    setError(null);

    try {
      return await operacion();
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Ocurrió un error inesperado.';

      setError(mensaje);
      throw err;
    } finally {
      setCargando(false);
    }
  };

  const iniciar = (id: string): Promise<boolean> => ejecutar(() => consultasService.iniciar(id));

  const modificar = (id: string, cambios: Partial<PacienteConsulta>): Promise<void> =>
    ejecutar(() => consultasService.modificar(id, cambios));

  const finalizar = (id: string): Promise<void> => ejecutar(() => consultasService.finalizar(id));

  const reiniciar = (): Promise<void> => ejecutar(() => consultasService.reiniciar());

  return {
    pacientes,
    cargando,
    error,
    iniciar,
    modificar,
    finalizar,
    reiniciar,
  };
}