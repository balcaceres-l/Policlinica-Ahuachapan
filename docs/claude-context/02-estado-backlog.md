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
| SCRUM-114 | HU-44 Catálogo estandarizado de diagnósticos | ✅ CIE-11 de la OMS en vivo, en español, con la herramienta oficial de la OMS a través de un proxy del backend; texto libre como respaldo. `components/medico/BuscadorCie11.tsx`, `Cie11ProxyController`. Decisión en `05-diagnostico-cie11.md`. |
| SCRUM-116 | HU-22 Historial de diagnósticos y tratamientos | ✅ API real: `components/expediente/HistorialDiagnosticos.tsx`; ya recibe los diagnósticos. |
| SCRUM-117 | HU-41 Registro de resultados de laboratorio | ✅ API real: tabla `resultado_laboratorio`, `components/expediente/RegistrarResultadoLaboratorioModal.tsx`. |
| SCRUM-118 | HU-23 Consulta cronológica de laboratorio | ✅ API real: `components/expediente/LaboratorioCronologico.tsx`, `views/medico/LaboratorioClinicoPage.tsx`. |
| SCRUM-121 | HU-42 Numeración de expediente | ✅ reintento ante choque del número único en `PacienteController::store`. |
| SCRUM-125 / SCRUM-123 | HU-28 / HU-26 | ✅ la pestaña de laboratorio y los diagnósticos ya salen de la base. |

Fuera de backlog, pedido por el cliente: `users.jvpm` y `users.jvpe` (número de
junta de vigilancia). Se capturan en el formulario de usuarios y la receta
imprime el JVPM del médico.

Las migraciones `2026_10_13_*` ya están corridas en la base local y en la
compartida (lotes 6 y 7, 2026-10-14). La migración `2026_10_17_100000` (paso a CIE-11, elimina
`catalogo_cie10`) está corrida en local; en la compartida se corre **después** de mezclar el PR.

Contrato de datos: `types/historial.types.ts`, `types/laboratorio.types.ts`,
`types/cie11.types.ts`. Endpoints: `docs/API.md`.

## Sprint 3 — Recetas y documentos médicos (en `sprint3-kath`, sin commit todavía)

Se hace el sprint completo, no solo la HU asignada (pedido el 2026-10-18). Detalle de diseño en
`06-documentos-medicos.md`.

| Jira | HU | Estado |
|---|---|---|
| SCRUM-126 | HU-29 Creación de receta | ✅ Ya cumplía los criterios 73 y 74 (sección 5 de `ConsultaPage.tsx`, tabla `receta_medica` ligada a la consulta y visible en el expediente). Sin cambios de lógica. |
| SCRUM-127 | HU-45 Catálogo de medicamentos | ✅ Cerrada como **texto libre** (decisión del equipo, 2026-10-18): el médico escribe cada medicamento en la receta. Cumple el criterio 76 (texto libre sin impedimento). El criterio 75 (seleccionar de un listado estandarizado) se descartó a propósito; no hay tabla ni catálogo de fármacos. |
| SCRUM-128 | HU-30 Receta imprimible | ✅ PDF en el backend con la identidad de la policlínica (`resources/views/documentos/receta.blade.php`). En la consulta, "Exportar / Imprimir PDF" guarda y abre el PDF. |
| SCRUM-129 | HU-31 Constancia médica | ✅ Tabla `constancia_medica`, `components/documento/ConstanciaModal.tsx`, sección 6 de la consulta. |
| SCRUM-130 | HU-32 Referencia médica | ✅ Tabla `referencia_medica`, `components/documento/ReferenciaModal.tsx`. Interna: el PDF lleva el expediente completo. Externa: solo lo escrito. Sin bandeja de recibidas (decidido 2026-10-18). |
| SCRUM-131 | HU-33 PDF e impresión | ✅ Módulo único `App\Services\DocumentoPdf` (dompdf) y `components/documento/VisorDocumentoModal.tsx` con "Imprimir" y "Exportar a PDF", para médico y recepcionista (expediente → "Documentos emitidos"). |

Migraciones `2026_10_18_100000`, `110000` y `110100` corridas en la compartida el 2026-10-18
(solo agregan una columna y dos tablas).

## Pendiente acordado fuera de las HU (2026-10-17)

- ✅ **Horario y bloqueos propios del médico** (2026-10-18, sin commit todavía): en "Mi horario"
  (`views/medico/MiHorarioPage.tsx`) el médico edita su horario semanal (`HorarioModal`),
  bloquea su agenda (`BloqueoAgendaModal` con `medicoFijoId`) y quita sus bloqueos futuros.
  Solo puede hacerlo **si no hay citas agendadas** en ese lapso; si las hay, lo hace la
  recepcionista, porque tiene que contactar a los pacientes. Un cambio de horario que deja
  citas regulares pendientes fuera del horario nuevo no se guarda (decidido 2026-10-18). El
  administrador sí puede (HU-34). Reglas en `HorarioMedicoController`,
  `BloqueoAgendaController` y `AgendaService::citasFueraDeHorario`; pruebas en
  `AgendaPropiaMedicoTest`.
