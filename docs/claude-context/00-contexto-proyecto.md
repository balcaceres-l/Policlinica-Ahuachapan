# 00 · Contexto del Proyecto

## Cliente y problema

**Cliente:** Policlínica Ahuachapaneca (Ahuachapán, El Salvador).

**Problema:** el agendamiento de citas, el registro de consultas y los
expedientes clínicos se gestionan manualmente en papel. Esto genera pérdida
de tiempo, errores de información, expedientes que se extravían (a veces
porque el propio paciente se los lleva a casa) y médicos sin acceso directo
a su propia agenda.

**Solución:** sistema web con tres roles (Administrador, Recepcionista,
Médico) que centraliza el agendamiento de citas, los expedientes clínicos
electrónicos y la emisión de documentos médicos.

**Es un proyecto académico** (Universidad Católica de El Salvador,
Ingeniería en Desarrollo de Software, asignatura Gestión de Proyectos
Informáticos), con fecha límite de entrega el **21 de noviembre de 2026**.

## Roles del sistema

| Rol | Qué hace |
|---|---|
| **Administrador** | CRUD de usuarios, roles, especialidades médicas, configuración de horarios médicos. |
| **Recepcionista** | Agenda citas (calendario global o por médico), valida disponibilidad, cancela/reprograma, bloquea agenda, registra pacientes y signos vitales. |
| **Médico** | Consulta médica, expediente clínico, recetas, documentos; puede ver y agendar en su propia agenda. |

## Stack del frontend (confirmado en `package.json` — no agregar nada nuevo)

| Librería | Uso |
|---|---|
| React 19.2 + TypeScript ~6.0 + Vite 8.2 | Base de la SPA |
| Tailwind CSS v4 | Estilos vía `@theme` en `styles/theme.css` (no `tailwind.config.js`) |
| TanStack React Query 5.x | Cache, queries y mutaciones |
| React Hook Form + Zod + `@hookform/resolvers` | Formularios |
| Axios | Cliente HTTP (instancia en `services/api.ts`) — solo para lo ya conectado a API real |
| react-hot-toast | Notificaciones |
| Remix Icon (`ri-*`) | Íconos |
| react-router-dom 7.x | Enrutamiento SPA |

No instalar librerías de componentes (nada de shadcn, MUI, Ant Design) — el
kit propio vive en `components/ui/`.

## Backend (solo para saber qué existe — no se toca)

Laravel 12 + Sanctum (API REST con tokens) + MariaDB en producción. El
equipo de backend trabaja esto por separado. Lo que hoy existe:

- **Controladores con lógica completa:** `AuthController`, `UsuarioController`,
  `EspecialidadController`, `MedicoEspecialidadController`,
  `CatalogoEspecialidadController`.
- **Migraciones ya escritas pero sin controlador/ruta todavía** (solo
  esquema de base de datos, útil para que el mock use los mismos nombres de
  campo — ver `03-plan-agendamiento.md`): `pacientes`, `horarios_medicos`,
  `bloqueos_agenda`, `citas`, catálogos clínicos (CIE-10, medicamentos),
  consultas, diagnósticos, recetas, documentos clínicos.

## Estructura de carpetas del frontend

```
frontend/src/
├── views/                      admin/ · secretaria/ · medico/ (vacía) · auth/
├── components/
│   ├── ui/                     Button, Modal, DataTable, Badge, SearchBar,
│   │                           Pagination, EmptyState, LoadingSpinner
│   ├── usuario/                NuevoUsuarioModal, EditarUsuarioModal, ConfirmarEstadoModal
│   ├── auth/                   ProtectedRoute, CambiarPasswordModal
│   └── layout/                 AppLayout, Sidebar
├── hooks/<feature>/            useUsuarios, useEspecialidades, (nuevo: useHorarios, useCitas...)
├── services/<feature>/         Un archivo por dominio — mock o real, ver 02-estado-backlog.md
├── services/mockData.ts        Datos simulados compartidos (médicos, especialidades...)
├── lib/
│   ├── validations/            Esquemas Zod
│   ├── constants/roles.ts      Labels, colores, opciones por rol/estado
│   ├── apiError.ts             extraerMensajeError()
│   └── queryClient.ts
├── types/<feature>.types.ts
├── context/                    AuthProvider + auth-context
└── styles/theme.css            Tokens de diseño Tailwind v4
```

**Patrón para una HU nueva:** `types/` → mock en `mockData.ts` →
`services/<feature>/<feature>.service.ts` → `hooks/<feature>/use<Feature>.ts`
→ `lib/validations/` (si hay formulario) → `views/<rol>/<Página>.tsx` →
registrar ruta en `App.tsx`.

## Reglas de negocio generales (levantadas con el cliente)

- Un médico puede tener **varias especialidades pero una sola agenda** de
  citas; él decide con cuál especialidad atiende cada consulta.
- El expediente clínico es **compartido y visible completo** entre todos
  los médicos y la recepcionista.
- Numeración de expediente: **iniciales + correlativo + año** (`XX00-20XX`).
- Se permiten **citas de emergencia/sobrecupo** que ignoran la validación
  estándar de disponibilidad, incluso el mismo día.
- Diagnósticos y medicamentos: **catálogos estandarizados + texto libre**
  de respaldo.
- **Datos de responsable obligatorios** para menores de edad.
- Alertas de **tiempo de consulta excedido** y **retraso del paciente
  >20 min** (sin cerrar la consulta automáticamente).
- Duración de cada consulta: **20 a 30 minutos**.
- Horario base: lunes a viernes 3:00 PM–6:30 PM, sábados 8:00 AM–12:00 MD
  (dermatología distinto) — configurable por médico, no fijo en código.
