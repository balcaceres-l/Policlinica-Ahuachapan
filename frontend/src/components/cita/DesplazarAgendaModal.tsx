import { useState } from 'react';
import toast from 'react-hot-toast';
import SelectorMedicoCascada from '@/components/cita/SelectorMedicoCascada';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { useDesplazarAgenda } from '@/hooks/cita/useCitas';
import { extraerMensajeError } from '@/lib/apiError';

interface DesplazarAgendaModalProps {
  isOpen: boolean;
  onClose: () => void;
  fechaPredeterminada: string;
  medicoIdPredeterminado?: string;
}

const CLASE_INPUT =
  'h-11 w-full rounded-field border border-line bg-surface px-3 text-sm text-ink outline-none ' +
  'transition-colors placeholder:text-muted focus:border-brand-600 focus:ring-4 ' +
  'focus:ring-brand-600/15 disabled:opacity-60';

const ATAJOS = [15, 30, 45, 60];

/** HU-37 / RF-40 — corre las citas pendientes cuando el médico llega tarde. */
export function DesplazarAgendaModal({
  isOpen,
  onClose,
  fechaPredeterminada,
  medicoIdPredeterminado,
}: DesplazarAgendaModalProps) {
  const [medicoId, setMedicoId] = useState<string | ''>(medicoIdPredeterminado ?? '');
  const [fecha, setFecha] = useState(fechaPredeterminada);
  const [minutos, setMinutos] = useState(30);
  const [desdeHora, setDesdeHora] = useState('');
  const [error, setError] = useState<string | null>(null);

  const desplazar = useDesplazarAgenda();

  const handleConfirmar = async () => {
    setError(null);

    if (!medicoId) {
      setError('Debes seleccionar el médico que llegó tarde.');
      return;
    }
    if (minutos < 1) {
      setError('Los minutos de atraso deben ser mayores que cero.');
      return;
    }

    try {
      const resultado = await desplazar.mutateAsync({
        medicoId,
        payload: {
          fecha,
          minutos,
          desde_hora: desdeHora || undefined,
        },
      });

      const total = resultado.citas.length;
      if (total === 0) {
        toast('No había citas pendientes que desplazar.');
      } else {
        toast.success(`${total} cita(s) desplazada(s) ${minutos} minutos.`);
      }

      if (resultado.fueraDeHorario.length > 0) {
        toast(
          `${resultado.fueraDeHorario.length} cita(s) quedaron fuera del horario del médico. ` +
            'Revisa si hay que reprogramarlas.',
          { icon: '⚠️', duration: 6000 },
        );
      }

      onClose();
    } catch (err) {
      setError(extraerMensajeError(err, 'No se pudo desplazar la agenda.'));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Médico con atraso"
      subtitle="Corre las citas pendientes conservando la duración de cada una."
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={desplazar.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmar}
            loading={desplazar.isPending}
            icon="ri-time-line"
          >
            Desplazar citas
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="rounded-field border border-danger/30 bg-danger-soft p-3 text-xs text-danger">
            <i className="ri-error-warning-line mr-1 align-middle" />
            {error}
          </div>
        )}

        <SelectorMedicoCascada medicoId={medicoId} onSelectMedico={(id) => setMedicoId(id)} />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink">
              Fecha <span className="text-danger">*</span>
            </label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className={CLASE_INPUT}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink">
              Desde la hora <span className="font-normal text-muted">(opcional)</span>
            </label>
            <input
              type="time"
              value={desdeHora}
              onChange={(e) => setDesdeHora(e.target.value)}
              className={CLASE_INPUT}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-ink">
            Minutos de atraso <span className="text-danger">*</span>
          </label>
          <div className="mb-2 flex gap-2">
            {ATAJOS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMinutos(m)}
                className={`flex-1 cursor-pointer rounded-field border px-2 py-2 text-xs font-semibold transition-colors ${
                  minutos === m
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-line bg-surface text-ink hover:bg-brand-50'
                }`}
              >
                {m} min
              </button>
            ))}
          </div>
          <input
            type="number"
            min={1}
            max={480}
            value={minutos}
            onChange={(e) => setMinutos(Number(e.target.value))}
            className={CLASE_INPUT}
          />
        </div>

        <p className="rounded-field border border-line bg-canvas p-3 text-xs text-muted">
          Solo se mueven las citas agendadas y en espera. Las ya atendidas o canceladas no
          se tocan. Si alguna queda fuera de la jornada, se desplaza igual y se avisa.
        </p>
      </div>
    </Modal>
  );
}

export default DesplazarAgendaModal;
