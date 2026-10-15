# 04 · Hallazgos Pendientes

> Registro acumulativo de desalineaciones entre el código y los criterios
> reales de una HU, aunque esa HU esté marcada como "hecha" en
> `02-estado-backlog.md`. Cuando encuentres una, documéntala aquí en vez de
> corregirla sin avisar — salvo que el usuario te pida explícitamente
> arreglarla. No borres hallazgos ya resueltos: márcalos como
> **Resuelto (fecha)** y déjalos, para que quede historial.

---

## HU-07 — Registro de especialidades médicas (EP-03)

**Estado: Resuelto (2026-09-26).** Verificado en el código: existen
`actualizarEspecialidad` y `cambiarEstadoEspecialidad` en
`especialidad.service.ts` y los botones de editar y activar/desactivar en
`EspecialidadesPage.tsx`. El texto de abajo se conserva como historial.

**Lo que sí cumple:**
- Formulario de registro (nombre + descripción opcional). ✅
- Validación de duplicados por nombre antes de guardar. ✅
- Toda especialidad nueva queda con estado `ACTIVA` por defecto. ✅

**Lo que NO cumple:**
- ❌ **No se puede editar** el nombre ni la descripción de una especialidad
  ya registrada. `especialidad.service.ts` no tiene una función
  `actualizarEspecialidad`, y `EspecialidadesPage.tsx` no tiene botón ni
  modal de edición — el único botón que existe es "Nueva Especialidad".
- ❌ **No se puede marcar como "Inactiva".** La columna "Estado" en la
  tabla de `EspecialidadesPage.tsx` es puramente decorativa: siempre
  muestra "Activa" porque no existe ninguna acción ni función de servicio
  que cambie ese valor (no hay `cambiarEstadoEspecialidad`).

**Por qué no se arregla ahora:** la prioridad activa del sprint es EP-04
(ver `03-plan-agendamiento.md`). Este hallazgo queda documentado para
cuando se retome EP-03.

**Cuando se retome, esto es lo que falta (en este orden):**
1. Agregar `actualizarEspecialidad(id, payload)` a
   `especialidad.service.ts`, mismo patrón mock que `crearEspecialidad`
   (con su propio `// TODO:` de la llamada real `PUT /especialidades/{id}`
   — el backend ya tiene este endpoint listo, ver `EspecialidadController`).
2. Agregar `cambiarEstadoEspecialidad(id, estado)` al mismo servicio.
3. Agregar botones de editar/activar-desactivar en una columna "Acciones"
   de `EspecialidadesPage.tsx`, con el mismo patrón visual que
   `ListaUsuariosPage.tsx` (íconos `ri-pencil-line` para editar,
   `ri-forbid-line` / `ri-checkbox-circle-line` para el estado).
4. Reutilizar `especialidadSchema` (con los mismos campos) para el
   formulario de edición, igual que `EditarUsuarioModal.tsx` reutiliza el
   esquema de `NuevoUsuarioModal.tsx`.

---

## HU-08 — Asociación de médicos a especialidades (EP-03)

Verificado contra criterios: **cumple todos.** Filtra correctamente por rol
Médico (vía `useMedicos()`), permite múltiples especialidades por médico,
búsqueda por nombre/cargo funcional. Sin hallazgos.

---

## HU-09 — Catálogo de especialidades (EP-03)

Verificado contra criterios: **cumple todos.** Filtra solo especialidades
activas, búsqueda por especialidad o médico, muestra médicos vinculados con
su estado. El criterio de "disponibilidad" (horarios) queda pendiente por
diseño — depende de EP-04, que todavía no existe. No es un hallazgo, es una
dependencia esperada entre épicas.

---

<!--
Agrega hallazgos nuevos debajo de esta línea, con el mismo formato:
## HU-XX — Nombre (EPIC)
Estado, qué cumple, qué no cumple, por qué no se arregla ahora (si aplica),
y los pasos concretos para cuando se retome.
-->

## Sprint 2 — HU marcadas "Finalizada" en Jira que no cumplían (2026-10-13)

**Estado: Resuelto (2026-10-13) en la rama `sprint3-kath`. Migraciones `2026_10_13_*`
corridas en la base compartida el 2026-10-14. Catálogo CIE-10: ver `05-catalogo-cie10.md`.**

Auditoría de las 18 HU del Sprint 2 contra sus criterios y el código de `development`:

- **HU-44 (SCRUM-114) — catálogo CIE-10:** no existía tabla, endpoint ni buscador.
  Ahora: tabla `catalogo_cie10`, `GET /catalogo/cie10` y botón "Buscar código CIE-10"
  en la consulta. Se llena con la lista oficial de códigos de la OMS (CIE-10 2019) y
  descripciones oficiales en español; decisión y razones en `05-catalogo-cie10.md`.
- **HU-20 (SCRUM-113) — diagnóstico:** no había entidad; se escribía dentro del campo
  "Diagnóstico y Plan Clínico" del plan de manejo y el historial devolvía
  `'diagnosticos' => []` fijo. Ahora: tabla `diagnostico` ligada a la consulta, con código
  CIE-10 opcional (sin código es texto libre). Los diagnósticos que ya estaban escritos
  dentro del plan de manejo no se migraron.
