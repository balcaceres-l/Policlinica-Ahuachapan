# 02 · Estado del Backlog (Sprint 1 — 21 HU)

> Última verificación: contra el código real del repo (incluyendo
> `git log`), no contra suposiciones. Actualiza este archivo cada vez que
> termines o modifiques una HU — es el archivo que más cambia de todos.

Leyenda: ✅ terminada end-to-end (API real) · 🟠 terminada con mock,
funcional · ⚠️ marcada como hecha pero con hallazgos (ver
`04-hallazgos-pendientes.md`) · 🔲 no iniciada.

## EP-02 · Autenticación y Gestión de Usuarios — ✅ 100% completo (API real)

| Jira | HU | Estado |
|---|---|---|
| SCRUM-87 | HU-01 Inicio de sesión | ✅ |
| SCRUM-88 | HU-02 Cambio de contraseña | ✅ |
| SCRUM-89 | HU-03 Registro de cuentas | ✅ `NuevoUsuarioModal.tsx` |
| SCRUM-90 | HU-04 Edición de perfil | ✅ `EditarUsuarioModal.tsx` |
| SCRUM-91 | HU-05 Activación/desactivación | ✅ `ConfirmarEstadoModal.tsx` |
| SCRUM-92 | HU-06 Consulta del listado | ✅ |

**No trabajes nada de este bloque.** Ya está conectado a la API real y
probado por el equipo de backend. No lo regreses a mock por ningún motivo.

## EP-03 · Gestión de Especialidades Médicas — 🟠 con mock, parcialmente completo

| Jira | HU | Estado |
|---|---|---|
| SCRUM-93 | HU-07 Registro de especialidades | 🟠 completo (editar y activar/desactivar verificados el 2026-09-26) |
| SCRUM-94 | HU-08 Asociación médicos–especialidades | 🟠 completo |
| SCRUM-95 | HU-09 Catálogo de especialidades | 🟠 completo |

**No es tu tarea trabajar este bloque ahora** (la prioridad activa es
EP-04). HU-07 tenía un hallazgo por falta de edición y activar/desactivar,
ya resuelto (ver `04-hallazgos-pendientes.md`).

## EP-04 · Agendamiento de Citas Médicas — 🔲 ES LO QUE FALTA (12 HU) — PRIORIDAD ACTUAL

| Jira | HU | Descripción | Rol | Estado |
|---|---|---|---|---|
| SCRUM-96 | HU-34 | Configuración de horarios de médicos | Admin | 🟠 `views/admin/HorariosPage.tsx` |
| SCRUM-97 | HU-10 | Agendamiento por calendario global | Recepcionista | 🔲 |
| SCRUM-98 | HU-11 | Agendamiento por flujo de médico | Recepcionista | 🔲 |
| SCRUM-99 | HU-12 | Validación automática de disponibilidad | Recep./Médico | 🔲 |
| SCRUM-100 | HU-36 | Cita de emergencia o sobrecupo | Recepcionista | 🔲 |
| SCRUM-101 | HU-13 | Cancelación de citas | Recepcionista | 🔲 |
| SCRUM-102 | HU-35 | Bloqueo de agenda por ausencia | Recepcionista | ✅ API real: `views/secretaria/BloqueosAgendaPage.tsx` (día completo y parcial, historial, gestión de citas afectadas) |
| SCRUM-103 | HU-14 | Reprogramación de citas | Recepcionista | 🔲 |
| SCRUM-104 | HU-37 | Reubicación de citas por atraso | Recep./Médico | 🔲 |
| SCRUM-105 | HU-15 | Agenda propia del médico | Médico | 🔲 |
| SCRUM-106 | HU-16 | Agendamiento propio por el médico | Médico | 🔲 |
| SCRUM-107 | HU-38 | Alerta de retraso del paciente | Recepcionista | 🔲 |

El backend de esta épica solo tiene las migraciones escritas, sin controlador
ni ruta todavía — por eso todo se construye con mock (Patrón B). El plan
detallado está en `03-plan-agendamiento.md`.

