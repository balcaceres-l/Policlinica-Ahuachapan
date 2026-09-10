import { useState } from 'react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { useReprogramarCita } from '@/hooks/cita/useCitas';
import type { Cita } from '@/types/cita.types';

interface ReprogramarCitaModalProps {
  cita: Cita | null;
  isOpen: boolean;
  onClose: () => void;
}

const CLASE_INPUT =
  'h-11 w-full rounded-field border border-line bg-surface px-3 text-sm text-ink outline-none ' +
  'transition-colors placeholder:text-muted focus:border-brand-600 focus:ring-4 ' +
  'focus:ring-brand-600/15 disabled:opacity-60';

interface FormularioProps {
  cita: Cita;
  onClose: () => void;
}

function FormularioReprogramar({ cita, onClose }: FormularioProps) {
  const [nuevaFecha, setNuevaFecha] = useState(cita.fecha);
  const [nuevaHoraInicio, setNuevaHoraInicio] = useState(cita.hora_inicio);
  const [nuevaHoraFin, setNuevaHoraFin] = useState(cita.hora_fin);
  const [error, setError] = useState<string | null>(null);

  const reprogramarMutation = useReprogramarCita();

  const handleHoraInicioChange = (inicio: string) => {
    setNuevaHoraInicio(inicio);
    const [h, m] = inicio.split(':').map(Number);
    const totalMin = h * 60 + m + 30;
    const finH = String(Math.floor(totalMin / 60) % 24).padStart(2, '0');
    const finM = String(totalMin % 60).padStart(2, '0');
    setNuevaHoraFin(`${finH}:${finM}`);
  };

  const handleConfirmar = async () => {
    if (!nuevaFecha) {
      setError('Debes ingresar la nueva fecha.');
      return;
    }
    if (nuevaHoraInicio >= nuevaHoraFin) {
      setError('La hora de inicio debe ser anterior a la hora de fin.');
      return;
    }

    try {
      await reprogramarMutation.mutateAsync({
        id: cita.id,
        payload: {
          fecha: nuevaFecha,
          hora_inicio: nuevaHoraInicio,
          hora_fin: nuevaHoraFin,
        },
      });
      toast.success('Cita reprogramada exitosamente.');
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al reprogramar la cita.';
      setError(msg);
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="rounded-field border border-line bg-canvas p-3 text-xs text-ink">
          <p className="font-semibold text-ink">{cita.pacienteNombre}</p>
          <p className="text-muted">Expediente: {cita.pacienteExpediente}</p>
          <p className="text-muted">
            Médico: {cita.medicoNombre} · Horario actual: {cita.fecha} ({cita.hora_inicio} -{' '}
            {cita.hora_fin})
          </p>
        </div>

        {error && (
          <div className="rounded-field border border-danger/30 bg-danger-soft p-3 text-xs text-danger">
            <i className="ri-error-warning-line mr-1 text-sm align-middle" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink">
              Nueva Fecha <span className="text-danger">*</span>
            </label>
            <input
              type="date"
              value={nuevaFecha}
              onChange={(e) => setNuevaFecha(e.target.value)}
              className={CLASE_INPUT}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink">
              Nueva Hora Inicio <span className="text-danger">*</span>
            </label>
            <input
              type="time"
              value={nuevaHoraInicio}
              onChange={(e) => handleHoraInicioChange(e.target.value)}
              className={CLASE_INPUT}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink">
              Nueva Hora Fin <span className="text-danger">*</span>
            </label>
            <input
              type="time"
              value={nuevaHoraFin}
              onChange={(e) => setNuevaHoraFin(e.target.value)}
              className={CLASE_INPUT}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3 border-t border-line pt-4">
        <Button variant="secondary" onClick={onClose} disabled={reprogramarMutation.isPending}>
          Cancelar
        </Button>
        <Button
          onClick={handleConfirmar}
          loading={reprogramarMutation.isPending}
          icon="ri-calendar-event-line"
        >
          Guardar Cambio
        </Button>
      </div>
    </>
  );
}

export function ReprogramarCitaModal({ cita, isOpen, onClose }: ReprogramarCitaModalProps) {
  if (!isOpen || !cita) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reprogramar Cita"
      subtitle="Asigna una nueva fecha u horario para la cita seleccionada."
      size="md"
    >
      <FormularioReprogramar key={cita.id} cita={cita} onClose={onClose} />
    </Modal>
  );
}

export default ReprogramarCitaModal;
