
import { useState, useSyncExternalStore } from 'react';
import { consultasService } from '@/services/medico/consulta.service';
import type { PacienteConsulta } from '@/types/consulta';

export function useConsultas() {
  const pacientes = useSyncExternalStore(
    consultasService.suscribir,
    consultasService.obtenerPacientes,
    consultasService.obtenerPacientes
  );

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ejecutar = async <T,>(
    operacion: () => Promise<T>
  ): Promise<T> => {
    setCargando(true);
    setError(null);

    try {
      return await operacion();
    } catch (err) {
      const mensaje =
        err instanceof Error
          ? err.message
          : 'Ocurrió un error inesperado.';

      setError(mensaje);
      throw err;
    } finally {
      setCargando(false);
    }
  };

  const iniciar = (id: string): Promise<boolean> =>
    ejecutar(() => consultasService.iniciar(id));

  const modificar = (
    id: string,
    cambios: Partial<PacienteConsulta>
  ): Promise<void> =>
    ejecutar(() => consultasService.modificar(id, cambios));

  const finalizar = (id: string): Promise<void> =>
    ejecutar(() => consultasService.finalizar(id));

  const reiniciar = (): Promise<void> =>
    ejecutar(() => consultasService.reiniciar());

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