import { useEffect, useState } from "react";

interface CronometroConsultaProps {
  inicio: number;
  fin?: number;
  activo: boolean;
}

export default function CronometroConsulta({
  inicio,
  fin,
  activo,
}: CronometroConsultaProps) {
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    if (!activo || fin !== undefined) return;

    const intervalo = window.setInterval(() => {
      setAhora(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalo);
  }, [activo, fin, inicio]);

  const segundos = Math.max(0, Math.floor(((fin ?? ahora) - inicio) / 1000));

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

        <i className="ri-timer-line text-2xl" />
      </div>

      <p className="mt-2 text-right text-xs font-medium">
        {activo ? "En curso" : "Finalizada"}
      </p>

      {segundos >= 1800 && activo && (
        <p
          role="alert"
          className="mt-3 border-t border-current/20 pt-2 text-xs font-semibold"
        >
          <i className="ri-alert-line mr-1" />
          Tiempo de consulta excedido.
        </p>
      )}
    </section>
  );
}
