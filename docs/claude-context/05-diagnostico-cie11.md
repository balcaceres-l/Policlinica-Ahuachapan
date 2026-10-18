# 05 · Diagnóstico con CIE-11 de la OMS (HU-20, HU-44)

> Decisión tomada con Katherinne el 2026-10-17. Reemplaza al catálogo CIE-10 en base
> de datos que existió entre el 13 y el 17 de octubre. No reabrir sin preguntar.

## Qué se implementó

El médico escribe el diagnóstico en español y la **herramienta de búsqueda oficial de la
OMS** (Embedded Coding Tool, paquete `@whoicd/icd11ect` 1.8.0) le sugiere diagnósticos de
la **CIE-11**, con su nombre oficial en español y su código.

- **Si elige una sugerencia:** se guarda la categoría, es decir, el código, el nombre en
  español, la URI Foundation, la URI de linearización y el release (ej. `2026-01`). No se
  guardan bloque ni capítulo.
- **Si no elige ninguna, o no hay conexión:** lo que escribió se guarda como **texto libre**
  (HU-44, criterio 55).
- **Elementos sin código** (agrupaciones de la jerarquía): no se pueden guardar. El campo
  avisa que elija algo más específico y el backend lo rechaza (422).
- **Bloque y capítulo:** se piden bajo demanda a la OMS con la URI guardada, en español, y
  se guardan en caché 30 días (`GET /api/cie11/jerarquia?uri=`).
- **No hay base propia de diagnósticos.** La tabla `catalogo_cie10` se eliminó. Los
  diagnósticos anteriores con código CIE-10 quedan como texto libre.

## Por qué así

- **Actualizada:** la CIE-11 es la clasificación que la OMS sigue manteniendo, con una
  versión por año (vigente: 2026-01). La CIE-10 quedó cerrada en 2019.
- **En español:** la API de la OMS solo ofrece la CIE-10 en inglés. Lo verificamos el
  2026-10-17: pedir la CIE-10 en español responde `404 Not available in the requested
  language`. En cambio, la CIE-11 sí está en español.
- **Nota legal:** los acuerdos del MINSAL que encontramos piden codificar "según la CIE-10"
  (por ejemplo, el Acuerdo 1538 de 2016, art. 22). El cambio a CIE-11 lo decidió el equipo y
  conviene comunicarlo al cliente o al docente. Los códigos son distintos: la faringitis
  aguda es `CA02.Z` en CIE-11 y `J02.9` en CIE-10.

## Seguridad: el token de la OMS nunca llega al navegador

```
Navegador (ECT) ──pase propio 15 min──▶ /api/oms-icd/...  ──token OMS──▶ id.who.int
                                         (proxy en Laravel)
```

- La herramienta no habla con la OMS: su `apiServerUrl` es nuestro proxy `/api/oms-icd`.
- Su `getNewTokenFunction` entrega un **pase propio**: un JWT HS256 firmado con una clave
  derivada de `APP_KEY`, válido 15 minutos (`PaseProxyIcd`). La herramienta exige un JWT
  porque lee el vencimiento (`exp`). Lo emite `GET /api/cie11/pase`, solo para médicos con
  sesión iniciada.
- El proxy valida el pase y que el usuario siga activo y sea médico. Luego agrega el token
  OAuth2 de la OMS (en caché mientras es válido) y reenvía solo rutas `icd/release/11/` e
  `icd/entity`. Si alguien copiara el pase, no podría usar la API de la OMS: solo nuestro
  proxy, con límite y por 15 minutos.
- **Límite:** 240 peticiones por minuto por médico (`ICD_PROXY_LIMITE`). La herramienta
  espera a que el médico haga una pausa: en las pruebas, escribir 16 letras generó una sola
  búsqueda.
- **Estadísticas:** la herramienta intenta enviar a la OMS lo buscado y lo elegido
  (`analytics/clientanalytics`). El proxy responde 204 y no las reenvía.
- **Textos de la interfaz:** `languageresources/*.json` se piden sin pase. Son públicos y se
  sirven desde caché con límite por IP.
- El *client secret* solo vive en el `.env` del backend. Se verificó que no aparece en el
  build del frontend.
- **Privacidad:** el campo avisa que no se escriban datos del paciente, porque el texto se
  consulta en la OMS.

## Configuración

En el `.env` del backend (ver `.env.example`):

| Variable | Desarrollo | Producción |
|---|---|---|
| `ICD_API_URL` | `https://icd11restapi-developer-test.azurewebsites.net` (sin autenticación, contenido posiblemente incompleto) | `https://id.who.int` |
| `ICD_API_SECURED` | `false` | `true` |
| `ICD_CLIENT_ID` / `ICD_CLIENT_SECRET` | no hacen falta | de https://icd.who.int/icdapi ("View API access key") |
| `ICD_PROXY_MINUTOS` | 15 | 15 |
| `ICD_PROXY_LIMITE` | 240 | 240 |

**PHP en Windows sin certificados raíz:** si las llamadas a la OMS fallan con `cURL error 60`,
falta `curl.cainfo` en el `php.ini`. Se puede pasar por comando:
`php -d curl.cainfo="C:/Program Files/Git/mingw64/etc/ssl/certs/ca-bundle.crt" -d openssl.cafile="C:/Program Files/Git/mingw64/etc/ssl/certs/ca-bundle.crt" ...`
O agregar esas dos líneas al `php.ini`. En un VPS Linux no hace falta.

## Archivos

- **Backend:**
  - `app/Services/ClienteIcdOms.php`: token OAuth2 en caché y reenvío.
  - `app/Services/PaseProxyIcd.php`
  - `app/Http/Controllers/Api/Cie11ProxyController.php`
  - `app/Http/Controllers/Api/Cie11Controller.php`: pase, configuración y jerarquía.
  - Migración `2026_10_17_100000_migrar_diagnostico_a_cie11.php`.
  - `tests/Feature/Api/Cie11Test.php` y `DiagnosticoTest.php`.
- **Frontend:**
  - `lib/ect.ts`: carga bajo demanda, configuración única y enlace por campo.
  - `components/medico/BuscadorCie11.tsx`
  - `components/medico/DiagnosticosConsulta.tsx`
  - `lib/diagnostico.ts`
  - `services/cie11/`, `types/cie11.types.ts`
  - `styles/ect.css`: corrige la sangría de listas que quita Tailwind.

## Detalles de la herramienta que costaron (para no repetirlos)

- Con Vite, el paquete llega como `default = { Settings, Handler }`, no como `ECT`.
- Con `autoBind: false` hay que llamar `Handler.bind(iNo)` cuando el campo ya existe.
  `bind` termina su inicio por su cuenta y sin avisar: lo escrito antes de eso se
  relanza con `Handler.search` (ver `relanzarLoEscrito`). Además se precarga al abrir la
  consulta.
- En desarrollo React monta dos veces: la limpieza del primer montaje no debe borrar el
  registro del segundo.
- El desplegable no se cierra al hacer clic fuera: se oculta al elegir o con Escape, y
  vuelve al escribir.
