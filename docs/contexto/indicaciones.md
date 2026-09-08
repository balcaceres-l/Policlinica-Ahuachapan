# CLAUDE.md — Policlínica Ahuachapaneca

> Archivo de memoria de proyecto para Claude Code. Colocar en la raíz del
> repositorio (`Policlinica-Ahuachapan/CLAUDE.md`). Se carga automáticamente
> en cada sesión de VS Code con Claude Code.

---

## 0. Regla principal: SOLO FRONTEND

**Este archivo guía exclusivamente el trabajo de frontend.**
El backend (Laravel + Sanctum + MariaDB) lo implementa el equipo por separado.
No se modifica nada dentro de `backend/`, no se configuran `.env`, no se
conecta a la API real. Todas las vistas trabajan con **datos simulados
(mock)** y servicios falsos que imitan la respuesta que dará la API cuando
esté lista. Cuando el backend se termine, solo se reemplaza el cuerpo de
cada función en `services/` — las vistas y hooks no se tocan.

---

## 1. Contexto del proyecto

**Cliente:** Policlínica Ahuachapaneca (Ahuachapán, El Salvador).
**Problema:** gestión manual en papel → expedientes extraviados, doble
reserva de citas, médicos sin acceso a su agenda.
**Solución:** sistema web con tres roles (Administrador, Recepcionista,
Médico) que centraliza citas, expedientes clínicos y documentos médicos.
**Fecha límite:** 21 de noviembre de 2026 (proyecto académico, UNICAES).

### Roles del sistema

| Rol | Qué hace |
|---|---|
| **Administrador** | CRUD de usuarios, roles, especialidades médicas, configuración de horarios médicos. |
| **Recepcionista** | Agenda citas (calendario global o por médico), valida disponibilidad, cancela/reprograma, registra pacientes y signos vitales. |
| **Médico** | Consulta médica, expediente clínico, recetas, documentos; puede ver y agendar en su propia agenda. |

---

## 2. Stack del frontend (confirmado en `package.json`, no agregar nada nuevo)

| Librería | Versión | Uso |
|---|---|---|
| React | 19.2 | SPA con componentes funcionales + hooks |
| TypeScript | ~6.0 | Tipado estricto en todo el proyecto |
| Vite | 8.2 | Bundler y dev server |
| Tailwind CSS v4 | 4.3 | Estilos vía `@theme` en CSS (no `tailwind.config.js`) |
| TanStack React Query | 5.102 | Cache, queries y mutaciones |
| React Hook Form | 7.87 | Formularios |
| Zod | 3.25 | Validación de esquemas |
| `@hookform/resolvers` | 5.9 | Puente RHF ↔ Zod |
| Axios | 1.20 | Cliente HTTP (instancia en `services/api.ts`) |
| react-hot-toast | 2.6 | Notificaciones |
| Remix Icon | 4.9 | Íconos (clases `ri-*`) |
| react-router-dom | 7.18 | Enrutamiento SPA |

**No instalar ninguna librería de componentes** (ni shadcn, ni MUI, ni Ant
Design). El proyecto tiene su propio kit en `components/ui/`.

---

## 3. Estructura de carpetas del frontend

```
frontend/src/
├── views/                 Una carpeta por rol, una página por HU o grupo de HU
│   ├── admin/             Vistas del Administrador
│   ├── secretaria/        Vistas de la Recepcionista
│   ├── medico/            Vistas del Médico (vacía por ahora)
│   ├── auth/              LoginPage
│   └── shared/            Vistas compartidas entre roles (vacía por ahora)
│
├── components/
│   ├── ui/                Kit propio: Button, Modal, DataTable, Badge, SearchBar,
│   │                      Pagination, EmptyState, LoadingSpinner
│   ├── auth/              ProtectedRoute, CambiarPasswordModal
│   └── layout/            AppLayout, Sidebar
│
├── hooks/<feature>/       Un hook por dominio (useUsuarios, useEspecialidades, ...)
│                          Exportan useQuery / useMutation de React Query
│
├── services/<feature>/    Funciones async puras — HOY devuelven datos mock,
│                          MAÑANA llamarán a la API real (solo cambiar el cuerpo)
│
├── services/mockData.ts   Fuente de datos simulados compartida
│
├── lib/
│   ├── validations/       Esquemas Zod (uno por formulario)
│   ├── constants/roles.ts Labels, colores, opciones de filtro por rol
│   ├── apiError.ts        extraerMensajeError() para errores uniformes
│   ├── queryClient.ts     Instancia de React Query
│   └── utils.ts           Helpers (cn, normalizar, getIniciales, delay)
│
├── types/<feature>.types.ts   Interfaces TypeScript por dominio
│
├── context/               AuthProvider + auth-context (maneja sesión global)
│
├── styles/theme.css       Tokens de diseño Tailwind v4 (@theme)
├── App.tsx                Rutas protegidas por rol
└── main.tsx               Entry point
```