- ✅ **Consulta inmediata** (2026-10-18, sin commit todavía): botón en "Mi agenda" del médico
  (`views/medico/CitasPage.tsx`, `components/medico/ConsultaInmediataModal.tsx`) para atender
  sin cita previa. Busca al paciente o lo registra con el mismo formulario de recepción
  (`NuevoPacienteModal`). `POST /medico/consulta-inmediata` crea una cita `SIN_CITA` a la hora
  actual, sin validar horario ni disponibilidad, y abre la consulta. El paciente que registra el
  médico queda con `paciente.datos_pendientes`; recepción lo ve en el directorio y la marca se
  quita cuando ella guarda el registro. Migración `2026_10_18_100000` corrida en la compartida.

## Ajustes pedidos después del Sprint 3 (2026-10-19, sin commit todavía)

- **Usuarios sin cargo:** el formulario de crear y editar usuario ya no pide el cargo y la
  columna `users.cargo` se elimina (migración `2026_10_19_100000`). En los médicos repetía o
  contradecía sus especialidades; en el resto era solo descriptivo. Donde salía bajo el nombre del
  médico ahora se muestra su **N.º JVPM** (`jvpmDe()` en `lib/utils.ts`), y las búsquedas son por
  nombre o JVPM. El selector de médico por especialidad ya usaba la asociación médico–especialidad.
  **La migración en la compartida se corre al mezclar el PR**: el código de `development` todavía
  envía `cargo` al crear usuarios.

- **Pantalla "Citas" de recepción** (antes "Citas y agendamiento", `views/secretaria/CitasRecepcionPage.tsx`):
  se quitó "Nueva Cita" (agendar se hace solo desde el Calendario global). "Médico con atraso" lleva un
  indicador "!" a su izquierda (`components/ui/InfoTooltip.tsx`). El estado se elige con pestañas con contador
  (Todas · Sala de espera · En atención · Agendadas · Atendidas · Canceladas) en lugar del bloque "Fila de
  atención" y del filtro de estado; la pestaña de sala de espera ordena por médico y turno. Los filtros (fecha,
  médico, tipo, estado, búsqueda y página) viven en la URL (la fecha siempre tiene un día elegido, por defecto hoy; no se puede vaciar) y la tabla pagina de 25 en 25. El selector de médico (`SelectorMedicoCascada`, usado también en agendar y bloquear) ya no muestra "Disponible" en cada médico: solo marca "Inactivo" cuando corresponde. El **turno** se
  numera por médico y por día, así que `components/cita/TurnoBadge.tsx` lo muestra con las iniciales del médico y,
  al hacer clic, dice de quién es. El expediente recibe el origen por `location.state` y su botón "Volver"
  regresa a esa pantalla con los filtros intactos (`views/medico/ExpedientePage.tsx`).
- **Pacientes:** la categoría (menor/adulto) sale siempre de la fecha de nacimiento: se quitó el selector "¿Es menor de edad?" del registro. Quien se registró de menor y cumple 18 pasa a adulto solo (`paciente::actualizarMayoriaDeEdad()`, se corre al listar, ver y editar); queda sin documento, aparece como **"Documento pendiente"** (entra al aviso y al filtro "Ver pendientes" junto con los "Datos pendientes" de los médicos) y la recepcionista le agrega el documento al editarlo, una sola vez. El **documento propio del menor es opcional** (pasaporte): se puede poner al registrarlo o agregar después al editarlo, una sola vez; el del responsable sigue siendo obligatorio. Dirección va en un campo ancho debajo del teléfono; se quitaron los textos entre paréntesis ("Adulto", "Menor de edad", "Por defecto"). El directorio guarda sus filtros en la URL y el expediente abierto desde ahí o desde Citas tiene un "Volver" que regresa con los filtros.
- **Menú de recepción:** se quitó "Expedientes clínicos" porque era la misma lista que "Pacientes". El expediente de un paciente se abre desde Pacientes (botón "Expediente") o desde Citas, en `/secretaria/pacientes/:id` con "Pacientes" resaltado en el menú; las rutas viejas `/secretaria/expediente` y `/secretaria/expedientes` redirigen a Pacientes. El menú del médico conserva su "Expedientes clínicos" (es su único listado de pacientes).
- **Bloqueos de agenda** (`views/secretaria/BloqueosAgendaPage.tsx`): las pestañas son **Hoy** (solo los de hoy, sin filtro de fechas), **Próximos** (de mañana en adelante, con Desde/Hasta) e **Historial** (solo lo que ya pasó; sin fechas muestra únicamente el mes en curso y con Desde/Hasta el rango elegido). El indicador de ausencias dice "del mes" o "en el período elegido" según el caso. Al elegir una especialidad en el selector de médico ya no hay "(Cascada)" ni "Ver todas". Citas afectadas: "Si el paciente ya no quiere la cita, cancélala".
- **Signos vitales:** se exige al menos una medición, en el formulario y en el backend
  (`SignosVitalesController`, 422 con `signos_vitales`).

## Cómo actualizar este archivo

Cuando termines una HU de EP-04, cambia su fila de 🔲 a 🟠 y agrega el
nombre del archivo principal que la implementa (mismo formato que EP-02).
No borres HU ya marcadas ✅ o 🟠 al agregar las nuevas — este archivo es un
registro acumulativo del sprint completo.
