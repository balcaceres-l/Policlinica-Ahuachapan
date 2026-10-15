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
| `POST` | `/usuarios` | HU-03 | `nombre_completo`, `usuario`, `cargo`, `rol`, `telefono?`, `jvpm?`, `jvpe?`, `password` |
| `GET` | `/usuarios/{id}` | — | — |
| `PUT` | `/usuarios/{id}` | HU-04 | igual que POST, **sin** `password` |
| `PATCH` | `/usuarios/{id}/estado` | HU-05 | `estado` |

Los tres filtros del listado son opcionales y combinables. Sin paginación, ordenado por nombre.

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
| `GET` | `/pacientes` | Autenticado | query: `buscar`, `estado` (`ACTIVO` [default], `FALLECIDO`, `TODOS`), `categoria` (`TODOS`, `ADULTO`, `MENOR`) |
| `POST` | `/pacientes` | `RECEPCIONISTA`, `MEDICO` | `nombre_completo`, `fecha_nacimiento`, `direccion?`, si mayor: `dui` (DUI/pasaporte obligatorio), `telefono?`; si menor: datos de responsable (`responsable_nombre`, `responsable_documento`, `responsable_telefono`, `responsable_parentesco`) |
| `GET` | `/pacientes/{id}` | Autenticado | — |
| `PUT` | `/pacientes/{id}` | `RECEPCIONISTA`, `MEDICO` | `nombre_completo`, `direccion?`, si mayor: `telefono?`; si menor: `responsable_nombre`, `responsable_telefono`, `responsable_parentesco`. Nota: `dui`, `fecha_nacimiento` y `numero_expediente` son estrictamente inmutables. |
| `DELETE` | `/pacientes/{id}` | `RECEPCIONISTA`, `MEDICO` | Soft delete: cambia `estado` a `FALLECIDO` |

- Almacenamiento seguro: datos sensibles (`nombre_completo`, `dui`, `telefono`, `direccion`) cifrados con AES-256 en reposo.
- Administrador recibe `403` si intenta registrar, editar o eliminar pacientes.
- Para menores de edad, no se solicita documento ni teléfono propio; se exigen los del responsable (guardando el DUI o pasaporte en `responsable.dui`).
- El número de expediente `XX00-YYYY` se genera automáticamente.
- **Edición de datos**: `dui`/pasaporte y `fecha_nacimiento` permanecen inmutables para resguardar la identidad legal y el expediente del paciente.

---

## Bloqueos de agenda (HU-35) — roles `ADMINISTRADOR` y `RECEPCIONISTA`

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

---

## Diagnósticos y catálogo CIE-10 (HU-20, HU-44) — rol `MEDICO`

| Método | Ruta | Query / Cuerpo |
|---|---|---|
| `GET` | `/catalogo/cie10` | query: `buscar` (2 a 100 caracteres). Devuelve hasta 25 `{ codigo, descripcion }`. |
| `PUT` | `/consultas/{id}` | además de lo que ya aceptaba: `diagnosticos: [{ descripcion, codigo_cie10? }]`. |

- La búsqueda acepta una frase de síntomas o el inicio de un código. Ignora conectores,
  números y palabras de dos letras; basta con que coincida una palabra y primero salen
  las filas que coinciden con más.
- Con el catálogo vacío responde `503` con un mensaje para el médico.
- `codigo_cie10` es opcional: sin él el diagnóstico queda como texto libre. Si viene,
  debe existir en el catálogo (`422`).
- Enviar `diagnosticos` reemplaza la lista completa; no enviarlo la deja como está.
- `GET /consultas/{id}` y `GET /pacientes/{id}/historial` devuelven `diagnosticos`
  (`id`, `consulta_id`, `codigo_cie10`, `descripcion`, `es_texto_libre`) y `medicoJvpm`.

El catálogo se arma con `php artisan cie10:sincronizar-oms`: códigos de la API de la OMS
(CIE-10 2019) y descripciones en español de `backend/database/data/cie10_descripciones_es.csv`.
Requiere `ICD_CLIENT_ID` e `ICD_CLIENT_SECRET` en el `.env`. Detalle y razones en
`docs/claude-context/05-catalogo-cie10.md`. Para cargar un CSV propio sigue disponible
`php artisan cie10:importar <archivo.csv>`.

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
  "cargo": "Ginecología",
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

Catálogo de medicamentos (HU-45), constancias (HU-31) y referencias médicas (HU-32):
no tienen tabla ni endpoint.
