# 06 · Documentos médicos (Sprint 3: HU-29 a HU-33)

> Decidido con Katherinne el 2026-10-18. Endpoints en `docs/API.md` ("Documentos médicos").

## Qué hay

- **Receta (HU-29, HU-30):** se escribe en la sección 5 de la consulta (tabla
  `receta_medica` + `detalle_receta`). "Exportar / Imprimir PDF" guarda el progreso y abre el
  PDF que genera el backend. El PDF siempre refleja lo guardado.
- **Constancia (HU-31):** tabla `constancia_medica` (consulta, paciente, médico, motivo). La
  emite el médico que atendió la consulta, abierta o finalizada, desde la sección 6.
- **Referencia (HU-32):** tabla `referencia_medica`.
  - **Interna:** hacia un médico activo de la policlínica (no uno mismo). El PDF lleva la
    referencia y, en otra página, el **expediente completo**: datos del paciente, todas las
    consultas con signos, examen, diagnósticos CIE-11, plan y receta, y el laboratorio.
  - **Externa:** hacia un especialista o institución de fuera. El PDF lleva **solo** lo que el
    médico escribe (motivo e información clínica) más la identificación del paciente.
  - No hay bandeja de "referencias recibidas": solo el documento (decidido 2026-10-18).
- **PDF e impresión (HU-33):** médico y recepcionista. Desde la consulta (sección 6) o desde el
  expediente ("Documentos emitidos" en cada consulta). El visor tiene "Imprimir" (diálogo del
  navegador) y "Exportar a PDF" (descarga).

## Cómo está armado

- **Backend:**
  - `App\Services\DocumentoPdf`: módulo único con dompdf (`barryvdh/laravel-dompdf`). Hoja
    carta, solo las letras usadas de la fuente (sin eso cada PDF pesaba ~900 KB) y el logo
    incrustado.
  - Plantillas en `resources/views/documentos/`: `plantilla` (encabezado y pie), `_paciente`,
    `_firma`, `receta`, `constancia` y `referencia`.
  - Identidad de la policlínica en `config/clinica.php` → `documentos` (RNF-03). El logo está
    en `resources/documentos/logo.png`.
  - `App\Services\HistorialPaciente`: el historial del expediente y el de la referencia interna
    salen del mismo lugar.
  - `DocumentoMedicoController`.
- **Frontend:**
  - `components/documento/` (`VisorDocumentoModal`, `ConstanciaModal`, `ReferenciaModal`,
    `ListaDocumentos`).
  - `hooks/documento/useDocumentos.ts`, `services/documento/documento.service.ts`,
    `types/documento.types.ts` y `lib/validations/documentoSchema.ts`.
  - El PDF se pide con la sesión (`responseType: 'blob'`) y se muestra desde memoria: la API
    exige token, así que no basta abrir la URL.

## Medicamentos (HU-45): texto libre

Decidido con Katherinne el 2026-10-18: los medicamentos de la receta se escriben **a mano**, sin
catálogo de fármacos (ni tabla ni buscador). Se cumple el criterio 76 (texto libre); el 75
(listado estandarizado) se descartó por decisión del equipo. No reabrir sin preguntar.

## Pendiente

- Dirección, teléfono y correo de la policlínica: confirmar con el cliente (ver `04`).