**Patrón para crear una HU nueva (en este orden):**
1. `types/<feature>.types.ts` — interfaces
2. Agregar datos mock en `services/mockData.ts`
3. `services/<feature>/<feature>.service.ts` — funciones async con `await delay(...)` + mock
4. `hooks/<feature>/use<Feature>.ts` — useQuery / useMutation
5. `lib/validations/<feature>Schema.ts` — si tiene formulario
6. `views/<rol>/<Página>.tsx` — la vista
7. Registrar ruta en `App.tsx` bajo el `ProtectedRoute` del rol correcto

---

## 4. Convenciones de código (imitar lo que ya existe, no inventar)

### Servicios mock (patrón canónico: `services/especialidad/especialidad.service.ts`)

```ts
export const getEspecialidades = async (): Promise<Especialidad[]> => {
  // TODO: api.get<ApiResponse<Especialidad[]>>('/especialidades')
  await delay(300);
  return conConteo();
};
```

Reglas:
- Siempre un `await delay(N)` para simular latencia y que los loading states funcionen.
- Siempre un comentario `// TODO:` con la llamada API exacta que irá ahí después.
- Los datos vienen de `mockData.ts` (arrays mutables en memoria).
- Las mutaciones (crear, editar, eliminar) modifican directamente el array mock.
- Validaciones de duplicados y errores de negocio se simulan con `throw new Error(...)`.

### Hooks (patrón canónico: `hooks/especialidad/useEspecialidades.ts`)

```ts
export const especialidadesKeys = {
  all: ['especialidades'] as const,
  activas: ['especialidades', 'activas'] as const,
  deMedico: (medicoId: number) => ['especialidades', 'medico', medicoId] as const,
};

export const useCrearEspecialidad = () => {
  const invalidar = useInvalidarEspecialidades();
  return useMutation({
    mutationFn: (payload: NuevaEspecialidad) => crearEspecialidad(payload),
    onSuccess: invalidar,
  });
};
```

Reglas:
- Query keys como factory por dominio.
- Cada mutación invalida las queries relacionadas en `onSuccess`.
- No lógica de negocio en los hooks — eso va en el servicio.

### Formularios (patrón canónico: `components/auth/CambiarPasswordModal.tsx`)

```tsx
const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } =
  useForm<FormValues>({ resolver: zodResolver(schema), defaultValues });

const onSubmit = async (valores: FormValues) => {
  try {
    await servicio(valores);
    toast.success('Mensaje de éxito.');
    cerrar();
  } catch (error) {
    setError('root', { message: extraerMensajeError(error, 'Mensaje genérico.') });
  }
};
```

Reglas:
- Esquema Zod en `lib/validations/<algo>Schema.ts`, exportando tipo + defaults.
- Errores del servidor/mock van a `errors.root` — nunca `alert()`.
- Formularios dentro de `<Modal>` siempre que sea un crear/editar.

### Vistas (patrón canónico: `views/admin/ListaUsuariosPage.tsx`)

- Encabezado con título + descripción + botón de acción principal.
- Filtros en una barra con `SearchBar` + selects + botón "Limpiar".
- `DataTable` con columnas tipadas + `Pagination`.
- Comentarios `/** HU-XX */` donde aplique.

### Clase de input reutilizable

```ts
const CLASE_INPUT =
  'h-11 w-full rounded-field border border-line bg-surface px-3 text-sm text-ink outline-none ' +
  'transition-colors placeholder:text-muted focus:border-brand-600 focus:ring-4 ' +
  'focus:ring-brand-600/15 disabled:opacity-60';
```

Ya definida en `CambiarPasswordModal.tsx`. Para vistas nuevas con inputs,
reutiliza esta misma clase o extráela a `lib/constants/` si se repite mucho.

---

## 5. Sistema de diseño (tokens en `styles/theme.css`)

| Token | Uso |
|---|---|
| `brand-50` … `brand-900` | Azul institucional |
| `success` / `success-soft` | Recepcionista, estados activos |
| `danger` / `danger-soft` | Errores, estados inactivos |
| `warning` / `warning-soft` | Alertas, retrasos |
| `info` / `info-soft` | Médico, información |
| `royal` / `royal-soft` | Administrador |
| `canvas` | Fondo de página (`#f8f9fa`) |
| `surface` | Fondo de tarjetas/modales (`#ffffff`) |
| `line` | Bordes (`#e6e8eb`) |
| `ink` | Texto principal (`#1f2a37`) |
| `muted` | Texto secundario (`#6b7280`) |
| `rounded-field` | 10px — inputs y botones |
| `rounded-card` | 14px — tarjetas y modales |
| `shadow-card` | Elevación sutil para tarjetas |
| `shadow-pop` | Elevación fuerte para modales y popovers |

