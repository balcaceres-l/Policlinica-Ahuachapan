import { useState } from 'react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { useCambiarEstadoUsuario } from '@/hooks/usuario/useUsuarios';
import { extraerMensajeError } from '@/lib/apiError';
import type { Usuario } from '@/types/user.types';

interface ConfirmarEstadoModalProps {
  usuario: Usuario | null;
  onClose: () => void;
}

export function ConfirmarEstadoModal({ usuario, onClose }: ConfirmarEstadoModalProps) {
  const cambiarEstado = useCambiarEstadoUsuario();
  const [error, setError] = useState<string | null>(null);

  const desactivando = usuario?.estado === 'ACTIVO';
  const nuevoEstado = desactivando ? 'INACTIVO' : 'ACTIVO';

  const cerrar = () => {
    setError(null);
    onClose();
  };

  const confirmar = async () => {
    if (!usuario) return;

    try {
      await cambiarEstado.mutateAsync({ id: usuario.id, estado: nuevoEstado });
      toast.success(desactivando ? 'Cuenta desactivada.' : 'Cuenta activada.');
      cerrar();
    } catch (e) {
      setError(extraerMensajeError(e, 'No se pudo cambiar el estado de la cuenta.'));
    }
  };

  return (
    <Modal
      isOpen={usuario !== null}
      onClose={cerrar}
      title={desactivando ? 'Desactivar cuenta' : 'Activar cuenta'}
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
            <span className="font-semibold">{usuario?.nombreCompleto}</span> no podrá iniciar
            sesión y se cerrará la sesión que tenga abierta.
          </>
        ) : (
          <>
            <span className="font-semibold">{usuario?.nombreCompleto}</span> volverá a tener
            acceso al sistema con sus credenciales actuales.
          </>
        )}
      </p>

      <p className="mt-3 text-xs text-muted">
        La cuenta y su historial se conservan; solo cambia el acceso.
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

export default ConfirmarEstadoModal;
