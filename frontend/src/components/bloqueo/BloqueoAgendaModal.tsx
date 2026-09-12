import { useState } from 'react';
import toast from 'react-hot-toast';
import SelectorMedicoCascada from '@/components/cita/SelectorMedicoCascada';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { useCrearBloqueo } from '@/hooks/bloqueo/useBloqueos';
import { useMedicos } from '@/hooks/usuario/useUsuarios';
import { mockMedicos } from '@/services/mockData';
import type { TipoBloqueo } from '@/types/bloqueo.types';

interface BloqueoAgendaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CLASE_INPUT =
  'h-11 w-full rounded-field border border-line bg-surface px-3 text-sm text-ink outline-none ' +
  'transition-colors placeholder:text-muted focus:border-brand-600 focus:ring-4 ' +
  'focus:ring-brand-600/15 disabled:opacity-60';

export function BloqueoAgendaModal({ isOpen, onClose }: BloqueoAgendaModalProps) {
  const [medicoId, setMedicoId] = useState<string | ''>('');
  const [fecha, setFecha] = useState('');
  const [tipoBloqueo, setTipoBloqueo] = useState<TipoBloqueo>('COMPLETO');
  const [horaInicio, setHoraInicio] = useState('08:00');
  const [horaFin, setHoraFin] = useState('12:00');
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: medicos = mockMedicos } = useMedicos();
  const crearBloqueoMutation = useCrearBloqueo();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!medicoId) {
      setError('Debes seleccionar un médico.');
      return;
    }
    if (!fecha) {
      setError('Debes seleccionar la fecha a bloquear.');
      return;
    }
    const hoyStr = new Date().toISOString().split('T')[0];
    if (fecha < hoyStr) {
      setError('No se puede registrar un bloqueo de agenda para una fecha en el pasado.');
      return;
    }
    if (tipoBloqueo === 'PARCIAL') {
      if (!horaInicio || !horaFin) {
        setError('Debes indicar la hora de inicio y fin para el bloqueo parcial.');
        return;
      }
      if (horaInicio >= horaFin) {
        setError('La hora de inicio debe ser anterior a la hora de fin.');
        return;
      }
    }
    const motivoLimpio = motivo.trim();
    if (!motivoLimpio) {
      setError('Debes especificar el motivo del bloqueo o ausencia.');
      return;
    }
    if (motivoLimpio.length < 5) {
      setError('El motivo del bloqueo debe tener al menos 5 caracteres explicativos.');
      return;
    }

    const medicoSeleccionado = medicos.find((m) => m.id === medicoId);
    const medicoNombre = medicoSeleccionado?.nombreCompleto ?? 'Médico';

    try {
      await crearBloqueoMutation.mutateAsync({
        payload: {
          medico_id: medicoId,
          fecha,
          tipo_bloqueo: tipoBloqueo,
          hora_inicio: tipoBloqueo === 'PARCIAL' ? horaInicio : undefined,
          hora_fin: tipoBloqueo === 'PARCIAL' ? horaFin : undefined,
          motivo: motivo.trim(),
        },
        medicoNombre,
      });

      toast.success('Bloqueo de agenda programado exitosamente.');
      onClose();
      setMedicoId('');
      setFecha('');
      setTipoBloqueo('COMPLETO');
      setHoraInicio('08:00');
      setHoraFin('12:00');
      setMotivo('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar bloqueo.';
      setError(msg);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Bloqueo de Agenda"
      subtitle="Inhabilita la asignación de citas para un médico en una fecha específica (completo o parcial)."
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={crearBloqueoMutation.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            loading={crearBloqueoMutation.isPending}
            icon="ri-calendar-close-line"
          >
            Guardar Bloqueo
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-field border border-danger/30 bg-danger-soft p-3 text-xs text-danger">
            <i className="ri-error-warning-line mr-1 text-sm align-middle" />
            {error}
          </div>
        )}

        {/* Selector de Médico con Filtro en Cascada y Autocompletado */}
        <SelectorMedicoCascada
          medicoId={medicoId}
          onSelectMedico={(mId) => setMedicoId(mId)}
          label="Médico para Bloqueo de Agenda"
        />

        <div>
          <label className="mb-1 block text-xs font-semibold text-ink">
            Fecha de Ausencia <span className="text-danger">*</span>
          </label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className={CLASE_INPUT}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-ink">Tipo de Bloqueo</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTipoBloqueo('COMPLETO')}
              className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-field border p-2 text-xs font-semibold transition-colors ${
                tipoBloqueo === 'COMPLETO'
                  ? 'border-brand-600 bg-brand-50 text-brand-700'
                  : 'border-line text-muted hover:bg-canvas'
              }`}
            >
              <i className="ri-calendar-close-line text-base" />
              Día Completo
            </button>
            <button
              type="button"
              onClick={() => setTipoBloqueo('PARCIAL')}
              className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-field border p-2 text-xs font-semibold transition-colors ${
                tipoBloqueo === 'PARCIAL'
                  ? 'border-warning bg-warning-soft text-warning'
                  : 'border-line text-muted hover:bg-canvas'
              }`}
            >
              <i className="ri-time-line text-base" />
              Parcial (Por Horas)
            </button>
          </div>
        </div>

        {tipoBloqueo === 'PARCIAL' && (
          <div className="rounded-card border border-warning/30 bg-warning-soft/30 p-3 space-y-2">
            <p className="text-xs font-bold text-ink">Horario del Bloqueo - Formato 24 Horas</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-ink">
                  Hora Inicio <span className="text-danger">*</span>
                </label>
                <input
                  type="time"
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                  className={CLASE_INPUT}
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-ink">
                  Hora Fin <span className="text-danger">*</span>
                </label>
                <input
                  type="time"
                  value={horaFin}
                  onChange={(e) => setHoraFin(e.target.value)}
                  className={CLASE_INPUT}
                />
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-semibold text-ink">
            Motivo del Bloqueo <span className="text-danger">*</span>
          </label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ejemplo: Participación en congreso médico, permiso por vacaciones, reunión administrativa..."
            className="h-20 w-full rounded-field border border-line bg-surface p-3 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15 disabled:opacity-60 resize-none"
          />
        </div>
      </form>
    </Modal>
  );
}

export default BloqueoAgendaModal;
