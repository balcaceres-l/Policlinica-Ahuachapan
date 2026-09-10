# 04 · Hallazgos Pendientes

> Registro acumulativo de desalineaciones entre el código y los criterios
> reales de una HU, aunque esa HU esté marcada como "hecha" en
> `02-estado-backlog.md`. Cuando encuentres una, documéntala aquí en vez de
> corregirla sin avisar — salvo que el usuario te pida explícitamente
> arreglarla. No borres hallazgos ya resueltos: márcalos como
> **Resuelto (fecha)** y déjalos, para que quede historial.

---

## HU-07 — Registro de especialidades médicas (EP-03)

**Estado: ⚠️ parcial.** Se documentó antes como "funcional con mock", pero
al revisar el código contra los criterios reales de la HU-07, falta trabajo.

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
