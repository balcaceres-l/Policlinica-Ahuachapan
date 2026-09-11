import { useState } from 'react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { useCancelarCita } from '@/hooks/cita/useCitas';
import type { Cita } from '@/types/cita.types';

interface CancelarCitaModalProps {
  cita: Cita | null;
  isOpen: boolean;
  onClose: () => void;
}

const CLASE_INPUT =
  'h-20 w-full rounded-field border border-line bg-surface p-3 text-sm text-ink outline-none ' +
  'transition-colors placeholder:text-muted focus:border-brand-600 focus:ring-4 ' +
  'focus:ring-brand-600/15 disabled:opacity-60 resize-none';

export function CancelarCitaModal({ cita, isOpen, onClose }: CancelarCitaModalProps) {
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);

  const cancelarMutation = useCancelarCita();

  const handleConfirmar = async () => {
    if (!cita) return;
    if (!motivo.trim()) {
      setError('Debes ingresar el motivo de cancelación.');
      return;
    }

    try {
      await cancelarMutation.mutateAsync({ id: cita.id, motivo: motivo.trim() });
      toast.success('Cita cancelada correctamente.');
      setMotivo('');
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cancelar la cita.';
      setError(msg);
    }
  };

  if (!cita) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cancelar Cita Médica"
      subtitle="Confirma la cancelación e ingresa el motivo correspondiente."
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={cancelarMutation.isPending}>
            Volver
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirmar}
            loading={cancelarMutation.isPending}
            icon="ri-close-circle-line"
          >
            Confirmar Cancelación
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-field border border-line bg-canvas p-3 text-xs text-ink">
          <p className="font-semibold text-ink">{cita.pacienteNombre}</p>
          <p className="text-muted">Expediente: {cita.pacienteExpediente}</p>
          <p className="text-muted">
            Médico: {cita.medicoNombre} · {cita.fecha} ({cita.hora_inicio} - {cita.hora_fin})
          </p>
        </div>

        {error && (
          <div className="rounded-field border border-danger/30 bg-danger-soft p-3 text-xs text-danger">
            <i className="ri-error-warning-line mr-1 text-sm align-middle" />
            {error}
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-semibold text-ink">
            Motivo de Cancelación <span className="text-danger">*</span>
          </label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ejemplo: Paciente notificó imposibilidad de presentarse por motivos laborales..."
            className={CLASE_INPUT}
          />
        </div>
      </div>
    </Modal>
  );
}

export default CancelarCitaModal;
