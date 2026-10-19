# API REST — Policlínica Ahuachapaneca

Base: `http://localhost:8000/api`

Headers: `Accept: application/json` y `Authorization: Bearer <token>` en todo salvo el login.

Entrada en `snake_case`, salida en `camelCase`. Toda respuesta:

```json
{ "success": true,  "message": "...", "data": {} }
{ "success": false, "message": "...", "errors": { "campo": ["mensaje"] } }
```

---

## Autenticación

| Método | Ruta | Acceso | Cuerpo |
|---|---|---|---|
| `POST` | `/auth/login` | Público (5/min) | `usuario`, `password` |
| `GET` | `/auth/me` | Autenticado | — |
| `POST` | `/auth/logout` | Autenticado | — |
| `PATCH` | `/auth/change-password` | Autenticado (6/min) | `password_actual`, `password`, `password_confirmation` |

`login` devuelve `{ token, usuario }`. El token expira a 480 minutos.
Cambiar la contraseña revoca las demás sesiones y conserva la actual.

---

## Usuarios — rol `ADMINISTRADOR`

| Método | Ruta | HU | Cuerpo |
|---|---|---|---|
| `GET` | `/usuarios` | HU-06 | query: `rol`, `estado`, `buscar` |
| `POST` | `/usuarios` | HU-03 | `nombre_completo`, `usuario`, `rol`, `telefono?`, `jvpm?`, `jvpe?`, `password` |
| `GET` | `/usuarios/{id}` | — | — |
| `PUT` | `/usuarios/{id}` | HU-04 | igual que POST, **sin** `password` |
| `PATCH` | `/usuarios/{id}/estado` | HU-05 | `estado` |

Los tres filtros del listado son opcionales y combinables. Sin paginación, ordenado por nombre.

El campo `cargo` se eliminó el 2026-10-19 (migración `2026_10_19_100000`): ya no se pide ni se
devuelve. Bajo el nombre del médico las pantallas muestran su N.º JVPM.

- `PUT` no acepta `password`: cambiarla es autoservicio.
- Desactivar revoca los tokens del usuario.
- Un administrador no puede desactivarse a sí mismo (`422`).
- `usuario` es un correo y es único (`422` si se repite).
- `jvpm` y `jvpe` son el número de junta de vigilancia del profesional (médica y de
  enfermería). Opcionales y únicos. La receta imprime el `jvpm` del médico.
- No hay `DELETE`: las cuentas se desactivan.

---

## Especialidades — rol `ADMINISTRADOR`

| Método | Ruta | HU | Cuerpo |
|---|---|---|---|
| `GET` | `/especialidades` | HU-07 | query: `estado` |
| `POST` | `/especialidades` | HU-07 | `nombre`, `descripcion?`, `estado?` |
| `GET` | `/especialidades/{id}` | — | — |
| `PUT` | `/especialidades/{id}` | HU-07 | igual que POST |

`nombre` de 3 a 60 caracteres y único. `descripcion` máx. 200.
`estado` es `ACTIVA` por defecto. Sin `DELETE`: se desactivan con `PUT`.

---

## Médico ↔ Especialidades — rol `ADMINISTRADOR`

| Método | Ruta | HU | Cuerpo |
|---|---|---|---|
| `GET` | `/medicos/{medicoId}/especialidades` | HU-08 | — |
| `POST` | `/medicos/{medicoId}/especialidades` | HU-08 | `especialidadId` |
| `DELETE` | `/medicos/{medicoId}/especialidades/{especialidadId}` | HU-08 | — |

`especialidadId` va en camelCase: es la única entrada que se aparta de la convención.

| Código | Cuándo |
|---|---|
| `201` | Asignada |
| `409` | Ya la tenía asignada |
| `422` | No es médico · médico inactivo · especialidad inactiva |
| `404` | En `DELETE`, si no estaba asignada |

---

## Catálogo — roles `ADMINISTRADOR` y `RECEPCIONISTA`

| Método | Ruta | HU |
|---|---|---|
| `GET` | `/catalogo/especialidades` | HU-09 |

