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
| `POST` | `/usuarios` | HU-03 | `nombre_completo`, `usuario`, `cargo`, `rol`, `telefono?`, `password` |
| `GET` | `/usuarios/{id}` | — | — |
| `PUT` | `/usuarios/{id}` | HU-04 | igual que POST, **sin** `password` |
| `PATCH` | `/usuarios/{id}/estado` | HU-05 | `estado` |

Los tres filtros del listado son opcionales y combinables. Sin paginación, ordenado por nombre.

- `PUT` no acepta `password`: cambiarla es autoservicio.
- Desactivar revoca los tokens del usuario.
- Un administrador no puede desactivarse a sí mismo (`422`).
- `usuario` es un correo y es único (`422` si se repite).
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

Las tablas de pacientes, citas, horarios, consultas, diagnósticos, recetas y documentos
médicos existen en la base, pero todavía no tienen endpoints.
