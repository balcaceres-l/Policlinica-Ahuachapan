import { useState } from 'react';
import toast from 'react-hot-toast';
import SelectorMedicoCascada from '@/components/cita/SelectorMedicoCascada';
import SelectorPacienteAutocomplete from '@/components/paciente/SelectorPacienteAutocomplete';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { useAgendarCita } from '@/hooks/cita/useCitas';
import type { TipoCita } from '@/types/cita.types';

interface AgendarCitaModalProps {
  isOpen: boolean;
  onClose: () => void;
  fechaPredeterminada?: string;
  medicoIdPredeterminado?: string;
}

const CLASE_INPUT =
  'h-11 w-full rounded-field border border-line bg-surface px-3 text-sm text-ink outline-none ' +
  'transition-colors placeholder:text-muted focus:border-brand-600 focus:ring-4 ' +
  'focus:ring-brand-600/15 disabled:opacity-60';

export function AgendarCitaModal({
  isOpen,
  onClose,
  fechaPredeterminada,
  medicoIdPredeterminado,
}: AgendarCitaModalProps) {
  const hoy = new Date().toISOString().split('T')[0];

  const [pacienteId, setPacienteId] = useState<string | ''>('');
  const [medicoId, setMedicoId] = useState<string | ''>(medicoIdPredeterminado ?? '');
  const [especialidadId, setEspecialidadId] = useState<string | undefined>(undefined);
  const [fecha, setFecha] = useState(fechaPredeterminada ?? hoy);
  const [horaInicio, setHoraInicio] = useState('15:00');
  const [horaFin, setHoraFin] = useState('15:30');
  const [tipoCita, setTipoCita] = useState<TipoCita>('REGULAR');
  const [error, setError] = useState<string | null>(null);

  const agendarMutation = useAgendarCita();

  const handleSelectMedico = (mId: string, espId?: string) => {
    setMedicoId(mId);
    setEspecialidadId(espId);
  };

  const handleHoraInicioChange = (inicio: string) => {
    setHoraInicio(inicio);
    // Auto-calcula 30 min por defecto
    const [h, m] = inicio.split(':').map(Number);
    const totalMin = h * 60 + m + 30;
    const finH = String(Math.floor(totalMin / 60) % 24).padStart(2, '0');
    const finM = String(totalMin % 60).padStart(2, '0');
    setHoraFin(`${finH}:${finM}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!pacienteId) {
      setError('Debes seleccionar un paciente.');
      return;
    }
    if (!medicoId) {
      setError('Debes seleccionar un médico.');
      return;
    }
    if (!fecha) {
      setError('Debes indicar la fecha de la cita.');
      return;
    }
    const hoyStr = new Date().toISOString().split('T')[0];
    if (fecha < hoyStr) {
      setError('No se pueden agendar citas para fechas en el pasado.');
      return;
    }
    if (!horaInicio || !horaFin) {
      setError('Debes especificar la hora de inicio y de fin.');
      return;
    }
    if (horaInicio >= horaFin) {
      setError('La hora de inicio debe ser anterior a la hora de fin.');
      return;
    }

    try {
      await agendarMutation.mutateAsync({
        paciente_id: pacienteId,
        medico_id: medicoId,
        especialidad_id: especialidadId,
        fecha,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        tipo_cita: tipoCita,
      });

      toast.success('Cita agendada exitosamente.');
      onClose();
      // Limpiar formulario al cerrar
      setPacienteId('');
      if (!medicoIdPredeterminado) {
        setMedicoId('');
        setEspecialidadId(undefined);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al agendar cita.';
      setError(msg);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Agendar Nueva Cita"
      subtitle="Programa una consulta médica regular, de emergencia o sobrecupo."
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={agendarMutation.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            loading={agendarMutation.isPending}
            icon="ri-calendar-check-line"
          >
            Confirmar Cita
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

        {/* Selector de Paciente con Autocompletado */}
        <SelectorPacienteAutocomplete
          pacienteId={pacienteId}
          onSelectPaciente={setPacienteId}
        />

        {/* Selector de Médico con Filtro en Cascada por Especialidad y Autocompletado */}
        <SelectorMedicoCascada
          medicoId={medicoId}
          onSelectMedico={handleSelectMedico}
        />

        <div className="grid grid-cols-3 gap-3">
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
              Hora Inicio <span className="text-danger">*</span>
            </label>
            <input
              type="time"
              value={horaInicio}
              onChange={(e) => handleHoraInicioChange(e.target.value)}
              className={CLASE_INPUT}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink">
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

        <div>
          <label className="mb-1 block text-xs font-semibold text-ink">Tipo de Cita</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setTipoCita('REGULAR')}
              className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-field border p-2 text-xs font-semibold transition-colors ${
                tipoCita === 'REGULAR'
                  ? 'border-brand-600 bg-brand-50 text-brand-700'
                  : 'border-line text-muted hover:bg-canvas'
              }`}
            >
              <i className="ri-calendar-line" />
              Regular
            </button>
            <button
              type="button"
              onClick={() => setTipoCita('EMERGENCIA')}
              className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-field border p-2 text-xs font-semibold transition-colors ${
                tipoCita === 'EMERGENCIA'
                  ? 'border-danger bg-danger-soft text-danger'
                  : 'border-line text-muted hover:bg-canvas'
              }`}
            >
              <i className="ri-alarm-warning-line" />
              Emergencia
            </button>
            <button
              type="button"
              onClick={() => setTipoCita('SOBRECUPO')}
              className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-field border p-2 text-xs font-semibold transition-colors ${
                tipoCita === 'SOBRECUPO'
                  ? 'border-warning bg-warning-soft text-warning'
                  : 'border-line text-muted hover:bg-canvas'
              }`}
            >
              <i className="ri-user-add-line" />
              Sobrecupo
            </button>
          </div>
          {tipoCita !== 'REGULAR' && (
            <p className="mt-1.5 text-[11px] text-muted">
              * Las citas de emergencia y sobrecupo omiten la restricción estándar de disponibilidad.
            </p>
          )}
        </div>
      </form>
    </Modal>
  );
}

export default AgendarCitaModal;