Sin parámetros. Devuelve solo especialidades `ACTIVA`, cada una con sus médicos anidados.

Omite médicos inactivos y `cantidadMedicos` cuenta solo activos — a diferencia de
`/especialidades`, que sí los incluye. Un médico recibe `403`.

---

## Pacientes — roles `RECEPCIONISTA` y `MEDICO`

| Método | Ruta | Acceso | Query / Cuerpo |
|---|---|---|---|
| `GET` | `/pacientes` | Autenticado | query: `buscar`, `estado` (`ACTIVO` [default], `FALLECIDO`, `TODOS`), `categoria` (`TODOS`, `ADULTO`, `MENOR`), `pendientes=1` (solo los que registró un médico y recepción no ha completado) |
| `POST` | `/pacientes` | `RECEPCIONISTA`, `MEDICO` | `nombre_completo`, `fecha_nacimiento`, `direccion?`, si mayor: `dui` (DUI/pasaporte obligatorio), `telefono?`; si menor: datos de responsable (`responsable_nombre`, `responsable_documento`, `responsable_telefono`, `responsable_parentesco`) |
| `GET` | `/pacientes/{id}` | Autenticado | — |
| `PUT` | `/pacientes/{id}` | `RECEPCIONISTA`, `MEDICO` | `nombre_completo`, `direccion?`, si mayor: `telefono?`; si menor: `responsable_nombre`, `responsable_telefono`, `responsable_parentesco`. Nota: `dui`, `fecha_nacimiento` y `numero_expediente` son estrictamente inmutables. |
| `DELETE` | `/pacientes/{id}` | `RECEPCIONISTA`, `MEDICO` | Soft delete: cambia `estado` a `FALLECIDO` |

- Almacenamiento seguro: datos sensibles (`nombre_completo`, `dui`, `telefono`, `direccion`) cifrados con AES-256 en reposo.
- Administrador recibe `403` si intenta registrar, editar o eliminar pacientes.
- Para menores de edad, no se solicita documento ni teléfono propio; se exigen los del responsable (guardando el DUI o pasaporte en `responsable.dui`).
- El número de expediente `XX00-YYYY` se genera automáticamente.
- **Consulta inmediata:** el paciente que registra un `MEDICO` queda con `datos_pendientes: true`;
  pasa a `false` cuando una `RECEPCIONISTA` guarda su registro (`PUT`).
- **Edición de datos**: `dui`/pasaporte y `fecha_nacimiento` permanecen inmutables para resguardar la identidad legal y el expediente del paciente.

---

## Bloqueos de agenda (HU-35) — roles `ADMINISTRADOR`, `RECEPCIONISTA` y `MEDICO`

El `MEDICO` solo crea y elimina bloqueos **de su propia agenda** (`403` si no) y solo si no hay
citas `AGENDADA`/`EN_ESPERA` en ese lapso (`422`; esos los hace recepción, que avisa a los
pacientes). `citas-afectadas` y `correr-citas` siguen siendo de `ADMINISTRADOR` y `RECEPCIONISTA`.

Un bloqueo es de **día completo** (sin horas) o **parcial** (`hora_inicio` y `hora_fin`). Un médico puede
tener varios bloqueos parciales el mismo día, pero no traslapados. Los bloqueos nunca cancelan ni mueven
citas por sí solos: las que quedan dentro se devuelven para que recepción las gestione.

