import { useState } from 'react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { useCambiarEstadoEspecialidad } from '@/hooks/especialidad/useEspecialidades';
import { extraerMensajeError } from '@/lib/apiError';
import type { Especialidad } from '@/types/especialidad.types';

interface ConfirmarEstadoEspecialidadModalProps {
  especialidad: Especialidad | null;
  onClose: () => void;
}

/** HU-07 — activa o desactiva una especialidad del catálogo. */
export function ConfirmarEstadoEspecialidadModal({
  especialidad,
  onClose,
}: ConfirmarEstadoEspecialidadModalProps) {
  const cambiarEstado = useCambiarEstadoEspecialidad();
  const [error, setError] = useState<string | null>(null);

  const desactivando = especialidad?.estado === 'ACTIVA';
  const nuevoEstado = desactivando ? 'INACTIVA' : 'ACTIVA';

  const cerrar = () => {
    setError(null);
    onClose();
  };

  const confirmar = async () => {
    if (!especialidad) return;

    try {
      await cambiarEstado.mutateAsync({ especialidad, estado: nuevoEstado });
      toast.success(desactivando ? 'Especialidad desactivada.' : 'Especialidad activada.');
      cerrar();
    } catch (e) {
      setError(extraerMensajeError(e, 'No se pudo cambiar el estado de la especialidad.'));
    }
  };

  return (
    <Modal
      isOpen={especialidad !== null}
      onClose={cerrar}
      title={desactivando ? 'Desactivar especialidad' : 'Activar especialidad'}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={cerrar} disabled={cambiarEstado.isPending}>
            Cancelar
          </Button>
          <Button
            variant={desactivando ? 'danger' : 'primary'}
            onClick={() => void confirmar()}
            loading={cambiarEstado.isPending}
            icon={desactivando ? 'ri-forbid-line' : 'ri-checkbox-circle-line'}
          >
            {desactivando ? 'Desactivar' : 'Activar'}
          </Button>
        </>
      }
    >
      <p className="text-sm text-ink">
        {desactivando ? (
          <>
            <span className="font-semibold">{especialidad?.nombre}</span> dejará de aparecer en
            el catálogo de recepción y no se podrá asignar a nuevos médicos.
          </>
        ) : (
          <>
            <span className="font-semibold">{especialidad?.nombre}</span> volverá a estar
            disponible en el catálogo y podrá asignarse a médicos.
          </>
        )}
      </p>

      <p className="mt-3 text-xs text-muted">
        Las asignaciones que ya tengan los médicos se conservan.
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

export default ConfirmarEstadoEspecialidadModal;