- **HU-41 (SCRUM-117) — registro de laboratorio:** no existía nada; `LaboratorioClinicoPage`
  era una pantalla vacía con un botón sin acción. Ahora: tabla `resultado_laboratorio`,
  registro como texto y/o adjunto (imagen o PDF en disco privado).
- **HU-23 (SCRUM-118) — laboratorio cronológico:** leía una constante `MUESTRA` fija por
  UUID de paciente. Ahora lee de la API. Se quitó la tabla de parámetros
  (valor / referencia / alterado), que solo existía en los datos de muestra: el criterio
  pide foto o texto.
- **HU-22, HU-28, HU-26:** arrastraban lo anterior (diagnósticos vacíos, laboratorio de
  muestra). Quedan resueltas con los cambios de arriba.
- **HU-42 (SCRUM-121) — numeración de expediente:** dos registros simultáneos podían
  calcular el mismo número y el segundo terminaba en error de base. Ahora reintenta con el
  siguiente correlativo.
- **Datos simulados eliminados:** `services/mockData.ts`, `consulta.mock.service.ts`, el
  hook legacy `useConsultas()` y `ResultadosLaboratorioHistorial.tsx`.
  `SelectorPacienteAutocomplete` mostraba pacientes falsos cuando la API devolvía vacío.
- **Receta:** imprimía "JVPM: En trámite / Registrado" como texto fijo. Ahora usa
  `users.jvpm`; si el médico no lo tiene, la línea se omite.

Pendientes que no son de código:
- `recetaPdf.ts` trae fijos la dirección, el teléfono y el correo de la policlínica.
  Hay que confirmarlos con el cliente.
- El lint del frontend reporta 7 problemas previos a estos cambios (`AgendarCitaModal`,
  `IndicadorDisponibilidad`, `SignosVitalesModal`, `EspecialidadModal`,
  `EditarPacienteModal`).
- La regla "Solo frontend" de `CLAUDE.md` y la sección "Backend (no se toca)" de
  `00-contexto-proyecto.md` ya no describen cómo se trabaja.

## HU-19 — Examen físico (EP-06, Sprint 2)

**Estado: Resuelto.** El backend ya existe (tabla `examen_fisico`). El texto de abajo se
conserva como historial.

- ✅ Criterio 51: `ConsultaPage.tsx` tiene un campo de texto libre para el examen
  físico, sin estructura por región o sistema.
- ✅ Criterio 52 (a nivel frontend): al finalizar la consulta, el examen físico
  queda asociado al paciente y aparece en su expediente
  (`/medico/expediente/:pacienteId`).
- Falta en backend: columna `consulta.examen_fisico`, endpoint para guardarla y
  conectar `ConsultaPage` a la consulta real. Detalle en
  `docs/avance-historial-clinico-hu-19-22.md`.

## HU-22 — Historial de diagnósticos y tratamientos (EP-07, Sprint 2)

**Estado: Resuelto (2026-10-13)**, ver la sección del Sprint 2 arriba. Historial:
era 🟠 completa en frontend con mock; pendiente de backend. Dependía de
HU-20 (diagnóstico), HU-44 (catálogo CIE-10) y HU-21 (plan de manejo), asignadas
a otras personas, y de sus tablas. `ExpedientePage.tsx` también es el punto de
entrada de HU-26 y HU-27 (Dennis): coordinar para no pisarse.

## Documentación de contexto desactualizada (2026-09-26)

`00-contexto-proyecto.md` afirmaba que existían migraciones de catálogos CIE-10,
diagnósticos, recetas y documentos. No es así: solo existen las tablas listadas
allí ahora. Ya corregido. `03-plan-agendamiento.md` sigue describiendo el
backend de EP-04 como "solo migraciones"; hoy ya tiene controladores y rutas.

## HU-35 — Bloqueo de agenda por ausencia (EP-04)

**Estado: Resuelto (2026-10-02). La migración `bloqueo_agenda_parcial` ya está corrida en la base compartida (lote 3, verificado el 2026-10-14).**

- **Bloqueo parcial:** antes solo existía el día completo (`bloqueo_agenda` no tenía horas y
  `crearBloqueo` rechazaba `PARCIAL` a propósito). Migración nueva
  `2026_10_02_150000_bloqueo_agenda_parcial.php`: `hora_inicio` y `hora_fin` nullable, y la restricción
  única `(id_medico, fecha)` se cambia por un índice normal; los traslapes se validan en
  `BloqueoAgendaController`. Las filas existentes quedan como día completo.
- **Defecto encontrado:** `BloqueoAgendaResource` no devolvía `tipo_bloqueo`, pero la tabla del frontend
  lo leía, así que **todos los bloqueos se veían como "Parcial"**; el filtro por tipo tampoco se aplicaba.
- **Historial:** `BloqueosAgendaPage` tiene pestañas Vigentes/Historial agrupadas por día ("3 médicos
  ausentes"). Sin cambios de base: usa `GET /bloqueos`. Un bloqueo de fecha pasada ya no se puede eliminar.
- **Citas dentro de un bloqueo:** se marcan (`afectada_por_bloqueo`) y se gestionan con
  `CitasAfectadasModal`: reagendar, cancelar o "correr citas" (bloqueo parcial, pacientes ya en la clínica).
- `ReprogramarCitaModal` y `CancelarCitaModal` ahora muestran el mensaje real del backend
  (`extraerMensajeError`) en lugar de "Request failed with status code 409".