**Badges por rol:** Médico = `info`, Recepcionista = `success`,
Administrador = `royal`. Ya definido en `lib/constants/roles.ts`.

---

## 6. Reglas de negocio del cliente (respetar en todas las vistas)

- Un médico puede tener **varias especialidades pero una sola agenda**.
- El expediente clínico es **compartido y visible completo** entre médicos
  y recepcionista.
- Numeración de expediente: **iniciales + correlativo + año** (`XX00-20XX`),
  asignada automáticamente.
- Se permiten **citas de emergencia/sobrecupo** que ignoran la validación
  de disponibilidad.
- Diagnósticos y medicamentos: **catálogos estandarizados + texto libre**.
- **Datos de responsable obligatorios** para menores de edad.
- Alertas de **tiempo de consulta excedido** y de **retraso del paciente >20 min**
  (sin cerrar la consulta automáticamente).
- Horarios de atención: **lunes a viernes 3:00 PM – 6:30 PM**, **sábados
  8:00 AM – 12:00 MD** (dermatología con horario distinto). Configurables
  por médico desde el sistema.
- Duración de cada consulta: **20 a 30 minutos**.

---

## 7. Las 21 HU del Sprint 1 — estado actual y lo que falta

### Leyenda de estado
- ✅ = terminada (vista funcional con mock o conectada)
- 🟠 = vista hecha con mock, funcional
- 🔲 = no iniciada — hay que construir la vista con datos mock

### EP-02 · Autenticación y Gestión de Usuarios

| Jira | HU | Descripción | Rol | Estado | Qué falta en frontend |
|---|---|---|---|---|---|
| SCRUM-87 | HU-01 | Inicio de sesión | Todos | ✅ | Nada — `LoginPage.tsx` funcional |
| SCRUM-88 | HU-02 | Cambio de contraseña | Todos | ✅ | Nada — `CambiarPasswordModal.tsx` funcional |
| SCRUM-89 | HU-03 | Registro de cuentas de usuario | Admin | 🔲 | Modal con formulario (nombre, usuario, cargo, rol, teléfono, contraseña). Botón "Nuevo Usuario" ya existe deshabilitado en `ListaUsuariosPage.tsx` |
| SCRUM-90 | HU-04 | Edición de perfil de usuario | Admin | 🔲 | Modal de edición (mismos campos sin contraseña). Botón de editar ya existe deshabilitado |
| SCRUM-91 | HU-05 | Activación/desactivación de cuentas | Admin | 🔲 | Confirmar con diálogo + mutación mock que cambia estado en `mockData`. Botón ya existe deshabilitado |
| SCRUM-92 | HU-06 | Consulta del listado de usuarios | Admin | 🟠 | Conectar a mock real (ya funciona sobre `mockData.ts`) — **lista completa** |

### EP-03 · Gestión de Especialidades Médicas

| Jira | HU | Descripción | Rol | Estado | Qué falta en frontend |
|---|---|---|---|---|---|
| SCRUM-93 | HU-07 | Registro de especialidades | Admin | 🟠 | Funcional sobre mock — **hecha** |
| SCRUM-94 | HU-08 | Asociación médicos ↔ especialidades | Admin | 🟠 | Funcional sobre mock — **hecha** |
| SCRUM-95 | HU-09 | Catálogo de especialidades | Recepcionista | 🟠 | Funcional sobre mock — **hecha** |

### EP-04 · Agendamiento de Citas Médicas

