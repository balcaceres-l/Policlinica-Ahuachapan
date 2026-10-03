import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { useEliminarPaciente } from '@/hooks/paciente/usePacientes';
import { extraerMensajeError } from '@/lib/apiError';
import type { Paciente } from '@/types/paciente.types';

interface ConfirmarFallecidoModalProps {
  paciente: Paciente | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ConfirmarFallecidoModal({
  paciente,
  isOpen,
  onClose,
}: ConfirmarFallecidoModalProps) {
  const eliminarMutation = useEliminarPaciente();

  if (!paciente) return null;

  const handleConfirmar = async () => {
    try {
      await eliminarMutation.mutateAsync(paciente.id);
      toast.success(`El paciente ${paciente.nombre_completo} ha sido marcado como fallecido.`);
      onClose();
    } catch (err: unknown) {
      toast.error(extraerMensajeError(err, 'No se pudo actualizar el estado del paciente.'));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Marcar Paciente como Fallecido"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={eliminarMutation.isPending}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirmar}
            loading={eliminarMutation.isPending}
            icon="ri-user-unfollow-line"
          >
            Confirmar Estado
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-ink">
          ¿Deseas marcar al paciente{' '}
          <strong className="text-ink font-semibold">{paciente.nombre_completo}</strong> (Expediente:{' '}
          <span className="font-mono font-bold text-brand-700">{paciente.numero_expediente}</span>) como{' '}
          <span className="font-semibold text-danger">Fallecido</span>?
        </p>
        <div className="rounded-field border border-warning/30 bg-warning-soft p-3 text-xs text-warning">
          <i className="ri-alert-line mr-1 text-sm align-middle" />
          El expediente clínico no se eliminará físicamente, pero se excluirá de la lista de pacientes activos por defecto.
        </div>
      </div>
    </Modal>
  );
}

export default ConfirmarFallecidoModal;
