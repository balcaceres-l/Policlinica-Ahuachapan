import { obtenerConfiguracionCie11, obtenerPaseCie11, urlProxyCie11 } from '@/services/cie11/cie11.service';
import type { EntidadSeleccionadaEct } from '@/types/cie11.types';

/**
 * HU-44 — herramienta de búsqueda de la OMS (Embedded Coding Tool, @whoicd/icd11ect).
 *
 * - Se carga bajo demanda: pesa ~750 KB y solo la usa el médico en la consulta.
 * - Habla con el proxy de nuestro backend (`/api/oms-icd`), nunca con la OMS: el
 *   token de la OMS no llega al navegador. `getNewTokenFunction` entrega un pase
 *   propio de corta duración que solo sirve contra ese proxy.
 * - Se configura una sola vez para toda la app; cada campo se enlaza con su `iNo`.
 */

interface ManejadoresCampo {
  alSeleccionar: (entidad: EntidadSeleccionadaEct) => void;
  alError: (mensaje: string) => void;
}

interface HandlerEct {
  configure: (settings: Record<string, unknown>, callbacks: Record<string, unknown>) => void;
  bind: (iNo: string) => void;
  search: (iNo: string, q: string) => void;
}

const campos = new Map<string, ManejadoresCampo>();
const enlazados = new Set<string>();
let preparacion: Promise<HandlerEct> | null = null;

const avisarATodos = (mensaje: string) => campos.forEach((c) => c.alError(mensaje));

async function preparar(): Promise<HandlerEct> {
  const [modulo, configuracion] = await Promise.all([
    import('@whoicd/icd11ect'),
    obtenerConfiguracionCie11(),
    import('@whoicd/icd11ect/style.css').then(() => import('@/styles/ect.css')),
  ]);
  // El paquete es UMD: según el empaquetador llega como `ECT`, `default.ECT` o
  // directamente como `default` (Vite lo entrega así: `{ Settings, Handler }`).
  type ModuloEct = { Handler: HandlerEct };
  const m = modulo as { ECT?: ModuloEct; default?: ModuloEct & { ECT?: ModuloEct } };
  const ect = m.ECT ?? m.default?.ECT ?? (m.default?.Handler ? m.default : undefined);
  if (!ect) throw new Error('No se pudo cargar la herramienta de búsqueda de la OMS.');

  ect.Handler.configure(
    {
      apiServerUrl: urlProxyCie11(),
      apiSecured: true,
      icdLinearization: 'mms',
      icdMinorVersion: configuracion.release,
      language: 'es',
      popupMode: true,
      autoBind: false,
      wordsAvailable: false,
      chaptersAvailable: false,
      flexisearchAvailable: true,
      sourceApp: 'Policlinica Ahuachapaneca',
    },
    {
      getNewTokenFunction: async () => {
        try {
          return (await obtenerPaseCie11()).token;
        } catch (error) {
          avisarATodos('No se pudo conectar con el buscador de la OMS. Escribe el diagnóstico como texto libre.');
          throw error;
        }
      },
      selectedEntityFunction: (entidad: EntidadSeleccionadaEct) => {
        campos.get(entidad.iNo)?.alSeleccionar(entidad);
      },
    },
  );

  return ect.Handler;
}

/**
 * Si el médico escribió mientras la herramienta cargaba, esas letras no
 * dispararon búsqueda. `bind` termina su inicio por su cuenta y sin avisar, así
 * que se revisa cada medio segundo (hasta ~8 s) y, si el campo sigue con texto
 * y sin sugerencias, se busca lo escrito una sola vez.
 */
function relanzarLoEscrito(handler: HandlerEct, iNo: string): void {
  let intentos = 0;
  const revisar = window.setInterval(() => {
    intentos += 1;
    const campo = document.querySelector<HTMLInputElement>(`input.ctw-input[data-ctw-ino="${iNo}"]`);
    const ventana = document.querySelector<HTMLElement>(`.ctw-window[data-ctw-ino="${iNo}"]`);
    const conSugerencias = Boolean(ventana?.innerText.trim());

    if (!campo || conSugerencias || intentos > 16) {
      window.clearInterval(revisar);
      return;
    }
    // Cada 2 s: si la herramienta aún no terminaba de iniciar, ignora la búsqueda.
    if (intentos % 4 === 3 && document.activeElement === campo && campo.value.trim().length >= 3) {
      handler.search(iNo, campo.value);
    }
  }, 500);
}

/** Empieza a cargar la herramienta antes de que el médico llegue al diagnóstico. */
export function precargarEct(): void {
  preparacion ??= preparar();
  preparacion.catch(() => {
    preparacion = null;
  });
}

/**
 * Enlaza la herramienta a un campo ya montado (input `.ctw-input` y div
 * `.ctw-window` con el mismo `data-ctw-ino`). Devuelve la función para soltarlo.
 */
export async function enlazarCampoCie11(iNo: string, manejadores: ManejadoresCampo): Promise<() => void> {
  campos.set(iNo, manejadores);

  try {
    preparacion ??= preparar();
    const handler = await preparacion;
    // La ECT no tiene "unbind": un mismo campo se enlaza una sola vez.
    if (!enlazados.has(iNo)) {
      handler.bind(iNo);
      enlazados.add(iNo);

      relanzarLoEscrito(handler, iNo);
    }
  } catch {
    preparacion = null;
    manejadores.alError('El buscador de la OMS no está disponible. Escribe el diagnóstico como texto libre.');
  }

  // Solo suelta su propio registro: en desarrollo React monta dos veces y la
  // limpieza tardía del primer montaje no debe borrar la del segundo.
  return () => {
    if (campos.get(iNo) === manejadores) campos.delete(iNo);
  };
}
