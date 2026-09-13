import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import { useCitas, useMarcarLlegada } from '@/hooks/cita/useCitas';
import { minutosTranscurridosDesde } from '@/lib/utils';
import type { Cita } from '@/types/cita.types';

const obtenerFechaLocal = (d = new Date()) => {
  const anio = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
};

/** AC-43: se avisa a la Recepcionista cuando el paciente supera este umbral. */
const UMBRAL_RETRASO_MIN = 20;

/**
 * HU-38 — Alerta de retraso del paciente a su cita.
 * Revisa (con un cronómetro cada 30s, TASK-62) las citas de hoy que siguen
 * `AGENDADA` sin `hora_llegada` y superan los 20 minutos desde su hora de
 * inicio, para que la Recepcionista pueda reubicar al paciente al final de
 * la fila de atención en lugar de conservar su horario original (AC-44).
 */
export function AlertaRetrasoPacientes() {
  const hoyStr = useMemo(() => obtenerFechaLocal(), []);
  const [, forzarActualizacion] = useState(0);

  useEffect(() => {
    const intervalo = setInterval(() => forzarActualizacion((n) => n + 1), 30_000);
    return () => clearInterval(intervalo);
  }, []);

  const { data: citasHoy = [] } = useCitas({ fecha: hoyStr });
  const marcarLlegadaMutation = useMarcarLlegada();

  const citasConRetraso = useMemo(
    () =>
      citasHoy
        .filter((c) => c.estado === 'AGENDADA' && !c.hora_llegada)
        .map((c) => ({ cita: c, minutos: minutosTranscurridosDesde(c.hora_inicio) }))
        .filter(({ minutos }) => minutos > UMBRAL_RETRASO_MIN)
        .sort((a, b) => b.minutos - a.minutos),
    [citasHoy],
  );

  if (citasConRetraso.length === 0) return null;

  const handleReubicar = async (cita: Cita) => {
    try {
      // Reutiliza el mismo flujo de "marcar llegada" (HU-13): siempre asigna
      // el siguiente número de orden de atención disponible, es decir, al
      // final de la fila del día, sin conservar el horario original (AC-44).
      await marcarLlegadaMutation.mutateAsync(cita.id);
      toast.success(
        `${cita.pacienteNombre} fue reubicado al final de la fila de atención por retraso.`,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudo reubicar la cita.';
      toast.error(msg);
    }
  };

  return (
    <div className="mb-6 rounded-card border border-danger/30 bg-danger-soft p-4">
      <div className="mb-3 flex items-center gap-2">
        <i className="ri-alarm-warning-line text-lg text-danger" />
        <p className="text-sm font-bold text-danger">
          {citasConRetraso.length === 1
            ? '1 paciente supera los 20 minutos de retraso'
            : `${citasConRetraso.length} pacientes superan los 20 minutos de retraso`}
        </p>
      </div>

      <ul className="space-y-2">
        {citasConRetraso.map(({ cita, minutos }) => (
          <li
            key={cita.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-field border border-danger/20 bg-surface px-3 py-2"
          >
            <div>
              <p className="text-sm font-semibold text-ink">{cita.pacienteNombre}</p>
              <p className="text-xs text-muted">
                {cita.medicoNombre} · Cita a las {cita.hora_inicio} · {minutos} min de retraso
              </p>
            </div>
            <Button
              variant="danger"
              size="sm"
              icon="ri-arrow-down-line"
              onClick={() => handleReubicar(cita)}
              loading={marcarLlegadaMutation.isPending}
            >
              Reubicar al final de la fila
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default AlertaRetrasoPacientes;
