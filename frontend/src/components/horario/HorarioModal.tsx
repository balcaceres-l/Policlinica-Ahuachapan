import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { useGuardarHorariosSemanales } from '@/hooks/horario/useHorarios';
import { extraerMensajeError } from '@/lib/apiError';
import { DIA_LABEL, DIAS_SEMANA, formatearHora } from '@/lib/constants/dias';
import { cn } from '@/lib/utils';
import type { BloqueHorarioSemanal } from '@/services/horario/horario.service';
import type { DiaSemana, HorarioMedico } from '@/types/horario.types';

interface HorarioModalProps {
  isOpen: boolean;
  medicoId: string;
  medicoNombre?: string;
  medicoCargo?: string;
  horarios: HorarioMedico[];
  diaInicialEnfocado?: DiaSemana | null;
  onClose: () => void;
}

interface BloqueUI {
  idTemp: string;
  hora_inicio: string;
  hora_fin: string;
}

interface DiaConfigUI {
  activo: boolean;
  bloques: BloqueUI[];
}

type HorarioSemanalState = Record<DiaSemana, DiaConfigUI>;

const DIAS_LABORALES_LV: DiaSemana[] = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'];
const DIAS_LABORALES_LS: DiaSemana[] = [
  'LUNES',
  'MARTES',
  'MIERCOLES',
  'JUEVES',
  'VIERNES',
  'SABADO',
];

/** Calcula horas en número decimal a partir de 'HH:mm' */
const duracionEnHoras = (inicio: string, fin: string): number => {
  if (!inicio || !fin || inicio >= fin) return 0;
  const [h1, m1] = inicio.split(':').map(Number);
  const [h2, m2] = fin.split(':').map(Number);
  return Math.max(0, (h2 * 60 + m2 - (h1 * 60 + m1)) / 60);
};

let contadorIds = 0;
const generarIdTemp = (prefix = 'blk'): string => {
  contadorIds += 1;
  return `${prefix}-${Date.now()}-${contadorIds}`;
};

const buildInitialState = (horarios: HorarioMedico[]): HorarioSemanalState => {
  return DIAS_SEMANA.reduce((acc, dia) => {
    const bloquesDia = horarios.filter((h) => h.dia_semana === dia);
    if (bloquesDia.length > 0) {
      acc[dia] = {
        activo: true,
        bloques: bloquesDia.map((b, idx) => ({
          idTemp: `init-${dia}-${idx}-${b.id}`,
          hora_inicio: b.hora_inicio,
          hora_fin: b.hora_fin,
        })),
      };
    } else {
      acc[dia] = {
        activo: false,
        bloques: [
          {
            idTemp: generarIdTemp(dia),
            hora_inicio: dia === 'SABADO' ? '08:00' : '08:00',
            hora_fin: dia === 'SABADO' ? '12:00' : '16:00',
          },
        ],
      };
    }
    return acc;
  }, {} as HorarioSemanalState);
};

