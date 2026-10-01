
import type { PacienteConsulta } from '@/types/consulta';
import { consultaMockService } from './consulta.mock.service';

export interface ConsultaService {
  suscribir: (callback: () => void) => () => void;

  obtenerPacientes: () => PacienteConsulta[];

  iniciar: (id: string) => Promise<boolean>;

  modificar: (
    id: string,
    cambios: Partial<PacienteConsulta>
  ) => Promise<void>;

  finalizar: (id: string) => Promise<void>;

  reiniciar: () => Promise<void>;
}

// Implementación temporal.
// Posteriormente se sustituirá por el servicio HTTP de Laravel.
export const consultasService: ConsultaService =
  consultaMockService;