| Método | Ruta | Detalle |
|---|---|---|
| `GET` | `/bloqueos` | query: `medico_id`, `desde`, `hasta` (`YYYY-MM-DD`). **No descarta fechas pasadas**: sirve de historial ("qué médicos faltaron el día X"). Cada bloqueo trae `tipo_bloqueo` (`COMPLETO`/`PARCIAL`), `hora_inicio`, `hora_fin`, `creadoPorNombre` y `citas_afectadas_total` |
| `POST` | `/bloqueos` | `medico_id`, `fecha`, `motivo?`, `hora_inicio?` + `hora_fin?` (ambas o ninguna; fin posterior al inicio). `409` si se traslapa con otro bloqueo del mismo médico. Responde `{ bloqueo, citasAfectadas }` |
| `GET` | `/bloqueos/{id}/citas-afectadas` | Citas `AGENDADA`/`EN_ESPERA` que hoy siguen dentro del bloqueo |
| `PATCH` | `/bloqueos/{id}/correr-citas` | Solo bloqueos parciales. Recorre las citas pendientes en orden y una por una: las afectadas pasan a empezar cuando termina el bloqueo (una detrás de otra, conservando duración y orden) y una cita posterior solo se corre si choca con la anterior; las que ya estaban libres, y las emergencias/sobrecupos fuera del bloqueo, no se tocan. No cae en otro bloqueo del mismo día. Responde `{ citas, fueraDeHorario }` (solo las citas movidas). `422` si es de día completo o no hay citas dentro |
| `DELETE` | `/bloqueos/{id}` | `422` si la fecha ya pasó: un bloqueo pasado es el registro de la ausencia |

- `GET /citas` marca cada cita pendiente con `afectada_por_bloqueo` (bool) y `bloqueo` (`id`, `tipo_bloqueo`, `hora_inicio`, `hora_fin`, `motivo`).
- `GET /agenda/disponibilidad` y el agendado/reprogramado descuentan los bloqueos parciales; `bloqueado: true` solo indica día completo. Las emergencias y sobrecupos siguen ignorando la validación.
- Para reagendar o cancelar una cita afectada se usan los endpoints de siempre: `PATCH /citas/{id}/reprogramar` (con `medico_id` se puede reasignar a otro médico) y `PATCH /citas/{id}/cancelar`.

---

## Citas y Agenda — roles `RECEPCIONISTA`, `ADMINISTRADOR`, `MEDICO`

| Método | Ruta | Acceso | Query / Cuerpo |
|---|---|---|---|
| `GET` | `/citas` | Autenticado | query: `fecha`, `desde`, `hasta`, `medico_id`, `paciente_id`, `estado`. (Médico solo ve su agenda). |
| `POST` | `/citas` | Autenticado | `paciente_id`, `medico_id`, `especialidad_id?`, `fecha`, `hora_inicio`, `hora_fin`, `tipo_cita?` (`REGULAR`, `EMERGENCIA`, `SOBRECUPO`). |
| `GET` | `/agenda/disponibilidad` | Autenticado | query: `medico_id`, `fecha`. Devuelve `{ bloqueado: bool, bloques: [{ hora_inicio, hora_fin }] }`. |
| `PATCH` | `/citas/{id}/reprogramar` | `RECEPCIONISTA`, `ADMINISTRADOR` | `fecha`, `hora_inicio`, `hora_fin`, `medico_id?` (permite reasignar a otro médico si el original falta o no llega), `especialidad_id?`. |
| `PATCH` | `/citas/{id}/cancelar` | `RECEPCIONISTA`, `ADMINISTRADOR` | `motivo_cancelacion` (obligatorio, máx 500). Libera el bloque. |
| `PATCH` | `/citas/{id}/llegada` | `RECEPCIONISTA`, `ADMINISTRADOR` | Pasa la cita a `EN_ESPERA` y asigna orden de llegada correlativo. |
| `PATCH` | `/citas/{id}/mover-al-final` | `RECEPCIONISTA`, `ADMINISTRADOR` | Mueve el paciente en espera al final de la fila. |
| `PATCH` | `/medicos/{id}/agenda/desplazar`| `RECEPCIONISTA`, `ADMINISTRADOR`, `MEDICO` | `fecha`, `minutos`, `desde_hora?`. Corre citas pendientes por atraso del médico. |
| `GET` | `/citas/{id}/signos-vitales` | Autenticado | Obtiene signos vitales (triaje). |
| `PUT` | `/citas/{id}/signos-vitales` | `RECEPCIONISTA`, `MEDICO` | Registra/actualiza signos vitales del paciente para la cita. |
| `POST` | `/medico/consulta-inmediata` | `MEDICO` | `paciente_id`, `especialidad_atencion_id?` (obligatoria si tiene varias), `motivo_consulta?`. Atender **sin cita previa**: crea una cita `SIN_CITA` a la hora actual (sin validar horario ni disponibilidad) y abre su consulta. `422` si el paciente no está activo. |

