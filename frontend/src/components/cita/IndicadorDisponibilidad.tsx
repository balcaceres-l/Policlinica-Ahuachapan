import { useDisponibilidad } from '@/hooks/cita/useCitas';
import { cn } from '@/lib/utils';

interface IndicadorDisponibilidadProps {
  medicoId?: string;
  fecha?: string;
  /** Bloque elegido, en formato 'HH:mm'. */
  horaSeleccionada?: string;
  onSelect: (horaInicio: string, horaFin: string) => void;
}

const CAJA = 'rounded-field border border-line bg-canvas p-3 text-center text-xs text-muted';

/** HU-17 / RF-18 — bloques libres del médico en la fecha elegida. */
export function IndicadorDisponibilidad({
  medicoId,
  fecha,
  horaSeleccionada,
  onSelect,
}: IndicadorDisponibilidadProps) {
  const { data, isLoading, isError } = useDisponibilidad(medicoId, fecha);

  if (!medicoId || !fecha) {
    return <div className={CAJA}>Selecciona un médico y una fecha para ver sus bloques libres.</div>;
  }

  if (isLoading) {
    return (
      <div className={CAJA}>
        <i className="ri-loader-4-line mr-1 animate-spin align-middle" />
        Consultando disponibilidad...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-field border border-danger/30 bg-danger-soft p-3 text-center text-xs text-danger">
        <i className="ri-error-warning-line mr-1 align-middle" />
        No se pudo consultar la disponibilidad.
      </div>
    );
  }

  if (data?.bloqueado) {
    return (
      <div className="rounded-field border border-danger/30 bg-danger-soft p-3 text-center text-xs text-danger">
        <i className="ri-calendar-close-line mr-1 align-middle" />
        El médico tiene la agenda bloqueada ese día.
      </div>
    );
  }

  if (!data?.bloques.length) {
    return (
      <div className="rounded-field border border-warning/30 bg-warning-soft p-3 text-center text-xs text-warning">
        <i className="ri-time-line mr-1 align-middle" />
        Sin bloques libres. Revisa el horario configurado del médico para ese día.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-ink">Bloques disponibles</span>
        <span className="text-xs text-muted">
          {data.bloques.length} {data.bloques.length === 1 ? 'bloque' : 'bloques'}
        </span>
      </div>

      <div className="grid max-h-40 grid-cols-4 gap-2 overflow-y-auto pr-1">
        {data.bloques.map((bloque) => {
          const activo = horaSeleccionada === bloque.hora_inicio;

          return (
            <button
              key={bloque.hora_inicio}
              type="button"
              onClick={() => onSelect(bloque.hora_inicio, bloque.hora_fin)}
              title={`${bloque.hora_inicio} – ${bloque.hora_fin}`}
              className={cn(
                'cursor-pointer rounded-field border px-2 py-2 text-xs font-semibold transition-colors',
                activo
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-line bg-surface text-ink hover:border-brand-400 hover:bg-brand-50',
              )}
            >
              {bloque.hora_inicio}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default IndicadorDisponibilidad;
