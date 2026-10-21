import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import type { CorridaTrasEmergencia } from '@/types/cita.types';

interface EmergenciaCorrioCitasModalProps {
  /** Lo que pasó con las citas que chocaban con la emergencia recién agendada; null = cerrado. */
  corrida: CorridaTrasEmergencia | null;
  onClose: () => void;
}

/**
 * Al agendar una emergencia, las citas que chocaban con ella se corren solas detrás de ella.
 * Este aviso dice cuáles se corrieron (hora de antes y de ahora) y cuáles no cupieron antes de las 11 p. m.
 */
export function EmergenciaCorrioCitasModal({ corrida, onClose }: EmergenciaCorrioCitasModalProps) {
  if (!corrida) return null;

  const { plan, citasSinEspacio } = corrida;

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={plan.length > 0 ? 'Se corrieron citas por la emergencia' : 'La emergencia choca con otras citas'}
      subtitle="La emergencia ya quedó agendada."
      size="lg"
      footer={<Button onClick={onClose}>Entendido</Button>}
    >
      <div className="space-y-4">
        {plan.length > 0 && (
          <>
            <p className="text-sm text-ink">
              Las citas que chocaban pasaron detrás de la emergencia, una por una y en orden. Quedan
              marcadas como «corrida por una emergencia».
            </p>
            <ul className="divide-y divide-line rounded-field border border-line">
              {plan.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-3 p-3">
                  <div className="w-28 shrink-0 text-sm">
                    <p className="text-xs text-muted line-through">
                      {p.hora_inicio} - {p.hora_fin}
                    </p>
                    <p className="font-bold text-brand-700">
                      {p.nuevo_inicio} - {p.nuevo_fin}
                    </p>
                    {p.fueraDeHorario && (
                      <p className="text-[10px] font-bold text-warning">Fuera de su horario</p>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{p.pacienteNombre}</p>
                    <p className="text-xs text-muted">Exp: {p.pacienteExpediente}</p>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        {citasSinEspacio.length > 0 && (
          <div className="rounded-field border border-danger/30 bg-danger-soft p-3">
            <p className="text-sm font-semibold text-danger">
              <i className="ri-error-warning-line mr-1 align-middle" />
              {citasSinEspacio.length === 1
                ? '1 cita no cabe antes de las 11 p. m.'
                : `${citasSinEspacio.length} citas no caben antes de las 11 p. m.`}
            </p>
            <p className="mt-1 text-xs text-danger">
              No se pudieron correr y siguen en su hora, así que chocan con otra. Reagéndalas o, si el
              paciente ya no la quiere, cancélalas desde el Calendario global.
            </p>
            <ul className="mt-2 space-y-1 text-xs text-ink">
              {citasSinEspacio.map((c) => (
                <li key={c.id}>
                  <b>
                    {c.hora_inicio} - {c.hora_fin}
                  </b>{' '}
                  · {c.pacienteNombre}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default EmergenciaCorrioCitasModal;
