# Datos de referencia

## `cie10_descripciones_es.csv`

Descripciones en español de la CIE-10, una por código (`codigo,descripcion`).
Las usa `php artisan cie10:sincronizar-oms` para ponerle texto en español a la
lista oficial de códigos que entrega la API de la OMS. Este archivo **no** decide
qué códigos existen: eso lo decide la OMS.

- **Fuente:** Catálogo de diagnósticos CIE-10 (`CAT_DIAGNOSTICOS`) de la Secretaría
  de Salud de México, elaborado por la DGIS y el CEMECE (Centro Mexicano para la
  Clasificación de Enfermedades, centro colaborador de la OPS/OMS para la Familia de
  Clasificaciones Internacionales). Revisión del 16 de abril de 2024.
- **Publicado en:** datos.gob.mx, conjunto "Catálogo CIE-10"
  (https://www.datos.gob.mx/dataset/catalogo_cie_10), mantenido por el Hospital
  Juárez de México.
- **Licencia:** Creative Commons Atribución 4.0 (CC BY 4.0). Se puede usar y
  redistribuir citando la fuente, como se hace aquí.
- **Descargado:** 2026-10-14, con la API `datastore_search` del portal, columnas
  `CATALOG_KEY` y `NOMBRE`.
- **Transformación:**
  - El código pasa a la notación de la OMS: `J029` → `J02.9`, `J00X` → `J00`.
  - Se descartan las filas cuyo código no tiene forma CIE-10 (1 fila: `9999`).
  - El texto se conserva tal cual, en mayúsculas, como lo publica la fuente.
- **Volumen:** 14 485 códigos, unos 1 MB. De los 10 673 códigos registrables de la OMS,
  10 627 encuentran aquí su descripción en español (sincronización del 2026-10-14).

Para regenerarlo con una revisión más nueva de la fuente, se repite la descarga
con el mismo criterio y se vuelve a correr `php artisan cie10:sincronizar-oms`.
