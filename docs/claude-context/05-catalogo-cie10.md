# 05 · Catálogo CIE-10 (HU-44): qué se implementó y por qué

> Decisión tomada con Katherinne el 2026-10-14. No reabrir sin preguntar.

## Qué se implementó

El médico registra el diagnóstico escribiendo los síntomas o el diagnóstico y, con
el botón **"Buscar código CIE-10"**, le asigna el código. Del catálogo **solo se usa
el código**; si no lo encuentra, el diagnóstico queda como texto libre.

El catálogo (`catalogo_cie10`) se arma así:

1. **Lista de códigos: la OMS.** `php artisan cie10:sincronizar-oms` lee la
   CIE-10 versión 2019 de la API oficial de la OMS (https://icd.who.int/icdapi).
   Solo entran los códigos que se pueden registrar, es decir, las categorías sin
   subdivisiones. Los encabezados como `J02` no entran, porque se usa `J02.0` o `J02.9`.
   Ojo: la API marca como `modifiedcategory` (no `category`) los códigos que heredan
   subdivisiones compartidas del bloque, como `E11.9` (de E10–E14) o `V01.0`. También son
   registrables y el comando los incluye; la primera versión del comando los omitía.
2. **Texto en español: fuente oficial en español, cruzada por código.**
   `backend/database/data/cie10_descripciones_es.csv` (CEMECE/Secretaría de Salud de
   México, CC BY 4.0; detalle en `backend/database/data/README.md`). Si un código de
   la OMS no tiene traducción, se guarda con el título oficial de la OMS.
3. **Se guarda también** el título oficial de la OMS en inglés (`titulo_oms`) y la
   versión de la que salió (`version_oms`). El buscador encuentra por ambas descripciones.

Los códigos del archivo en español que la OMS no tiene se descartan. Los diagnósticos
ya registrados guardan su código y no dependen del catálogo, así que volver a
sincronizar no los altera.

## Por qué así

- **La ley exige CIE-10, no CIE-11.** Los acuerdos ejecutivos del MINSAL ordenan
  codificar "según la CIE-10" y registrar en el SIMMOW: Acuerdo 1538 (2016), art. 22;
  lineamientos de 2020, 2024 y 2025. No encontramos norma salvadoreña que adopte la
  CIE-11. Los códigos de la CIE-11 son distintos (no existe `J02.9`), así que usarla
  incumpliría la norma vigente.
- **La OMS es la dueña de la clasificación.** Su lista de códigos es la más oficial que
  existe. La versión 2019 es la **final** de la CIE-10: la OMS ya no la revisa, salvo
  correcciones puntuales. Por eso "estar al día" en CIE-10 significa tener la 2019.
- **La OMS no publica la CIE-10 en español.** La API solo la ofrece en inglés; en
  español solo tiene la CIE-11. Con descripciones en inglés el médico no encontraría
  nada escribiendo síntomas en español. Por eso el texto en español viene de otra
  fuente oficial, cruzada por código.
- **Por qué esa fuente en español:**
  - El MINSAL no publica un catálogo CIE-10 descargable.
  - La CIE-10 en línea de la OPS (https://ais.paho.org/classifications/chapters/) es
    oficial, pero estática (archivos de 2009) y con derechos de reproducción reservados.
  - El catálogo del CEMECE está actualizado (2024), es de un centro colaborador
    designado por la OPS/OMS y su licencia permite usarlo.
- **Por qué cargarlo en la base y no consultar la API en vivo:** la clínica puede
  quedarse sin internet, y cada búsqueda sería una llamada externa con credenciales.
  La API solo se usa al sincronizar.

## Cómo se mantiene

- **Credenciales:** `ICD_CLIENT_ID` e `ICD_CLIENT_SECRET` en el `.env` del backend.
  Se obtienen en https://icd.who.int/icdapi ("View API access key"). Nunca se
  versionan.
- **Sincronizar:** `php artisan cie10:sincronizar-oms`. Opciones:
  - `--release` (por defecto `ICD10_RELEASE=2019`).
  - `--descripciones` (ruta de otro CSV en español).
  - `--paralelas` (peticiones simultáneas; por defecto 8).
  - `--minimo` (si la OMS devuelve menos códigos que esto, no toca la base).
- **Corrección de la OMS o nueva revisión del CEMECE:** se vuelve a correr el comando,
  o se regenera el CSV y luego se corre.
- **PHP en Windows sin certificados raíz:** si falla con
  `unable to get local issuer certificate`, el `php.ini` no tiene `curl.cainfo`. Se
  puede pasar por comando sin tocar el `php.ini`:
  `php -d curl.cainfo="C:/Program Files/Git/mingw64/etc/ssl/certs/ca-bundle.crt" -d openssl.cafile="C:/Program Files/Git/mingw64/etc/ssl/certs/ca-bundle.crt" artisan cie10:sincronizar-oms`
- `php artisan cie10:importar <archivo.csv>` sigue disponible para cargar un catálogo
  desde un CSV propio, por ejemplo si el MINSAL entrega el suyo.

## Camino a la CIE-11

La CIE-11 es la clasificación que la OMS sí actualiza cada año (última versión:
2026-01). Está en la misma API, **en español** y con búsqueda por texto. Cuando el
MINSAL la adopte:

- Se agrega un comando de sincronización para la CIE-11.
- La tabla ya separa el código, la descripción, el título oficial y la versión.
- Los diagnósticos guardados con CIE-10 conservan su código.
