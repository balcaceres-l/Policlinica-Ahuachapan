import Badge from '@/components/ui/Badge';
import type { ConsultaHistorial } from '@/types/historial.types';

interface ConsultaHistorialCardProps {
  consulta: ConsultaHistorial;
}

/** Laravel entrega `YYYY-MM-DD HH:mm:ss`; se normaliza a ISO para parsearlo igual en todos los navegadores. */
const aFecha = (valor: string): Date => new Date(valor.replace(' ', 'T'));

const formatearDia = (valor: string): string =>
  aFecha(valor).toLocaleDateString('es-SV', { day: '2-digit', month: 'long', year: 'numeric' });

const formatearHora = (valor: string): string =>
  aFecha(valor).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit', hour12: true });

const ETIQUETA_SECCION = 'text-xs font-bold uppercase tracking-wide text-muted';

/** HU-22 — una consulta previa con sus diagnósticos, plan de manejo y examen físico. */
export function ConsultaHistorialCard({ consulta }: ConsultaHistorialCardProps) {
  const { diagnosticos, plan_manejo: plan, examen_fisico: examen } = consulta;

  return (
    <article className="rounded-card border border-line bg-surface p-5 shadow-card">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <time
            dateTime={aFecha(consulta.fecha_hora_inicio).toISOString()}
            className="text-base font-bold text-ink"
          >
            {formatearDia(consulta.fecha_hora_inicio)}
          </time>
          <p className="mt-0.5 text-xs text-muted">
            {formatearHora(consulta.fecha_hora_inicio)} · {consulta.medicoNombre}
          </p>
        </div>

        {consulta.especialidadNombre && <Badge variant="info">{consulta.especialidadNombre}</Badge>}
      </header>

      {consulta.motivo_consulta && (
        <p className="mt-3 text-sm text-ink">
          <span className="font-semibold">Motivo: </span>
          {consulta.motivo_consulta}
        </p>
      )}

      <section className="mt-4">
        <h3 className={ETIQUETA_SECCION}>Diagnósticos</h3>
        {diagnosticos.length === 0 ? (
          <p className="mt-1 text-sm italic text-muted">Sin diagnóstico registrado.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {diagnosticos.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-2 text-sm text-ink">
                {d.codigo_cie10 ? (
                  <Badge variant="royal">{d.codigo_cie10}</Badge>
                ) : (
                  <Badge variant="default">Texto libre</Badge>
                )}
                <span>{d.descripcion}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-4">
        <h3 className={ETIQUETA_SECCION}>Plan de manejo</h3>
        {plan ? (
          <p className="mt-1 whitespace-pre-line text-sm text-ink">{plan.indicaciones}</p>
        ) : (
          <p className="mt-1 text-sm italic text-muted">Sin plan de manejo registrado.</p>
        )}
      </section>

      {/* HU-19 — el examen físico queda asociado a la consulta y se ve en el expediente. */}
      {examen && (
        <details className="mt-4 rounded-field border border-line bg-canvas px-3 py-2">
          <summary className="cursor-pointer text-sm font-semibold text-brand-700">Examen físico</summary>
          <p className="mt-2 whitespace-pre-line text-sm text-ink">{examen}</p>
        </details>
      )}
    </article>
  );
}

export default ConsultaHistorialCard;
