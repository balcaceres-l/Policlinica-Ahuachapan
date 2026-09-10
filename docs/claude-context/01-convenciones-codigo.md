# 01 · Convenciones de Código

Dos patrones conviven en el repo. Identifica cuál te toca usar según si el
dominio ya tiene backend real o no (ver `02-estado-backlog.md`).

## Patrón A — "ya conectado a API real" (solo consulta, no lo repliques con mock)

`services/usuario/usuario.service.ts` — funciones `async` limpias, sin mock:

```ts
export const crearUsuario = async (payload: NuevoUsuario): Promise<Usuario> => {
  const { data } = await api.post<ApiResponse<Usuario>>('/usuarios', payload);
  return data.data;
};
```

## Patrón B — "mock" (este es el que usarás para Agendamiento, EP-04)

`services/especialidad/especialidad.service.ts` es la plantilla exacta:

```ts
export const crearEspecialidad = async (payload: NuevaEspecialidad): Promise<Especialidad> => {
  // TODO: api.post<ApiResponse<Especialidad>>('/especialidades', payload)
  await delay(500);

  const duplicada = mockEspecialidades.some(
    (e) => normalizar(e.nombre) === normalizar(payload.nombre),
  );
  if (duplicada) {
    throw new Error(`Ya existe una especialidad llamada "${payload.nombre}".`);
  }

  const nueva: Especialidad = { id: siguienteIdEspecialidad(), ...payload, estado: 'ACTIVA' };
  mockEspecialidades.push(nueva);
  return nueva;
};
```

Reglas del patrón mock:
- Siempre `await delay(N)` (200–500 ms según la operación).
- Siempre un comentario `// TODO:` con la llamada real exacta que irá ahí.
- Las reglas de negocio (duplicados, conflictos, validaciones) se simulan
  con `throw new Error(...)` — el mismo mensaje que debería devolver el
  backend después.
- Los arrays de `mockData.ts` se mutan directamente (`push`, `splice`, `find`).

## Hooks (patrón único, aplica a ambos casos)

```ts
export const especialidadesKeys = {
  all: ['especialidades'] as const,
  activas: ['especialidades', 'activas'] as const,
};

export const useCrearEspecialidad = () => {
  const invalidar = useInvalidarEspecialidades();
  return useMutation({ mutationFn: crearEspecialidad, onSuccess: invalidar });
};
```

- Query keys como factory por dominio.
- Cada mutación invalida las queries relacionadas en `onSuccess`.
- No lógica de negocio en los hooks — eso va en el servicio.

## Formularios (patrón canónico: `CambiarPasswordModal.tsx` / `NuevoUsuarioModal.tsx`)

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

- Esquema Zod en `lib/validations/<algo>Schema.ts`, exportando el tipo
  inferido y los valores por defecto.
- Errores del servidor/mock van a `errors.root` — nunca `alert()`.
- Formularios de crear/editar siempre dentro de un `<Modal>`.

## Vistas (patrón canónico: `ListaUsuariosPage.tsx`)

- Encabezado con título + descripción + botón de acción principal.
- Filtros en una barra (`SearchBar` + selects + botón "Limpiar").
- `DataTable` con columnas tipadas + `Pagination`.
- Acciones por fila como íconos a la derecha (`ri-pencil-line` para editar,
  `ri-forbid-line` / `ri-checkbox-circle-line` para activar/desactivar).
- Modales controlados por estado local (`useState<Usuario | null>`), no por
  props booleanas sueltas.
- Comentario `/** HU-XX */` donde aplique, justo sobre el bloque que la
  implementa.

## Clase de input reutilizable

```ts
const CLASE_INPUT =
  'h-11 w-full rounded-field border border-line bg-surface px-3 text-sm text-ink outline-none ' +
  'transition-colors placeholder:text-muted focus:border-brand-600 focus:ring-4 ' +
  'focus:ring-brand-600/15 disabled:opacity-60';
```

## Sistema de diseño (`styles/theme.css`)

| Token | Uso |
|---|---|
| `brand-50…900` | Azul institucional |
| `success/success-soft`, `danger/danger-soft`, `warning/warning-soft`, `info/info-soft`, `royal/royal-soft` | Estados y badges por rol |
| `canvas`, `surface`, `line`, `ink`, `muted` | Fondo página, fondo tarjeta, bordes, texto principal, texto secundario |
| `rounded-field` (10px) / `rounded-card` (14px) | Inputs/botones vs. tarjetas/modales |
| `shadow-card` / `shadow-pop` | Tarjetas vs. modales/popovers |

Badges por rol: Médico = `info`, Recepcionista = `success`,
Administrador = `royal`.