export function HorarioModal({
  isOpen,
  medicoId,
  medicoNombre,
  medicoCargo,
  horarios,
  diaInicialEnfocado,
  onClose,
}: HorarioModalProps) {
  const guardarMutation = useGuardarHorariosSemanales();
  const [config, setConfig] = useState<HorarioSemanalState>(() => buildInitialState(horarios));
  const [prevKey, setPrevKey] = useState<string>(`${medicoId}-${isOpen}`);
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);

  const currentKey = `${medicoId}-${isOpen}`;
  if (prevKey !== currentKey) {
    setPrevKey(currentKey);
    if (isOpen) {
      setConfig(buildInitialState(horarios));
      setErrorValidacion(null);
    }
  }

  // Toggle activo/inactivo por día
  const toggleDia = (dia: DiaSemana) => {
    setErrorValidacion(null);
    setConfig((prev) => {
      const actual = prev[dia];
      const proximoActivo = !actual.activo;
      const bloques =
        actual.bloques.length > 0
          ? actual.bloques
          : [
              {
                idTemp: generarIdTemp(dia),
                hora_inicio: dia === 'SABADO' ? '08:00' : '08:00',
                hora_fin: dia === 'SABADO' ? '12:00' : '16:00',
              },
            ];

      return {
        ...prev,
        [dia]: {
          activo: proximoActivo,
          bloques,
        },
      };
    });
  };

  // Actualizar hora de inicio o fin en un bloque específico
  const actualizarBloque = (
    dia: DiaSemana,
    indice: number,
    campo: 'hora_inicio' | 'hora_fin',
    valor: string,
  ) => {
    setErrorValidacion(null);
    setConfig((prev) => {
      const bloques = [...prev[dia].bloques];
      bloques[indice] = {
        ...bloques[indice],
        [campo]: valor,
      };
      return {
        ...prev,
        [dia]: {
          ...prev[dia],
          bloques,
        },
      };
    });
  };

  // Añadir un nuevo bloque / turno para el día (ej. para jornada partida con almuerzo)
  const agregarBloque = (dia: DiaSemana) => {
    setErrorValidacion(null);
    setConfig((prev) => {
      const bloquesActuales = prev[dia].bloques;
      let nuevaHoraInicio = '13:00';
      let nuevaHoraFin = '17:00';

      if (bloquesActuales.length > 0) {
        const ultimoBloque = bloquesActuales[bloquesActuales.length - 1];
        if (ultimoBloque.hora_fin) {
          const [h] = ultimoBloque.hora_fin.split(':').map(Number);
          const inicioH = Math.min(21, h + 1);
          const finH = Math.min(23, inicioH + 4);
          nuevaHoraInicio = `${String(inicioH).padStart(2, '0')}:00`;
          nuevaHoraFin = `${String(finH).padStart(2, '0')}:00`;
        }
      }

      return {
        ...prev,
        [dia]: {
          ...prev[dia],
          bloques: [
            ...bloquesActuales,
            {
              idTemp: generarIdTemp(dia),
              hora_inicio: nuevaHoraInicio,
              hora_fin: nuevaHoraFin,
            },
          ],
        },
      };
    });
  };

  // Eliminar un bloque dentro de un día
  const eliminarBloque = (dia: DiaSemana, indice: number) => {
    setErrorValidacion(null);
    setConfig((prev) => {
      const bloques = prev[dia].bloques.filter((_, idx) => idx !== indice);
      return {
        ...prev,
        [dia]: {
          ...prev[dia],
          bloques:
            bloques.length > 0
              ? bloques
              : [{ idTemp: generarIdTemp(dia), hora_inicio: '08:00', hora_fin: '16:00' }],
          activo: bloques.length > 0 ? prev[dia].activo : false,
        },
      };
    });
  };

  // Copiar bloques del día origen a Lunes-Viernes (dejando Sábado y Domingo en descanso)
  const copiarALunesViernes = (diaOrigen: DiaSemana) => {
    setErrorValidacion(null);
    const bloquesOrigen = config[diaOrigen].bloques;
    if (bloquesOrigen.length === 0) return;

    setConfig((prev) => {
      const nuevo = { ...prev };
      // Activar y copiar a Lunes a Viernes
      for (const d of DIAS_LABORALES_LV) {
        nuevo[d] = {
          activo: true,
          bloques: bloquesOrigen.map((b) => ({
            idTemp: generarIdTemp(d),
            hora_inicio: b.hora_inicio,
            hora_fin: b.hora_fin,
          })),
        };
      }
      // Sábado y Domingo quedan en descanso / inactivos
      nuevo['SABADO'] = {
        ...nuevo['SABADO'],
        activo: false,
      };
      nuevo['DOMINGO'] = {
        ...nuevo['DOMINGO'],
        activo: false,
      };
      return nuevo;
    });

    toast.success(
      `Horario de ${DIA_LABEL[diaOrigen]} copiado a Lunes – Viernes (Sábado y Domingo en descanso).`,
    );
  };

  // Copiar bloques del día origen a Lunes-Sábado (semana completa de la policlínica, Domingo en descanso)
  const copiarALunesSabado = (diaOrigen: DiaSemana) => {
    setErrorValidacion(null);
    const bloquesOrigen = config[diaOrigen].bloques;
    if (bloquesOrigen.length === 0) return;

    setConfig((prev) => {
      const nuevo = { ...prev };
      // Activar y copiar a Lunes a Sábado
      for (const d of DIAS_LABORALES_LS) {
        nuevo[d] = {
          activo: true,
          bloques: bloquesOrigen.map((b) => ({
            idTemp: generarIdTemp(d),
            hora_inicio: b.hora_inicio,
            hora_fin: b.hora_fin,
          })),
        };
      }
      // Domingo queda en descanso / inactivo (clínica no abre en Domingo)
      nuevo['DOMINGO'] = {
        ...nuevo['DOMINGO'],
        activo: false,
      };
      return nuevo;
    });

    toast.success(
      `Horario de ${DIA_LABEL[diaOrigen]} copiado a Lunes – Sábado (Domingo en descanso).`,
    );
  };

  // Presets / Plantillas rápidas
  const aplicarPlantillaAlmuerzo = () => {
    setErrorValidacion(null);
    setConfig(() => {
      const nuevo = {} as HorarioSemanalState;
      for (const d of DIAS_SEMANA) {
        if (DIAS_LABORALES_LV.includes(d)) {
          nuevo[d] = {
            activo: true,
            bloques: [
              { idTemp: generarIdTemp(d), hora_inicio: '08:00', hora_fin: '12:00' },
              { idTemp: generarIdTemp(d), hora_inicio: '13:00', hora_fin: '17:00' },
            ],
          };
        } else {
          nuevo[d] = {
            activo: false,
            bloques: [{ idTemp: generarIdTemp(d), hora_inicio: '08:00', hora_fin: '12:00' }],
          };
        }
      }
      return nuevo;
    });
    toast.success('Plantilla L-V con almuerzo (8-12 y 13-17) aplicada.');
  };

  const aplicarPlantillaCorrido = () => {
    setErrorValidacion(null);
    setConfig(() => {
      const nuevo = {} as HorarioSemanalState;
      for (const d of DIAS_SEMANA) {
        if (DIAS_LABORALES_LV.includes(d)) {
          nuevo[d] = {
            activo: true,
            bloques: [{ idTemp: generarIdTemp(d), hora_inicio: '08:00', hora_fin: '16:00' }],
          };
        } else {
          nuevo[d] = {
            activo: false,
            bloques: [{ idTemp: generarIdTemp(d), hora_inicio: '08:00', hora_fin: '12:00' }],
          };
        }
      }
      return nuevo;
    });
    toast.success('Plantilla L-V corrido (8-16) aplicada.');
  };

  const aplicarPlantillaSabado = () => {
    setErrorValidacion(null);
    setConfig(() => {
      const nuevo = {} as HorarioSemanalState;
      for (const d of DIAS_SEMANA) {
        if (DIAS_LABORALES_LV.includes(d)) {
          nuevo[d] = {
            activo: true,
            bloques: [
              { idTemp: generarIdTemp(d), hora_inicio: '08:00', hora_fin: '12:00' },
              { idTemp: generarIdTemp(d), hora_inicio: '13:00', hora_fin: '17:00' },
            ],
          };
        } else if (d === 'SABADO') {
          nuevo[d] = {
            activo: true,
            bloques: [{ idTemp: generarIdTemp(d), hora_inicio: '08:00', hora_fin: '12:00' }],
          };
        } else {
          nuevo[d] = {
            activo: false,
            bloques: [{ idTemp: generarIdTemp(d), hora_inicio: '08:00', hora_fin: '12:00' }],
          };
        }
      }
      return nuevo;
    });
    toast.success('Plantilla L-S (L-V con almuerzo + Sábado medio día) aplicada.');
  };

  const limpiarTodo = () => {
    setErrorValidacion(null);
    setConfig((prev) => {
      const nuevo = { ...prev };
      for (const d of DIAS_SEMANA) {
        nuevo[d] = {
          activo: false,
          bloques: [{ idTemp: generarIdTemp(d), hora_inicio: '08:00', hora_fin: '16:00' }],
        };
      }
      return nuevo;
    });
  };

  // Cálculo de horas semanales totales
  const totalHorasSemanales = useMemo(() => {
    return DIAS_SEMANA.reduce((total, dia) => {
      const cfg = config[dia];
      if (!cfg?.activo) return total;
      return (
        total +
        cfg.bloques.reduce(
          (subTotal, b) => subTotal + duracionEnHoras(b.hora_inicio, b.hora_fin),
          0,
        )
      );
    }, 0);
  }, [config]);

  // Validación y guardado
  const handleGuardar = async () => {
    setErrorValidacion(null);

    const diasActivos = DIAS_SEMANA.filter((d) => config[d]?.activo);
    if (diasActivos.length === 0) {
      setErrorValidacion('Debes activar al menos un día laboral para el médico.');
      return;
    }

    const payload: BloqueHorarioSemanal[] = [];

    for (const dia of diasActivos) {
      const { bloques } = config[dia];
      if (!bloques || bloques.length === 0) {
        setErrorValidacion(
          `En ${DIA_LABEL[dia]}, el día está marcado como activo pero no tiene turnos configurados.`,
        );
        return;
      }

      // Validar formato y orden
      for (let i = 0; i < bloques.length; i++) {
        const b = bloques[i];
        if (!b.hora_inicio || !b.hora_fin) {
          setErrorValidacion(
            `En ${DIA_LABEL[dia]} (Turno ${i + 1}), debes especificar tanto la hora de inicio como la de fin.`,
          );
          return;
        }
        if (b.hora_inicio >= b.hora_fin) {
          setErrorValidacion(
            `En ${DIA_LABEL[dia]} (Turno ${i + 1}), la hora de inicio (${b.hora_inicio}) debe ser anterior a la de fin (${b.hora_fin}).`,
          );
          return;
        }
      }

      // Validar solapamiento entre turnos del mismo día
      for (let i = 0; i < bloques.length; i++) {
        for (let j = i + 1; j < bloques.length; j++) {
          const b1 = bloques[i];
          const b2 = bloques[j];
          if (b1.hora_inicio < b2.hora_fin && b2.hora_inicio < b1.hora_fin) {
            setErrorValidacion(
              `En ${DIA_LABEL[dia]}, se traslapan el Turno ${i + 1} (${formatearHora(b1.hora_inicio)}–${formatearHora(b1.hora_fin)}) y el Turno ${j + 1} (${formatearHora(b2.hora_inicio)}–${formatearHora(b2.hora_fin)}). Ajusta las horas para que no haya solapamiento.`,
            );
            return;
          }
        }
      }

      for (const b of bloques) {
        payload.push({
          dia_semana: dia,
          hora_inicio: b.hora_inicio,
          hora_fin: b.hora_fin,
        });
      }
    }

    try {
      await guardarMutation.mutateAsync({ medicoId, bloques: payload });
      toast.success('Horario semanal actualizado exitosamente.');
      onClose();
    } catch (err) {
      setErrorValidacion(extraerMensajeError(err, 'No se pudo guardar el horario semanal.'));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configurar Horario Semanal"
      subtitle={
        medicoNombre
          ? `Gestión integral de días y turnos de atención para ${medicoNombre}${medicoCargo ? ` (${medicoCargo})` : ''}`
          : 'Define los días laborales y turnos de atención del médico.'
      }
      size="xl"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-muted">
            <i className="ri-time-line text-base text-brand-600" />
            <span>
              Total semanal configurado:{' '}
              <strong className="text-ink font-bold">
                {totalHorasSemanales.toLocaleString('es-SV', { maximumFractionDigits: 1 })} h
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose} disabled={guardarMutation.isPending}>
              Cancelar
            </Button>
            <Button
              onClick={() => void handleGuardar()}
              loading={guardarMutation.isPending}
              icon="ri-save-line"
            >
              Guardar Horario Semanal
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Barra de plantillas rápidas */}
        <div className="rounded-card border border-line bg-canvas/50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-ink">
              <i className="ri-flashlight-line text-brand-600" />
              Plantillas rápidas:
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={aplicarPlantillaAlmuerzo}
                className="cursor-pointer rounded-field border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink transition-colors hover:border-brand-600 hover:text-brand-600"
                title="Lunes a Viernes con 2 turnos: 08:00 a 12:00 y 13:00 a 17:00 (1 hora de almuerzo)"
              >
                L-V con almuerzo (8-12 y 13-17)
              </button>
              <button
                type="button"
                onClick={aplicarPlantillaCorrido}
                className="cursor-pointer rounded-field border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink transition-colors hover:border-brand-600 hover:text-brand-600"
                title="Lunes a Viernes de 08:00 a 16:00 continuo"
              >
                L-V corrido (8-16)
              </button>
              <button
                type="button"
                onClick={aplicarPlantillaSabado}
                className="cursor-pointer rounded-field border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink transition-colors hover:border-brand-600 hover:text-brand-600"
                title="Lunes a Viernes con almuerzo + Sábado medio día (8-12)"
              >
                L-S con almuerzo y Sáb medio día
              </button>
              <button
                type="button"
                onClick={limpiarTodo}
                className="cursor-pointer rounded-field border border-line bg-surface px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:border-danger hover:text-danger"
              >
                Desactivar todos
              </button>
            </div>
          </div>
        </div>

        {/* Alerta de validación o error */}
        {errorValidacion && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-field bg-danger-soft p-3 text-sm text-danger"
          >
            <i className="ri-error-warning-line mt-0.5 shrink-0 text-base" />
            <span>{errorValidacion}</span>
          </div>
        )}

        {/* Grid semanal: 7 filas fijas de Lunes a Domingo */}
        <div className="space-y-2.5">
          {DIAS_SEMANA.map((dia) => {
            const diaConfig = config[dia] ?? { activo: false, bloques: [] };
            const horasDia = diaConfig.activo
              ? diaConfig.bloques.reduce(
                  (sum, b) => sum + duracionEnHoras(b.hora_inicio, b.hora_fin),
                  0,
                )
              : 0;

            const esDiaEnfocado = diaInicialEnfocado === dia;

            return (
              <div
                key={dia}
                className={cn(
                  'rounded-card border transition-all p-3.5',
                  diaConfig.activo
                    ? 'border-line bg-surface shadow-xs'
                    : 'border-line/60 bg-canvas/30 opacity-75',
                  esDiaEnfocado && 'ring-2 ring-brand-500/30 border-brand-500',
                )}
              >
                {/* Cabecera de la fila: Switch + Nombre del Día + Estado + Copiar */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/40 pb-2.5">
                  <div className="flex items-center gap-3">
                    {/* Toggle Switch */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={diaConfig.activo}
                      onClick={() => toggleDia(dia)}
                      className={cn(
                        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-600/30',
                        diaConfig.activo ? 'bg-brand-600' : 'bg-line-strong',
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-surface shadow ring-0 transition duration-200 ease-in-out',
                          diaConfig.activo ? 'translate-x-5' : 'translate-x-0',
                        )}
                      />
                    </button>

                    {/* Nombre y badge */}
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'w-24 text-sm font-bold',
                          diaConfig.activo ? 'text-ink' : 'text-muted',
                        )}
                      >
                        {DIA_LABEL[dia]}
                      </span>
                      {diaConfig.activo ? (
                        <div className="flex items-center gap-1.5">
                          <Badge variant="success">Laboral</Badge>
                          <span className="text-xs font-semibold text-muted">
                            {horasDia.toLocaleString('es-SV', { maximumFractionDigits: 1 })} h
                          </span>
                        </div>
                      ) : (
                        <Badge variant="default">Descanso / Inactivo</Badge>
                      )}
                    </div>
                  </div>

                  {/* Acciones de copia rápida cuando el día está activo */}
                  {diaConfig.activo && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => copiarALunesViernes(dia)}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-field border border-line bg-canvas px-2.5 py-1 text-xs font-medium text-ink transition-colors hover:border-brand-600 hover:text-brand-600"
                        title={`Copiar turnos de ${DIA_LABEL[dia]} a Lunes–Viernes (Sábado y Domingo quedan en descanso)`}
                      >
                        <i className="ri-file-copy-line text-xs" />
                        <span>Copiar a L–V</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => copiarALunesSabado(dia)}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-field border border-line bg-canvas px-2.5 py-1 text-xs font-medium text-ink transition-colors hover:border-brand-600 hover:text-brand-600"
                        title={`Copiar turnos de ${DIA_LABEL[dia]} a Lunes–Sábado (Semana laboral completa, Domingo en descanso)`}
                      >
                        <i className="ri-calendar-check-line text-xs" />
                        <span>Copiar a L–S</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Cuerpo de la fila: Múltiples Bloques / Turnos */}
                {diaConfig.activo ? (
                  <div className="mt-3 space-y-2.5">
                    <div className="flex flex-wrap items-center gap-3">
                      {diaConfig.bloques.map((bloque, idx) => {
                        const duracionBloque = duracionEnHoras(
                          bloque.hora_inicio,
                          bloque.hora_fin,
                        );

                        return (
                          <div
                            key={bloque.idTemp}
                            className="flex items-center gap-2 rounded-field border border-line bg-canvas/60 px-3 py-1.5"
                          >
                            <span className="text-xs font-bold text-muted">T{idx + 1}:</span>

                            <div className="flex items-center gap-1">
                              <input
                                type="time"
                                value={bloque.hora_inicio}
                                onChange={(e) =>
                                  actualizarBloque(dia, idx, 'hora_inicio', e.target.value)
                                }
                                className="h-8 w-24 rounded-field border border-line bg-surface px-2 text-xs font-medium text-ink focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
                              />
                              <span className="text-xs text-muted font-semibold">a</span>
                              <input
                                type="time"
                                value={bloque.hora_fin}
                                onChange={(e) =>
                                  actualizarBloque(dia, idx, 'hora_fin', e.target.value)
                                }
                                className="h-8 w-24 rounded-field border border-line bg-surface px-2 text-xs font-medium text-ink focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
                              />
                            </div>

                            <span className="rounded bg-surface px-1.5 py-0.5 text-[11px] font-semibold text-muted border border-line/60">
                              {duracionBloque.toLocaleString('es-SV', { maximumFractionDigits: 1 })} h
                            </span>

                            {diaConfig.bloques.length > 1 && (
                              <button
                                type="button"
                                onClick={() => eliminarBloque(dia, idx)}
                                title="Eliminar este turno"
                                className="flex size-6 cursor-pointer items-center justify-center rounded-field text-muted transition-colors hover:bg-danger-soft hover:text-danger"
                              >
                                <i className="ri-close-line text-base" />
                              </button>
                            )}
                          </div>
                        );
                      })}

                      {/* Botón [+] Añadir bloque / turno */}
                      <button
                        type="button"
                        onClick={() => agregarBloque(dia)}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-field border border-dashed border-brand-300 bg-brand-50/50 px-3 py-1.5 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-100 hover:border-brand-500"
                        title="Añadir otro turno para este día (ejemplo: turno de la tarde tras el almuerzo)"
                      >
                        <i className="ri-add-line text-sm font-bold" />
                        <span>Añadir turno</span>
                      </button>
                    </div>

                    {diaConfig.bloques.length > 1 && (
                      <p className="text-[11px] text-muted">
                        <i className="ri-information-line mr-1 text-brand-600" />
                        El intervalo entre turnos representa automáticamente el tiempo libre o de almuerzo del médico.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-muted italic">
                    Día no laborable para este médico. Activa el interruptor para asignar horarios de atención.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}

export default HorarioModal;
