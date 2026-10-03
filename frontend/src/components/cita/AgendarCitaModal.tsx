import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import IndicadorDisponibilidad from '@/components/cita/IndicadorDisponibilidad';
import SelectorMedicoCascada from '@/components/cita/SelectorMedicoCascada';
import SelectorPacienteAutocomplete from '@/components/paciente/SelectorPacienteAutocomplete';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { useAuth } from '@/hooks/auth/useAuth';
import { useAgendarCita } from '@/hooks/cita/useCitas';
import { useEspecialidadesDeMedico } from '@/hooks/especialidad/useEspecialidades';
import { getIniciales, obtenerFechaLocal, obtenerHoraLocal } from '@/lib/utils';
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
  const hoy = obtenerFechaLocal();
  const { usuario } = useAuth();
  const esMedico = usuario?.rol === 'MEDICO';

  const [pacienteId, setPacienteId] = useState<string | ''>('');
  const [medicoId, setMedicoId] = useState<string | ''>(
    esMedico ? (usuario?.id ?? '') : (medicoIdPredeterminado ?? ''),
  );
  const [especialidadId, setEspecialidadId] = useState<string | undefined>(undefined);
  const [fecha, setFecha] = useState(fechaPredeterminada ?? hoy);
  const [horaInicio, setHoraInicio] = useState('15:00');
  const [horaFin, setHoraFin] = useState('15:30');
  const [tipoCita, setTipoCita] = useState<TipoCita>('REGULAR');
  const [error, setError] = useState<string | null>(null);

  const agendarMutation = useAgendarCita();

  // Si es médico, consultamos estrictamente sus especialidades asignadas
  const medicoIdParaEspecialidades = esMedico ? usuario?.id : medicoId;
  const { data: especialidadesMedico = [], isLoading: cargandoEspecialidades } =
    useEspecialidadesDeMedico(medicoIdParaEspecialidades || null);

  // Sincronizar fecha y médico cuando cambien las props o el usuario
  useEffect(() => {
    if (fechaPredeterminada) {
      setFecha(fechaPredeterminada);
    }
  }, [fechaPredeterminada]);

  useEffect(() => {
    if (esMedico && usuario?.id) {
      setMedicoId(usuario.id);
    } else if (medicoIdPredeterminado) {
      setMedicoId(medicoIdPredeterminado);
    }
  }, [esMedico, usuario?.id, medicoIdPredeterminado]);

  // Si el médico solo tiene una especialidad asignada, seleccionarla por defecto
  useEffect(() => {
    if (esMedico && especialidadesMedico.length === 1 && !especialidadId) {
      setEspecialidadId(especialidadesMedico[0].id);
    }
  }, [esMedico, especialidadesMedico, especialidadId]);

  const handleSelectMedico = (mId: string, espId?: string) => {
    if (esMedico) return; // Un médico no puede cambiar a otro médico
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

    const medicoFinalId = esMedico ? (usuario?.id ?? '') : medicoId;

    if (!pacienteId) {
      setError('Debes seleccionar un paciente.');
      return;
    }
    if (!medicoFinalId) {
      setError('Debes especificar el médico para la cita.');
      return;
    }
    if (esMedico && especialidadesMedico.length > 0 && !especialidadId) {
      setError('Debes seleccionar una de tus especialidades asignadas.');
      return;
    }
    if (!fecha) {
      setError('Debes indicar la fecha de la cita.');
      return;
    }
    const hoyStr = obtenerFechaLocal();
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
    const horaActual = obtenerHoraLocal();
    if (fecha === hoyStr && tipoCita === 'REGULAR' && horaInicio < horaActual) {
      setError(
        `No se puede agendar a las ${horaInicio} porque esa hora ya transcurrió hoy (hora actual: ${horaActual}).`,
      );
      return;
    }

    try {
      await agendarMutation.mutateAsync({
        paciente_id: pacienteId,
        medico_id: medicoFinalId,
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
      if (!esMedico && !medicoIdPredeterminado) {
        setMedicoId('');
        setEspecialidadId(undefined);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al agendar cita.';
      setError(msg);
    }
  };

  const medicoEfectivoId = esMedico ? usuario?.id : medicoId;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={esMedico ? 'Agendar Cita en Mi Agenda' : 'Agendar Nueva Cita'}
      subtitle={
        esMedico
          ? 'Programa una consulta para tus especialidades asignadas.'
          : 'Programa una consulta médica regular, de emergencia o sobrecupo.'
      }
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

        {/* Modo Médico: Se bloquea al médico logueado y solo elige entre sus especialidades */}
        {esMedico ? (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink">
                Médico Asignado
              </label>
              <div className="flex items-center justify-between rounded-card border border-brand-200 bg-brand-50/50 p-3 shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                    {getIniciales(usuario?.nombreCompleto || 'Dr.')}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ink">
                      {usuario?.nombreCompleto}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {usuario?.cargo || 'Médico Especialista'}
                    </p>
                  </div>
                </div>
                <Badge variant="info">Mi Agenda</Badge>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-ink">
                Especialidad de la Cita{' '}
                {especialidadesMedico.length > 0 && <span className="text-danger">*</span>}
              </label>
              {cargandoEspecialidades ? (
                <p className="text-xs text-muted">Cargando especialidades...</p>
              ) : especialidadesMedico.length === 0 ? (
                <div className="rounded-field border border-line bg-canvas p-2.5 text-xs text-muted">
                  No tienes especialidades clínicas asignadas. La cita se agendará como Consulta General.
                </div>
              ) : (
                <select
                  value={especialidadId ?? ''}
                  onChange={(e) => setEspecialidadId(e.target.value || undefined)}
                  className={CLASE_INPUT}
                  required={especialidadesMedico.length > 0}
                >
                  <option value="">Selecciona tu especialidad...</option>
                  {especialidadesMedico.map((esp) => (
                    <option key={esp.id} value={esp.id}>
                      {esp.nombre}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        ) : (
          /* Modo Recepción / Admin: Selector de Médico con Filtro en Cascada */
          <SelectorMedicoCascada
            medicoId={medicoId}
            onSelectMedico={handleSelectMedico}
          />
        )}

        <div>
          <label className="mb-1 block text-xs font-semibold text-ink">
            Fecha <span className="text-danger">*</span>
          </label>
          <input
            type="date"
            value={fecha}
            min={hoy}
            onChange={(e) => setFecha(e.target.value)}
            className={CLASE_INPUT}
          />
        </div>

        {tipoCita === 'REGULAR' ? (
          <IndicadorDisponibilidad
            medicoId={medicoEfectivoId || undefined}
            fecha={fecha || undefined}
            horaSeleccionada={horaInicio}
            onSelect={(inicio, fin) => {
              setHoraInicio(inicio);
              setHoraFin(fin);
              setError(null);
            }}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
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
        )}

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
