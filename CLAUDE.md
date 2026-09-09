# CLAUDE.md — Policlínica Ahuachapaneca

> Índice de memoria de proyecto para Claude Code. Este archivo se mantiene
> corto a propósito: solo importa los contextos detallados que viven en
> `docs/claude-context/`. Para agregar más contexto en el futuro (una
> épica nueva, una decisión de arquitectura, lo que sea), crea un archivo
> nuevo en esa carpeta y agrégale una línea `@docs/claude-context/...` aquí
> abajo, en el orden en que quieras que se lea. No sigas metiendo todo en
> un solo archivo gigante.

@docs/claude-context/00-contexto-proyecto.md
@docs/claude-context/01-convenciones-codigo.md
@docs/claude-context/02-estado-backlog.md
@docs/claude-context/03-plan-agendamiento.md
@docs/claude-context/04-hallazgos-pendientes.md

---

## Regla principal

**Solo frontend.** No se toca `backend/`, no se configuran `.env`, no se
prueba login real. Todo lo que no tenga API conectada se construye con
datos simulados (mock) — el detalle exacto del patrón está en
`01-convenciones-codigo.md`.

## Cómo trabajar conmigo

- Antes de escribir código de una HU, dime en una frase qué vas a construir
  y en qué archivos, para que yo confirme.
- Al terminar una HU, dime cómo probarla manualmente y **actualiza tú
  mismo** la tabla de `02-estado-backlog.md` antes de seguir con la
  siguiente.
- No avances al siguiente paso del orden de `03-plan-agendamiento.md` sin
  que yo confirme el anterior.
- Si notas que el código de algo ya "hecho" en realidad no cumple todos los
  criterios de su HU (como pasó con HU-07 — ver
  `04-hallazgos-pendientes.md`), **documéntalo ahí en vez de arreglarlo sin
  avisar**, salvo que yo te pida explícitamente corregirlo.
- Si una regla de negocio no está clara en ningún archivo de contexto,
  pregunta — no asumas.
