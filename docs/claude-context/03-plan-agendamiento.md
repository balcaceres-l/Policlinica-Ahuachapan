# 03 · Plan de Trabajo — EP-04 Agendamiento de Citas

## Esquema de datos ya definido por el equipo de backend (úsalo tal cual en el mock)

El backend **ya tiene las migraciones** de Agendamiento escritas (aunque
todavía no tiene controladores ni rutas). Para que el mock de hoy encaje
sin fricción cuando se conecte la API real, **usa exactamente estos
nombres de campo y estos valores de enum** en tus tipos y datos simulados:

**`horarios_medicos`**: `medico_id`, `dia_semana` (string), `hora_inicio`,
`hora_fin`.

**`bloqueos_agenda`**: `medico_id`, `fecha`, `motivo`, `creado_por_id`. Un
médico solo puede tener **un bloqueo por fecha** (restricción única).

**`citas`**: `paciente_id`, `medico_id`, `especialidad_id` (nullable — se
resuelve hasta que el médico atiende y elige con cuál especialidad
registra la consulta), `fecha`, `hora_inicio`, `hora_fin`,
`tipo_cita` (`REGULAR` | `EMERGENCIA` | `SOBRECUPO`),
`estado` (`AGENDADA` | `EN_ESPERA` | `EN_ATENCION` | `ATENDIDA` |
`CANCELADA` | `NO_ASISTIO`), `motivo_cancelacion`, `hora_llegada`,
`orden_atencion`, `creado_por_id`.

**`pacientes`** (existe la migración, pero el CRUD de pacientes es de una
épica posterior — no la construyas ahora): `numero_expediente`,
`nombre_completo`, `fecha_nacimiento`, `dui`, `es_menor_edad` + datos de
responsable. Para el mock de este sprint, **crea solo una lista fija de
6–8 pacientes de prueba en `mockData.ts`** (sin formulario de registro)
para poder seleccionar un paciente al agendar.

## Orden de trabajo — 12 HU de EP-04

1. **HU-34 — Configuración de horarios médicos.** Primero esto: sin
   horarios no hay disponibilidad que calcular. `types/horario.types.ts`,
   mock de `horarios_medicos` en `mockData.ts`, servicio/hook, vista nueva
   `views/admin/HorariosPage.tsx` con tabla por médico + modal de
   agregar/editar horario (día, hora inicio, hora fin).

2. **HU-10 — Agendamiento por calendario global.** `types/cita.types.ts`,
   mock de `citas` + los 6–8 pacientes de prueba. Vista
   `views/secretaria/CalendarioGlobalPage.tsx`: rejilla de tiempo con todos
   los médicos, bloques libres/ocupados según `horarios_medicos` menos las
   `citas` ya existentes.

3. **HU-11 — Agendamiento por flujo de médico.** Mismo mock de citas,
   flujo distinto: especialidad → médico → disponibilidad → confirmar.
   `views/secretaria/AgendarPorMedicoPage.tsx`.

4. **HU-12 — Validación automática de disponibilidad.** No es una vista
   nueva: es la función compartida (ej. `validarDisponibilidad()` en el
   servicio de citas) que usan HU-10, HU-11 y HU-14 antes de guardar,
   comparando `fecha` + rango horario contra citas ya existentes del mismo
   médico con `estado != CANCELADA`.

5. **HU-36 — Cita de emergencia o sobrecupo.** Reutiliza el flujo de
   HU-11, con un toggle "Emergencia/Sobrecupo" que **omite** la función de
   HU-12 y guarda con `tipo_cita: 'EMERGENCIA'` o `'SOBRECUPO'`.

6. **HU-13 — Cancelación de citas.** Acción sobre una cita existente:
   modal de confirmación + motivo, cambia `estado` a `CANCELADA`.

7. **HU-35 — Bloqueo de agenda por ausencia.** Mock de `bloqueos_agenda`;
   al bloquear una fecha para un médico, esa fecha deja de mostrar bloques
   disponibles en HU-10/HU-11 para ese médico.

8. **HU-14 — Reprogramación de citas.** Cambia `fecha`/`hora_inicio`/
   `hora_fin` de una cita existente, pasando por la misma validación de
   HU-12, y libera el bloque original.

9. **HU-37 — Reubicación de citas por atraso.** Acción en bloque: mover
   todas las citas siguientes de un médico en un día X minutos.

10. **HU-15 — Agenda propia del médico.** Vista de solo lectura
    `views/medico/MiAgendaPage.tsx`: citas del día del médico logueado +
    navegación por fecha.

11. **HU-16 — Agendamiento propio por el médico.** Reutiliza el flujo de
    HU-11 pero accesible desde `views/medico/`, con el médico ya fijado
    (el propio usuario logueado).

12. **HU-38 — Alerta de retraso del paciente.** Indicador visual (badge o
    ícono) en las vistas de agenda/calendario cuando `hora_llegada` supera
    los 20 minutos respecto a `hora_inicio` y la cita sigue en `AGENDADA`.

## Reglas de negocio específicas de Agendamiento

- La especialidad de la cita se resuelve al atender, no al agendar (por
  eso `especialidad_id` es nullable en `citas`).
- Citas de emergencia/sobrecupo ignoran la validación estándar, incluso el
  mismo día.
- El orden de atención lo marca la llegada (`hora_llegada`,
  `orden_atencion`), no la hora agendada.
