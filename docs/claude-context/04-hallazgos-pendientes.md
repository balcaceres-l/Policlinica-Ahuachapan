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

## HU-19 — Examen físico (EP-06, Sprint 2)

**Estado: 🟠 completa en frontend con mock; pendiente de backend.**

- ✅ Criterio 51: `ConsultaPage.tsx` tiene un campo de texto libre para el examen
  físico, sin estructura por región o sistema.
- ✅ Criterio 52 (a nivel frontend): al finalizar la consulta, el examen físico
  queda asociado al paciente y aparece en su expediente
  (`/medico/expediente/:pacienteId`).
- Falta en backend: columna `consulta.examen_fisico`, endpoint para guardarla y
  conectar `ConsultaPage` a la consulta real. Detalle en
  `docs/avance-historial-clinico-hu-19-22.md`.

## HU-22 — Historial de diagnósticos y tratamientos (EP-07, Sprint 2)

**Estado: 🟠 completa en frontend con mock; pendiente de backend.** Depende de
HU-20 (diagnóstico), HU-44 (catálogo CIE-10) y HU-21 (plan de manejo), asignadas
a otras personas, y de sus tablas. `ExpedientePage.tsx` también es el punto de
entrada de HU-26 y HU-27 (Dennis): coordinar para no pisarse.

## Documentación de contexto desactualizada (2026-09-26)

`00-contexto-proyecto.md` afirmaba que existían migraciones de catálogos CIE-10,
diagnósticos, recetas y documentos. No es así: solo existen las tablas listadas
allí ahora. Ya corregido. `03-plan-agendamiento.md` sigue describiendo el
backend de EP-04 como "solo migraciones"; hoy ya tiene controladores y rutas.