| Jira | HU | Descripción | Rol | Estado | Qué falta en frontend |
|---|---|---|---|---|---|
| SCRUM-96 | HU-34 | Configuración de horarios de médicos | Admin | 🔲 | Vista nueva completa: CRUD de horarios por médico (día, hora inicio, hora fin). Datos mock nuevos |
| SCRUM-97 | HU-10 | Agendamiento por calendario global | Recepcionista | 🔲 | Vista de calendario en rejilla de tiempo con todos los médicos. Datos mock de citas |
| SCRUM-98 | HU-11 | Agendamiento por flujo de médico | Recepcionista | 🔲 | Flujo: seleccionar especialidad → médico → ver disponibilidad → agendar |
| SCRUM-99 | HU-12 | Validación automática de disponibilidad | Recep./Médico | 🔲 | Lógica mock que impide doble reserva en el mismo bloque horario |
| SCRUM-100 | HU-36 | Cita de emergencia o sobrecupo | Recepcionista | 🔲 | Opción para agendar ignorando validación de disponibilidad |
| SCRUM-101 | HU-13 | Cancelación de citas | Recepcionista | 🔲 | Acción desde calendario/agenda con motivo y confirmación |
| SCRUM-102 | HU-35 | Bloqueo de agenda por ausencia | Recepcionista | 🔲 | Bloquear día completo de un médico, impidiendo nuevas citas |
| SCRUM-103 | HU-14 | Reprogramación de citas | Recepcionista | 🔲 | Cambiar fecha/hora de cita existente, liberando bloque original |
| SCRUM-104 | HU-37 | Reubicación de citas por atraso | Recep./Médico | 🔲 | Mover en bloque las citas siguientes cuando el médico se atrasa |
| SCRUM-105 | HU-15 | Agenda propia del médico | Médico | 🔲 | Vista de "mi agenda" con citas del día + navegación por fecha |
| SCRUM-106 | HU-16 | Agendamiento propio por el médico | Médico | 🔲 | El médico agenda citas directamente para sus pacientes |
| SCRUM-107 | HU-38 | Alerta de retraso del paciente | Recepcionista | 🔲 | Indicador visual cuando un paciente supera 20 min de retraso |

---

## 8. Orden de trabajo recomendado

### Bloque A — Completar CRUD de Administrador (HU-03, HU-04, HU-05)

Estas tres son las más rápidas porque los botones ya existen en
`ListaUsuariosPage.tsx` y solo falta el modal/diálogo detrás de cada uno.

1. **HU-03** — `RegistrarUsuarioModal.tsx` (formulario con Zod, mutación mock que
   hace `push` al array de `mockUsuarios`, invalidar query de usuarios).
2. **HU-04** — `EditarUsuarioModal.tsx` (mismo esquema sin contraseña, pre-llena
   datos del usuario seleccionado, mutación mock que modifica el objeto en el array).
3. **HU-05** — No es modal sino confirmación (`Modal` simple de texto +
   botón "Confirmar"), mutación mock que cambia `.estado` del usuario.

### Bloque B — Configuración de horarios (HU-34)

Vista nueva en `views/admin/HorariosPage.tsx`. Necesita:
- Tipos nuevos en `types/horario.types.ts`
- Mock data de horarios en `mockData.ts`
- Servicio y hook (`services/horario/`, `hooks/horario/`)
- Tabla de horarios por médico + modal para agregar/editar horario

### Bloque C — Módulo de Agendamiento (HU-10 a HU-14, HU-35, HU-36, HU-37)

Es el bloque más grande. Necesita:
- Tipos nuevos: `types/cita.types.ts`, `types/paciente.types.ts`
- Mock data de pacientes y citas en `mockData.ts`
- Servicio y hook de citas (`services/cita/`, `hooks/cita/`)
- **Vista de calendario global** (`views/secretaria/CalendarioGlobalPage.tsx`)
  — rejilla de tiempo con bloques por médico
- **Vista de flujo por doctor** (`views/secretaria/AgendarPorMedicoPage.tsx`)
  — seleccionar especialidad → médico → horario disponible → confirmar
- Lógica mock de validación de conflictos (HU-12)
- Acciones: cancelar (HU-13), reprogramar (HU-14), bloquear día (HU-35),
  emergencia/sobrecupo (HU-36), reubicar por atraso (HU-37)

### Bloque D — Vistas del Médico (HU-15, HU-16, HU-38)

- **Agenda del médico** (`views/medico/MiAgendaPage.tsx`) — citas del día +
  navegación por fecha
- **Agendar como médico** — reutilizar flujo de HU-11 pero desde el perfil
  de médico
- **Alerta de retraso** (HU-38) — indicador visual en la lista de citas
  cuando un paciente supera 20 min

---

## 9. Cómo trabajar conmigo en este repo

- **Solo frontend.** Si me pides algo del backend, te lo recordaré.
- **Siempre datos mock** con `await delay()` + `// TODO:` de la llamada API real.
- **Imitar los patrones existentes** (secciones 3 y 4 de este archivo).
  `CambiarPasswordModal.tsx` es la plantilla canónica para cualquier
  formulario en modal. `ListaUsuariosPage.tsx` es la plantilla para
  cualquier listado con filtros.
- **Comentar con el código de HU** (`/** HU-XX */`) en el archivo que la
  implementa.
- **No renombrar ni reestructurar** carpetas o componentes existentes.
- **No tocar `backend/`** bajo ningún concepto.
- Cuando falte información de negocio, preguntar — no asumir.
- Actualizar este archivo cuando una HU cambie de 🔲 a 🟠 o ✅.