import { useEffect, useState } from "react";

interface CronometroConsultaProps {
  inicio?: number;
  fin?: number;
  activo: boolean;
  segundosIniciales?: number;
  enPausa?: boolean;
  onPausaToggle?: () => void;
  onTick?: (segundos: number) => void;
}

export default function CronometroConsulta({
  inicio,
  fin,
  activo,
  segundosIniciales,
  enPausa = false,
  onPausaToggle,
  onTick,
}: CronometroConsultaProps) {
  // Si nos pasan segundosIniciales (desde el backend), contamos a partir de ahí
  const [segundosAcumulados, setSegundosAcumulados] = useState<number>(() => {
    if (segundosIniciales !== undefined && segundosIniciales > 0) {
      return segundosIniciales;
    }
    if (inicio !== undefined) {
      return Math.max(0, Math.floor(((fin ?? Date.now()) - inicio) / 1000));
    }
    return 0;
  });

  useEffect(() => {
    if (segundosIniciales !== undefined) {
      setSegundosAcumulados(segundosIniciales);
    }
  }, [segundosIniciales]);

  useEffect(() => {
    if (!activo || enPausa || fin !== undefined) return;

    const intervalo = window.setInterval(() => {
      setSegundosAcumulados((prev) => {
        const siguiente = prev + 1;
        onTick?.(siguiente);
        return siguiente;
      });
    }, 1000);

    return () => window.clearInterval(intervalo);
  }, [activo, enPausa, fin, onTick]);

  const segundos = segundosAcumulados;
  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  const resto = segundos % 60;

  const tiempo = [horas, minutos, resto]
    .map((valor) => String(valor).padStart(2, "0"))
    .join(":");

  const fase =
    segundos >= 1800
      ? {
          nombre: "Rojo",
          clases: "bg-red-50 text-red-800 border-red-400",
        }
      : segundos >= 1500
        ? {
            nombre: "Naranja",
            clases: "bg-orange-50 text-orange-900 border-orange-400",
          }
        : segundos >= 900
          ? {
              nombre: "Amarillo",
              clases: "bg-yellow-50 text-yellow-900 border-yellow-400",
            }
          : {
              nombre: "Verde",
              clases: "bg-emerald-50 text-emerald-800 border-emerald-300",
            };

  return (
    <section
      aria-label="Cronómetro de consulta"
      className={`rounded-card border p-4 shadow-card ${fase.clases}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide">
          Tiempo de consulta
        </p>

        <span
          className="cursor-help text-sm"
          title={
            "Verde: 0–14:59\n" +
            "Amarillo: 15:00–24:59\n" +
            "Naranja: 25:00–29:59\n" +
            "Rojo: desde 30:00"
          }
          aria-label="Información sobre los límites de tiempo"
        >
          <i className="ri-information-line" />
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <p
          role="timer"
          aria-live="off"
          className="font-mono text-3xl font-bold tabular-nums"
        >
          {tiempo}
        </p>

        {activo && onPausaToggle ? (
          <button
            type="button"
            onClick={onPausaToggle}
            className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-current/30 bg-surface/60 text-lg transition-transform hover:scale-105 active:scale-95"
            title={enPausa ? "Reanudar cronómetro" : "Pausar cronómetro"}
            aria-label={enPausa ? "Reanudar cronómetro" : "Pausar cronómetro"}
          >
            <i className={enPausa ? "ri-play-fill" : "ri-pause-fill"} />
          </button>
        ) : (
          <i className="ri-timer-line text-2xl opacity-80" />
        )}
      </div>

      <div className="mt-2 flex items-center justify-between text-xs font-medium">
        <span className="text-muted">
          {segundosIniciales !== undefined && segundosIniciales > 0 && (
            <span>Acumulado: {Math.floor(segundos / 60)} min</span>
          )}
        </span>

        <span>
          {!activo ? (
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-800">
              <i className="ri-checkbox-circle-line" />
              Finalizada
            </span>
          ) : enPausa ? (
            <span className="inline-flex items-center gap-1 font-bold text-amber-800">
              <i className="ri-pause-circle-line" />
              En pausa
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 font-bold text-emerald-800">
              <span className="size-2 rounded-full bg-emerald-600 animate-pulse" />
              En curso
            </span>
          )}
        </span>
      </div>

      {segundos >= 1800 && activo && !enPausa && (
        <p
          role="alert"
          className="mt-3 border-t border-current/20 pt-2 text-xs font-semibold"
        >
          <i className="ri-alert-line mr-1" />
          Tiempo de consulta excedido (30+ min).
        </p>
      )}
    </section>
  );
}