- `tipo_cita` puede ser además `SIN_CITA`: solo la crea la consulta inmediata, no se agenda con `POST /citas`.

### Horarios (HU-34) — roles `ADMINISTRADOR` y `MEDICO`

| Método | Ruta | Detalle |
|---|---|---|
| `GET` | `/medicos/{id}/horarios` | Autenticado (el médico solo el suyo) |
| `PUT` | `/medicos/{id}/horarios` | Reemplaza la semana completa: `horarios: [{ dia_semana, hora_inicio, hora_fin }]` |
| `POST` | `/medicos/{id}/horarios` | Agrega un tramo |
| `PUT` / `DELETE` | `/horarios/{id}` | Edita o quita un tramo |

El `MEDICO` solo toca **su propio horario** (`403`) y no puede dejar fuera citas regulares
`AGENDADA`/`EN_ESPERA` de hoy en adelante (`422`, con las citas en el mensaje). El
`ADMINISTRADOR` sí puede.

---

## Documentos médicos (HU-30, HU-31, HU-32, HU-33)

| Método | Ruta | Acceso | Query / Cuerpo |
|---|---|---|---|
| `POST` | `/consultas/{id}/constancias` | `MEDICO` que atendió | `motivo` (5–2000). |
| `POST` | `/consultas/{id}/referencias` | `MEDICO` que atendió | `tipo` (`INTERNA`/`EXTERNA`), `motivo`, `especialidad_destino?`. Interna: `medico_destino_id` (médico activo, no uno mismo), `resumen_clinico?`. Externa: `destino` y `resumen_clinico` obligatorios. |
| `GET` | `/referencias/medicos-destino` | `MEDICO` | Médicos activos (menos uno mismo) con sus especialidades. |
| `GET` | `/consultas/{id}/receta/pdf` | `MEDICO`, `RECEPCIONISTA` | PDF de la receta; `404` si no tiene medicamentos. |
| `GET` | `/constancias/{id}/pdf` | `MEDICO`, `RECEPCIONISTA` | PDF de la constancia. |
| `GET` | `/referencias/{id}/pdf` | `MEDICO`, `RECEPCIONISTA` | PDF de la referencia. Interna: incluye el expediente completo. Externa: solo lo escrito. |

- Los PDF se abren en el navegador (`inline`); con `?descargar=1` llegan como adjunto.
- Los genera el backend con dompdf y una sola plantilla (`resources/views/documentos/`); la
  identidad de la policlínica está en `config/clinica.php` (`documentos`) y se cambia en el `.env`.
- `GET /consultas/{id}` y `GET /pacientes/{id}/historial` devuelven `constancias` y `referencias`.

---

## Diagnósticos con CIE-11 de la OMS (HU-20, HU-44)

| Método | Ruta | Acceso | Query / Cuerpo |
|---|---|---|---|
| `GET` | `/cie11/pase` | `MEDICO` (30/min) | Pase de 15 min para el buscador: `{ token, vence }`. **No** es el token de la OMS. |
| `GET` | `/cie11/configuracion` | `MEDICO` | `{ release, idioma, linearizacion }`: versión vigente de la CIE-11 (ej. `2026-01`). |
| `GET` | `/cie11/jerarquia` | Autenticado | query: `uri` (URI de linearización guardada). Devuelve `categoria`, `bloque`, `bloques[]` y `capitulo` en español. Caché de 30 días. |
| `GET`/`POST` | `/oms-icd/{ruta}` | Pase de `/cie11/pase` | Proxy hacia la API de la OMS para la herramienta de búsqueda. Solo `icd/release/11/...` e `icd/entity...`. |
| `PUT` | `/consultas/{id}` | `MEDICO` | Además de lo que ya aceptaba: `diagnosticos: [{ descripcion, codigo_cie11?, uri_foundation?, uri_linearizacion? }]`. |