### Decisiones de HU-34 (aplican a toda la épica)

- `dia_semana` usa `'LUNES' | 'MARTES' | 'MIERCOLES' | 'JUEVES' | 'VIERNES' |
  'SABADO' | 'DOMINGO'` — mayúsculas sin tildes, como los demás enums del
  esquema. Definido en `lib/constants/dias.ts`.
- Un médico **puede tener varios bloques el mismo día** (turno partido), pero
  no pueden traslaparse. La validación vive en `horario.service.ts`, no en el
  esquema Zod, porque necesita conocer los demás bloques del médico.
- El horario base de la policlínica (L–V 3:00–6:30 PM, sábados 8:00–12:00 MD)
  **no restringe**: se muestra como texto de ayuda en el formulario. Cada
  médico configura el suyo y dermatología atiende por la mañana.
- Los horarios se pueden eliminar, con modal de confirmación. La tabla
  `horarios_medicos` no tiene columna de estado, así que no se desactivan.

## Sprint 2 — Expediente clínico y consulta

Cierre del sprint en la rama `sprint3-kath` (2026-10-13). Todo con API real y
base de datos; no quedan datos simulados en el frontend (`services/mockData.ts`
y `consulta.mock.service.ts` se eliminaron). Detalle de lo que se encontró en
`04-hallazgos-pendientes.md`.

| Jira | HU | Estado |
|---|---|---|
| SCRUM-112 | HU-19 Examen físico | ✅ API real: tabla `examen_fisico`, sección 2 de `ConsultaPage.tsx`. |
| SCRUM-113 | HU-20 Registro de diagnóstico | ✅ API real: tabla `diagnostico`, `components/medico/DiagnosticosConsulta.tsx` (sección 3 de `ConsultaPage.tsx`). |
| SCRUM-114 | HU-44 Catálogo CIE-10 | ✅ API real: tabla `catalogo_cie10`, `GET /catalogo/cie10`, `components/medico/BuscarCie10Modal.tsx`. Códigos oficiales de la OMS (CIE-10 2019) con descripción en español; se carga con `php artisan cie10:sincronizar-oms`. Decisión en `05-catalogo-cie10.md`. |
| SCRUM-116 | HU-22 Historial de diagnósticos y tratamientos | ✅ API real: `components/expediente/HistorialDiagnosticos.tsx`; ya recibe los diagnósticos. |
| SCRUM-117 | HU-41 Registro de resultados de laboratorio | ✅ API real: tabla `resultado_laboratorio`, `components/expediente/RegistrarResultadoLaboratorioModal.tsx`. |
| SCRUM-118 | HU-23 Consulta cronológica de laboratorio | ✅ API real: `components/expediente/LaboratorioCronologico.tsx`, `views/medico/LaboratorioClinicoPage.tsx`. |
| SCRUM-121 | HU-42 Numeración de expediente | ✅ reintento ante choque del número único en `PacienteController::store`. |
| SCRUM-125 / SCRUM-123 | HU-28 / HU-26 | ✅ la pestaña de laboratorio y los diagnósticos ya salen de la base. |

Fuera de backlog, pedido por el cliente: `users.jvpm` y `users.jvpe` (número de
junta de vigilancia). Se capturan en el formulario de usuarios y la receta
imprime el JVPM del médico.

Las migraciones `2026_10_13_*` ya están corridas en la base local y en la
compartida (lotes 6 y 7, 2026-10-14). El catálogo CIE-10 está cargado en ambas: 10 673
códigos de la OMS (CIE-10 2019), 10 627 con descripción en español.

Contrato de datos: `types/historial.types.ts`, `types/laboratorio.types.ts`,
`types/cie10.types.ts`. Endpoints: `docs/API.md`.

## Cómo actualizar este archivo

Cuando termines una HU de EP-04, cambia su fila de 🔲 a 🟠 y agrega el
nombre del archivo principal que la implementa (mismo formato que EP-02).
No borres HU ya marcadas ✅ o 🟠 al agregar las nuevas — este archivo es un
registro acumulativo del sprint completo.
