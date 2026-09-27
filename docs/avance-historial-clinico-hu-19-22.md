# Avance de HU-19 y HU-22 — qué deben saber los demás

> Rama: `feature/hu-sprint2-kath`. Todo el trabajo es **solo frontend, con datos
> simulados**. No se tocó `backend/`, no se creó ni ejecutó ninguna migración y
> no se modificó la base de datos compartida.

## 1. Resumen

| HU | Qué se avanzó | Qué falta |
|---|---|---|
| **HU-19** Examen físico (Katherinne) | Campo de texto libre en `ConsultaPage`. Al finalizar la consulta, el examen físico queda asociado al paciente y se ve en su expediente. | Backend: columna `consulta.examen_fisico` y endpoint para guardarla. Conectar `ConsultaPage` a la consulta real. |
| **HU-22** Historial de diagnósticos y tratamientos (Katherinne) | Vista completa: línea de tiempo por consulta con diagnósticos, plan de manejo y examen físico; orden invertible; estados de carga, vacío y error; se abre desde el expediente o desde la consulta. | Backend: tablas de diagnóstico y plan, y el endpoint del historial. Depende de HU-20, 21 y 44. |

Cómo funciona de punta a punta hoy (con mock): el médico atiende en
`/medico/consulta/:id` → escribe examen físico, diagnóstico y plan → finaliza →
esa consulta aparece de inmediato en `/medico/expediente/:pacienteId` como la
más reciente del paciente.

## 2. Contrato de datos (lo que todos deben respetar)

Archivo: `frontend/src/types/historial.types.ts`. Los nombres siguen las
migraciones existentes (snake_case) y `medicoNombre` / `especialidadNombre` como
en `ConsultaResource`. Las fechas van como `YYYY-MM-DD HH:mm:ss`.

- **`ConsultaHistorial`**: `id`, `paciente_id`, `cita_id`, `fecha_hora_inicio`,
  `fecha_hora_fin`, `medico_id`, `medicoNombre`, `especialidad_atencion_id`,
  `especialidadNombre`, `motivo_consulta`, `examen_fisico`, `diagnosticos[]`,
  `plan_manejo`.
- **`DiagnosticoConsulta`**: `id`, `consulta_id`, `codigo_cie10` (null si es
  texto libre), `descripcion`, `es_texto_libre`. Una consulta puede tener varios.
- **`PlanManejo`**: `id`, `consulta_id`, `indicaciones`. Uno por consulta.
- **`examen_fisico`**: texto libre, sin estructura por región ni sistema corporal.

## 3. Para cada HU relacionada

### HU-20 Registro de diagnóstico (Rene)
- **Ya hay:** el tipo `DiagnosticoConsulta` y cómo se muestra (insignia con el
  código CIE-10 o "Texto libre").
- **Hoy:** `ConsultaPage` solo tiene un textarea "Diagnóstico clínico". Al
  finalizar se guarda como **un** diagnóstico de texto libre
  (`desdeConsultaAtendida` en `services/historial/historial.service.ts`).
- **Te toca:** el formulario real (varios diagnósticos por consulta) y
  reemplazar ese textarea. Cuando lo hagas, ajusta `desdeConsultaAtendida` para
  leer tu lista en vez del texto único.
- **Backend pendiente:** tabla `diagnostico` (sección 5) y su endpoint de escritura.

### HU-44 Catálogo CIE-10 (Luis)
- **Ya hay:** `codigo_cie10` en el contrato; la tarjeta ya distingue catálogo de
  texto libre; el mock incluye códigos reales de ejemplo (I10, J06.9, N76.0…).
- **Te toca:** el selector con búsqueda dinámica y el respaldo a texto libre.
  Si el diagnóstico viene del catálogo: `es_texto_libre = false` y `codigo_cie10`
  con valor; si es libre: `codigo_cie10 = null`.
- **Backend pendiente:** tabla `catalogo_diagnostico` con la carga del CIE-10 y
  el endpoint de búsqueda.

### HU-21 Plan de manejo (Luis)
- **Ya hay:** el tipo `PlanManejo` y su presentación en la línea de tiempo. Si
  no hay plan, la vista muestra "Sin plan de manejo registrado".
