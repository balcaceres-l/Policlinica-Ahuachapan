import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import SelectorPacienteAutocomplete from '@/components/paciente/SelectorPacienteAutocomplete';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { useConsultaInmediata, useEspecialidadesDisponibles } from '@/hooks/medico/useConsultas';
import { extraerMensajeError } from '@/lib/apiError';

interface ConsultaInmediataModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Paciente recién registrado desde este flujo; llega ya seleccionado. */
  pacienteInicialId?: string;
  /** Abre el registro de paciente nuevo (el mismo formulario de recepción). */
  onRegistrarNuevo: () => void;
}

/**
 * Consulta inmediata: el médico atiende a alguien que llegó sin cita previa.
 * Elige al paciente (o lo registra si es nuevo) y la consulta se abre de una vez.
 */
export function ConsultaInmediataModal({
  isOpen,
  onClose,
  pacienteInicialId,
  onRegistrarNuevo,
}: ConsultaInmediataModalProps) {
  const navigate = useNavigate();
  const { data: especialidades = [] } = useEspecialidadesDisponibles();
  const iniciarMutation = useConsultaInmediata();

  const [pacienteId, setPacienteId] = useState(pacienteInicialId ?? '');
  const [especialidadId, setEspecialidadId] = useState('');
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Un paciente recién registrado reemplaza la selección anterior.
  const [inicialAplicado, setInicialAplicado] = useState(pacienteInicialId);
  if (pacienteInicialId !== inicialAplicado) {
    setInicialAplicado(pacienteInicialId);
    setPacienteId(pacienteInicialId ?? '');
  }

  const variasEspecialidades = especialidades.length > 1;

  const cerrar = () => {
    setPacienteId('');
    setEspecialidadId('');
    setMotivo('');
    setError(null);
    onClose();
  };

  const iniciar = async () => {
    setError(null);
    if (!pacienteId) {
      setError('Elige al paciente o regístralo si es nuevo.');
      return;
    }
    if (variasEspecialidades && !especialidadId) {
      setError('Elige con qué especialidad atiendes esta consulta.');
      return;
    }

    try {
      const consulta = await iniciarMutation.mutateAsync({
        paciente_id: pacienteId,
        especialidad_atencion_id: especialidadId || undefined,
        motivo_consulta: motivo.trim() || undefined,
      });
      toast.success('Consulta iniciada sin cita previa.');
      cerrar();
      navigate(`/medico/consulta/${consulta.id}`);
    } catch (err) {
      setError(extraerMensajeError(err, 'No se pudo iniciar la consulta.'));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={cerrar}
      title="Consulta inmediata"
      subtitle="Atiende a un paciente que llegó sin cita previa."
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={cerrar} disabled={iniciarMutation.isPending}>
            Cancelar
          </Button>
          <Button icon="ri-stethoscope-line" onClick={iniciar} loading={iniciarMutation.isPending}>
            Iniciar consulta
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="rounded-field border border-danger/30 bg-danger-soft p-3 text-xs text-danger">
            <i className="ri-error-warning-line mr-1 align-middle text-sm" />
            {error}
          </div>
        )}

        <div>
          <SelectorPacienteAutocomplete
            pacienteId={pacienteId}
            onSelectPaciente={setPacienteId}
            label="Paciente"
          />
          <button
            type="button"
            onClick={onRegistrarNuevo}
            className="mt-2 inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-brand-700 hover:text-brand-900"
          >
            <i className="ri-user-add-line" />
            ¿Es un paciente nuevo? Registrarlo
          </button>
        </div>

        {variasEspecialidades && (
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink">
              Especialidad con la que atiendes <span className="text-danger">*</span>
            </label>
            <select
              value={especialidadId}
              onChange={(e) => setEspecialidadId(e.target.value)}
              className="h-11 w-full rounded-field border border-line bg-surface px-3 text-sm text-ink outline-none transition-colors focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15"
            >
              <option value="">Selecciona una especialidad…</option>
              {especialidades.map((esp) => (
                <option key={esp.id} value={esp.id}>
                  {esp.nombre}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-semibold text-ink">
            Motivo de consulta (opcional)
          </label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Ej. dolor abdominal desde la mañana"
            className="w-full rounded-field border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15"
          />
        </div>

        <p className="text-xs text-muted">
          <i className="ri-information-line mr-1" />
          Se registra como cita "Sin cita previa" a la hora actual, sin revisar tu horario ni tu
          disponibilidad.
        </p>
      </div>
    </Modal>
  );
}

export default ConsultaInmediataModal;