- Sin `codigo_cie11` ni `uri_linearizacion` el diagnóstico es texto libre.
- Con uno debe venir el otro (`422`). Un elemento de la OMS sin código se rechaza.
- `uri_linearizacion` debe ser `http(s)://id.who.int/icd/release/11/AAAA-MM/mms/...`; el
  release se toma de ahí.
- Enviar `diagnosticos` reemplaza la lista completa; no enviarlo la deja como está.
- `GET /consultas/{id}` y `GET /pacientes/{id}/historial` devuelven `diagnosticos`
  (`id`, `consulta_id`, `codigo_cie11`, `descripcion`, `uri_foundation`,
  `uri_linearizacion`, `release_cie11`, `es_texto_libre`) y `medicoJvpm`.
- **Proxy:**
  - Responde `401` sin pase válido, `429` si se pasa del límite por médico (240/min por
    defecto) y `502`/`503` si la OMS no responde.
  - Las estadísticas de la herramienta (`analytics/...`) se descartan con `204`.

Detalle, seguridad y configuración en `docs/claude-context/05-diagnostico-cie11.md`.

---

## Resultados de laboratorio (HU-41, HU-23)

| Método | Ruta | Acceso | Query / Cuerpo |
|---|---|---|---|
| `GET` | `/pacientes/{id}/laboratorio` | `MEDICO`, `RECEPCIONISTA` | Resultados del paciente, del más reciente al más antiguo. |
| `POST` | `/pacientes/{id}/laboratorio` | `MEDICO` | `multipart/form-data`: `nombre_examen`, `fecha_examen`, `resultado_texto?`, `archivo?`, `consulta_id?`. |
| `GET` | `/laboratorio` | `MEDICO` | Últimos 100 resultados de todos los pacientes. |
| `GET` | `/laboratorio/{id}/archivo` | `MEDICO`, `RECEPCIONISTA` | Devuelve el adjunto. No hay URL pública. |
| `DELETE` | `/laboratorio/{id}` | `MEDICO` | Solo quien lo registró (`403` para los demás). |

- Hace falta `resultado_texto`, `archivo` o ambos (`422` si faltan los dos).
- `archivo`: JPG, PNG, WEBP o PDF, máximo 5 MB. El límite real también depende de
  `upload_max_filesize` de PHP (2 MB por defecto).
- `fecha_examen` no puede ser futura.
- `consulta_id` debe ser una consulta de ese mismo paciente.

---

## Recursos

**UsuarioResource**

```json
{
  "id": 1,
  "nombreCompleto": "Dra. Elena Ramírez Alfaro",
  "usuario": "eramirez@policlinica.com",
  "rol": "ADMINISTRADOR|MEDICO|RECEPCIONISTA",
  "estado": "ACTIVO|INACTIVO",
  "telefono": "2443-1020",
  "fechaRegistro": "2026-09-04"
}
```

**EspecialidadResource**

```json
{
  "id": 1,
  "nombre": "Ginecología",
  "descripcion": "",
  "estado": "ACTIVA|INACTIVA",
  "fechaRegistro": "2026-09-04",
  "cantidadMedicos": 3
}
```

**CatalogoEspecialidadResource** — lo anterior más `medicos: [UsuarioResource]`.

---

## Códigos de error

| Código | Cuándo |
|---|---|
| `401` | Token ausente, vencido o revocado. En el login, credenciales incorrectas |
| `403` | Rol sin permiso, o cuenta inactiva al iniciar sesión |
| `404` | Recurso inexistente — siempre JSON, nunca HTML |
| `409` | Conflicto (asignación duplicada) |
| `422` | Validación, con detalle por campo en `errors` |
| `429` | Límite de peticiones |
| `500` | Error interno, sin stack trace en producción |

Los mensajes de validación llegan en español.

---

## Aún sin implementar

No hay catálogo de medicamentos: por decisión del equipo (2026-10-18), HU-45 se resuelve con
texto libre en `receta.detalles[].nombre_medicamento`.
