import { AxiosError } from 'axios';

/**
 * Desarma la respuesta { success, message, errors } del backend.
 * El primer error de validación es más específico que `message`, que en un
 * 422 es siempre genérico, así que tiene prioridad.
 */
export function extraerMensajeError(
  error: unknown,
  respaldo = 'Ocurrió un error inesperado.',
): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as
      | { message?: string; errors?: Record<string, string[]> }
      | undefined;

    const primerError = data?.errors ? Object.values(data.errors)[0]?.[0] : undefined;
    if (primerError) return primerError;
    if (data?.message) return data.message;

    if (error.code === 'ECONNABORTED') return 'El servidor tardó demasiado en responder.';
    if (!error.response) return 'No se pudo conectar con el servidor.';
  }

  return respaldo;
}
