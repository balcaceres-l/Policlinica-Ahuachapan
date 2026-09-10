import { useState } from 'react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { useEliminarHorario } from '@/hooks/horario/useHorarios';
import { extraerMensajeError } from '@/lib/apiError';
import { DIA_LABEL, formatearHora } from '@/lib/constants/dias';
import type { HorarioMedico } from '@/types/horario.types';

interface ConfirmarEliminarHorarioModalProps {
  horario: HorarioMedico | null;
  onClose: () => void;
}

/** HU-34 — confirmación antes de quitar un bloque horario. */
export function ConfirmarEliminarHorarioModal({
  horario,
  onClose,
}: ConfirmarEliminarHorarioModalProps) {
  const eliminar = useEliminarHorario();
  const [error, setError] = useState<string | null>(null);

  const cerrar = () => {
    setError(null);
    onClose();
  };

  const confirmar = async () => {
    if (!horario) return;

    try {
      await eliminar.mutateAsync(horario.id);
      toast.success('Horario eliminado.');
      cerrar();
    } catch (e) {
      setError(extraerMensajeError(e, 'No se pudo eliminar el horario.'));
    }
  };

  return (
    <Modal
      isOpen={horario !== null}
      onClose={cerrar}
      title="Eliminar horario"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={cerrar} disabled={eliminar.isPending}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={() => void confirmar()}
            loading={eliminar.isPending}
            icon="ri-delete-bin-line"
          >
            Eliminar
          </Button>
        </>
      }
    >
      <p className="text-sm text-ink">
        Se quitará el bloque de{' '}
        <span className="font-semibold">
          {horario && `${DIA_LABEL[horario.dia_semana]} ${formatearHora(horario.hora_inicio)} – ${formatearHora(horario.hora_fin)}`}
        </span>
        .
      </p>

      <p className="mt-3 text-xs text-muted">
        El médico dejará de mostrar disponibilidad en ese rango al agendar citas.
      </p>

      {error && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-field bg-danger-soft px-3 py-2.5 text-sm text-danger"
        >
          <i className="ri-error-warning-line mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </Modal>
  );
}

export default ConfirmarEliminarHorarioModal;