- **Hoy:** `ConsultaPage` tiene un textarea "Plan de atención" que se guarda como
  el plan de la consulta.
- **Te toca:** el formulario real, que según el criterio exige tener antes al
  menos un diagnóstico de la misma consulta.
- **Backend pendiente:** tabla `plan_manejo` (una fila por consulta) y su endpoint.

### HU-28 Historial durante la consulta (Miguel)
- **Reutiliza:** `components/expediente/HistorialDiagnosticos.tsx`. Solo recibe
  `pacienteId` (prop `pacienteId: string`), así que se puede embeber en
  `ConsultaPage` sin más.
- **Hoy:** `ConsultaPage` tiene un enlace "Ver historial del paciente" que abre
  el expediente en otra pestaña. Puedes reemplazarlo por el componente embebido.
- **Cambios en el mock de la sala de espera que debes conocer:**
  - `PacienteConsulta` ahora tiene `pacienteId` (paciente real de `mockPacientes`)
    y opcionalmente `medicoId`, `medicoNombre`, `especialidadNombre`.
  - Los pacientes de prueba pasaron a ser Carlos Eduardo Mendoza, Luis Fernando
    Portillo y Ana Gabriela Gómez (antes eran nombres sueltos sin expediente real).
  - La clave de `sessionStorage` cambió a `policlinica-demo-consulta-v2`.

### HU-26 y HU-27 Expediente único y búsqueda (Dennis)
- **`ExpedientePage`** ahora tiene: selector de paciente (reutiliza
  `SelectorPacienteAutocomplete`, que ya busca por nombre, expediente y DUI) y la
  ruta `/medico/expediente/:pacienteId`. El botón "Nuevo Registro" sigue sin
  acción, como estaba.
- **Para tus pestañas:** la sección de historial es autocontenida
  (`<HistorialDiagnosticos pacienteId={...} />`); puedes meterla como una pestaña
  sin tocar su interior.
- **Backend pendiente:** hoy `routes/api.php` **no tiene rutas de pacientes**.
  Todo el frontend usa `mockPacientes`.

### HU-24 y HU-42 Registro de pacientes y numeración (Mario, Dennis)
- El historial se enlaza por `paciente_id` (UUID). Los expedientes de prueba
  usan el formato `XX00-2026`.
- Cuando existan los pacientes reales, hay que quitar en
  `historial.service.ts` la validación contra `mockPacientes` (tiene su `TODO`).

### Quien conecte la consulta real (HU-39, HU-18 y siguientes)
- `SalaEsperaPage` y `ConsultaPage` siguen usando `consulta.mock.service.ts`, no
  los endpoints reales (`POST /citas/{cita}/consulta`, `GET /consultas/{id}`,
  `PATCH /consultas/{id}/finalizar`).
- Al conectarlas, desaparece la mezcla que hace `getHistorialPaciente` con
  `consultasService` (tiene su `TODO`): las consultas finalizadas vendrán del
  backend.

## 4. Archivos creados o modificados

**Nuevos**
- `types/historial.types.ts` — contrato de datos.
- `services/historial/historial.service.ts` — mock con `TODO` de la llamada real.
- `hooks/historial/useHistorial.ts` — `useHistorialPaciente`, `historialKeys`.
- `components/expediente/HistorialDiagnosticos.tsx` y `ConsultaHistorialCard.tsx`.

**Modificados**
- `services/mockData.ts` — `mockConsultasHistorial` (datos ficticios).
- `services/medico/consulta.mock.service.ts` y `types/consulta.ts` — vínculo con
  el paciente del sistema.
- `views/medico/ExpedientePage.tsx`, `views/medico/ConsultaPage.tsx`, `App.tsx`.

## 5. Backend pendiente (propuesta — nada de esto está creado)

Todo es **aditivo**: tablas nuevas y una columna nullable. No se modifica ni se
elimina nada existente, y las filas actuales de `consulta` quedan intactas. Las
migraciones deben ser archivos nuevos (no se editan las que ya corrieron). Estilo
de las existentes: `id_<tabla>` UUID, snake_case, `restrictOnDelete` hacia
`consulta`, `cascadeOnUpdate`.

