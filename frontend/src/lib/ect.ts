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
      // Solo código y nombre: sin poscoordinación (+), capítulos relacionados
      // (J, K), detalles ni visor de la jerarquía. El sistema guarda un solo
      // código por diagnóstico. Este modo también apaga palabras, capítulos y
      // búsqueda flexible.
      simplifiedMode: true,
      disableHierarchy: true,
      enableKeyboard: false,
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

/** Clase que la herramienta le pone al campo cuando termina su inicio. */
const CLASE_LISTO = 'apiInitializationCompleted';

/**
 * Campos en los que el médico escribió antes de que la herramienta estuviera
 * lista. Solo esos se relanzan: un campo que se vuelve a montar con un
 * diagnóstico ya guardado (por ejemplo al guardar la consulta) no debe abrir
 * sugerencias.
 */
const escritosAntesDeListo = new Set<string>();
document.addEventListener(
  'input',
  (evento) => {
    const campo = evento.target;
    if (
      campo instanceof HTMLInputElement &&
      campo.classList.contains('ctw-input') &&
      !campo.classList.contains(CLASE_LISTO) &&
      campo.dataset.ctwIno
    ) {
      escritosAntesDeListo.add(campo.dataset.ctwIno);
    }
  },
  true,
);

/**
 * Si el médico escribió mientras la herramienta cargaba, esas letras no
 * dispararon búsqueda. `bind` termina su inicio por su cuenta (con la base
 * compartida puede tardar más de 20 s), así que se espera a que el campo tenga
 * `CLASE_LISTO` (hasta 60 s) y, si sigue con texto y sin sugerencias, se busca
 * lo escrito una sola vez. Durante el inicio la herramienta deshabilita el
 * campo y este pierde el foco: si nadie más lo tomó, se le devuelve.
 *
 * Se relanza con un evento `input`, el mismo camino que el teclado:
 * `Handler.search` justo al terminar el inicio no buscaba.
 */
function relanzarLoEscrito(iNo: string): void {
  let intentos = 0;
  const revisar = window.setInterval(() => {
    intentos += 1;
    const campo = document.querySelector<HTMLInputElement>(`input.ctw-input[data-ctw-ino="${iNo}"]`);

    if (!campo || intentos > 200) {
      window.clearInterval(revisar);
      return;
    }
    if (!campo.classList.contains(CLASE_LISTO)) return;

    window.clearInterval(revisar);
    if (!escritosAntesDeListo.delete(iNo)) return;
    const ventana = document.querySelector<HTMLElement>(`.ctw-window[data-ctw-ino="${iNo}"]`);
    const conSugerencias = Boolean(ventana?.innerText.trim());
    const focoLibre = document.activeElement === campo || document.activeElement === document.body;
    if (!conSugerencias && focoLibre && campo.value.trim().length >= 3) {
      campo.focus();
      campo.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, 300);
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

      relanzarLoEscrito(iNo);
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