### 5.1 Columna nueva — HU-19
`consulta.examen_fisico` `TEXT NULL`, con `down()` que la elimina.

Endpoint sugerido: `PUT /consultas/{consulta}/examen-fisico`, solo rol `MEDICO`,
solo el médico dueño de la consulta y mientras esté abierta (igual que
`finalizar`), con validación `nullable|string|max:5000`. Agregar el campo a
`$fillable` del modelo y a `ConsultaResource`.

### 5.2 Tabla `catalogo_diagnostico` — HU-44
| Columna | Tipo | Notas |
|---|---|---|
| `id_catalogo_diagnostico` | uuid, PK | |
| `codigo_cie10` | string(10), único | Ej. `I10`, `J06.9`. |
| `descripcion` | string(255) | Índice para búsqueda. |
| `activo` | boolean, default true | |

### 5.3 Tabla `diagnostico` — HU-20
| Columna | Tipo | Notas |
|---|---|---|
| `id_diagnostico` | uuid, PK | |
| `id_consulta` | uuid, FK → `consulta.id_consulta` | `restrictOnDelete`. Índice. |
| `id_catalogo_diagnostico` | uuid NULL, FK → `catalogo_diagnostico` | `nullOnDelete`. Null si es texto libre. |
| `descripcion` | string(500) | Siempre se guarda (copia del catálogo o texto libre) para que el historial no cambie si el catálogo se actualiza. |
| `es_texto_libre` | boolean, default false | |

Regla a validar en backend: si `es_texto_libre = false`, el catálogo es obligatorio.

### 5.4 Tabla `plan_manejo` — HU-21
| Columna | Tipo | Notas |
|---|---|---|
| `id_plan_manejo` | uuid, PK | |
| `id_consulta` | uuid, único, FK → `consulta.id_consulta` | Un plan por consulta. |
| `indicaciones` | text | |

Regla a validar en backend: solo se registra si la consulta ya tiene al menos un
diagnóstico (criterio de HU-21).

### 5.5 Endpoint de lectura — HU-22
`GET /pacientes/{paciente}/historial-clinico`
- Roles: `MEDICO` y `RECEPCIONISTA` (el expediente es visible completo para ambos).
- Devuelve las consultas **cerradas** del paciente, de la más reciente a la más
  antigua, con `diagnosticos`, `plan_manejo` (o `null`) y `examen_fisico`, en la
  forma de `ConsultaHistorial`. Envoltorio `{ success, message, data }`.

### 5.6 Rutas de pacientes — HU-24, HU-27
No existen. El historial del paciente depende de ellas.

## 6. Cómo probarlo a mano

1. Iniciar sesión como médico y abrir `/medico/expediente`.
2. Elegir a **Carlos** (3 consultas), **Juan** (una sin plan de manejo), **Sofía**
   (una) o **Luis** (sin historial, muestra el estado vacío). Probar el botón de
   orden y desplegar "Examen físico".
3. Ir a `/medico/sala-espera`, atender a **Carlos**, escribir examen físico,
   diagnóstico y plan, y finalizar. Abrir su expediente: la consulta nueva
   aparece primero con esos datos.
4. Desde `ConsultaPage`, "Ver historial del paciente" abre el expediente en otra
   pestaña.
5. El botón de reiniciar de la sala de espera devuelve la demo al estado inicial.

## 7. Limitaciones conocidas del mock

- El estado de la sala de espera vive en `sessionStorage`: se pierde al cerrar la
  pestaña.
- Al finalizar, viajan al historial el motivo, examen físico, diagnóstico y plan.
  La anamnesis, las observaciones y los signos vitales de `ConsultaPage` **no** se
  incluyen en el historial (no forman parte de HU-19 ni de HU-22).
- La especialidad de una consulta finalizada en la demo se toma del `cargo` del
  médico en sesión. La real vendrá de la especialidad elegida al iniciar la
  consulta (HU-39).
- Los datos de `mockConsultasHistorial` son ficticios, solo para desarrollo.
