import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import EmergenciaCorrioCitasModal from '@/components/cita/EmergenciaCorrioCitasModal';
import IndicadorDisponibilidad from '@/components/cita/IndicadorDisponibilidad';
import SelectorMedicoCascada from '@/components/cita/SelectorMedicoCascada';
import SelectorPacienteAutocomplete from '@/components/paciente/SelectorPacienteAutocomplete';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import InfoTooltip from '@/components/ui/InfoTooltip';
import Modal from '@/components/ui/Modal';
import { useAuth } from '@/hooks/auth/useAuth';
import { useAgendarCita, useDisponibilidad } from '@/hooks/cita/useCitas';
import { useEspecialidadesDeMedico } from '@/hooks/especialidad/useEspecialidades';
import { useCrearPaciente } from '@/hooks/paciente/usePacientes';
import { extraerMensajeError } from '@/lib/apiError';
import { getIniciales, jvpmDe, obtenerFechaLocal, obtenerHoraLocal } from '@/lib/utils';
import type { CorridaTrasEmergencia, TipoCita } from '@/types/cita.types';

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

/** Suma minutos a una hora "HH:MM" sin pasar de las 23:59. */
const sumarMinutos = (hora: string, minutos: number): string => {
  const [h, m] = hora.split(':').map(Number);
  const total = Math.min(h * 60 + m + minutos, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

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
  // Si recepción cambia la hora a mano, deja de proponerse la sugerida.
  const [horaManual, setHoraManual] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Emergencia: registrar al paciente solo con nombre y fecha de nacimiento.
  const [registroRapido, setRegistroRapido] = useState(false);
  const [rapidoNombre, setRapidoNombre] = useState('');
  const [rapidoNacimiento, setRapidoNacimiento] = useState('');
  const [errorRapido, setErrorRapido] = useState<string | null>(null);

  const agendarMutation = useAgendarCita();
  const crearPaciente = useCrearPaciente();
  /** Emergencia recién agendada que chocaba con otras citas: se avisa qué se corrió. */
  const [corrida, setCorrida] = useState<CorridaTrasEmergencia | null>(null);

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

  /** La emergencia no espera a tomar los datos uno por uno: se registra lo mínimo y queda pendiente. */
  const handleRegistroRapido = async () => {
    setErrorRapido(null);
    const nombre = rapidoNombre.trim();

    if (nombre.length < 3) {
      setErrorRapido('Escribe el nombre del paciente (mínimo 3 letras).');
      return;
    }
    if (!rapidoNacimiento) {
      setErrorRapido('Indica la fecha de nacimiento.');
      return;
    }
    if (rapidoNacimiento > hoy) {
      setErrorRapido('La fecha de nacimiento no puede ser posterior a hoy.');
      return;
    }

    const nac = new Date(`${rapidoNacimiento}T00:00:00`);
    const ahora = new Date();
    let edad = ahora.getFullYear() - nac.getFullYear();
    if (
      ahora.getMonth() < nac.getMonth() ||
      (ahora.getMonth() === nac.getMonth() && ahora.getDate() < nac.getDate())
    ) {
      edad--;
    }

    try {
      const creado = await crearPaciente.mutateAsync({
        nombre_completo: nombre,
        fecha_nacimiento: rapidoNacimiento,
        es_menor_edad: edad < 18,
        registro_rapido: true,
      });
      setPacienteId(creado.id);
      setRegistroRapido(false);
      setRapidoNombre('');
      setRapidoNacimiento('');
      toast.success('Paciente registrado. Queda pendiente de completar sus datos.');
    } catch (err) {
      setErrorRapido(extraerMensajeError(err, 'No se pudo registrar al paciente.'));
    }
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
    if (!inicioFinal || !finFinal) {
      setError('Debes especificar la hora de inicio y de fin.');
      return;
    }
    if (inicioFinal >= finFinal) {
      setError('La hora de inicio debe ser anterior a la hora de fin.');
      return;
    }
    if (fecha === hoyStr && inicioFinal < horaActual) {
      setError(
        `No se puede agendar a las ${inicioFinal} porque esa hora ya transcurrió hoy (hora actual: ${horaActual}).`,
      );
      return;
    }

    try {
      const creada = await agendarMutation.mutateAsync({
        paciente_id: pacienteId,
        medico_id: medicoFinalId,
        especialidad_id: especialidadId,
        fecha,
        hora_inicio: inicioFinal,
        hora_fin: finFinal,
        tipo_cita: tipoCita,
      });

      toast.success('Cita agendada exitosamente.');

      // Una emergencia que cayó encima de otras citas las corrió sola: se avisa qué pasó con cada una.
      if (creada.corrida && (creada.corrida.plan.length > 0 || creada.corrida.sinEspacio.length > 0)) {
        setCorrida(creada.corrida);
      }

      onClose();
      // Limpiar formulario al cerrar
      setPacienteId('');
      if (!esMedico && !medicoIdPredeterminado) {
        setMedicoId('');
        setEspecialidadId(undefined);
      }
    } catch (err: unknown) {
      setError(extraerMensajeError(err, 'Error al agendar cita.'));
    }
  };

  const medicoEfectivoId = esMedico ? usuario?.id : medicoId;

  // Sobrecupo: va después de la última cita del día. Se propone esa hora (media hora de duración).
  const { data: disponibilidad } = useDisponibilidad(
    tipoCita === 'SOBRECUPO' ? medicoEfectivoId || undefined : undefined,
    fecha || undefined,
  );
  const ultimaCitaFin = tipoCita === 'SOBRECUPO' ? disponibilidad?.ultimaCitaFin : null;
  // Hoy nunca se propone ni se acepta una hora que ya pasó.
  const esHoy = fecha === hoy;
  const horaActual = obtenerHoraLocal();
  const horaMinima = [ultimaCitaFin, esHoy && tipoCita !== 'REGULAR' ? horaActual : null]
    .filter((h): h is string => Boolean(h))
    .sort()
    .pop();
  const propuesta = tipoCita === 'SOBRECUPO' || (tipoCita === 'EMERGENCIA' && esHoy) ? horaMinima : undefined;
  const proponer = Boolean(propuesta) && !horaManual;
  const inicioFinal = proponer ? (propuesta as string) : horaInicio;
  const finFinal = proponer ? sumarMinutos(propuesta as string, 30) : horaFin;

  return (
    <>
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
            disabled={cargandoEspecialidades}
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

        {/* Emergencia: paciente nuevo sin datos. Solo nombre y fecha de nacimiento. */}
        {tipoCita === 'EMERGENCIA' && !pacienteId && (
          <div className="rounded-card border border-danger/30 bg-danger-soft/30 p-3">
            {registroRapido ? (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-ink">
                  <i className="ri-flashlight-line mr-1 align-middle text-danger" />
                  Registro rápido de emergencia
                  <span className="ml-1 font-normal text-muted">
                    · solo nombre y fecha de nacimiento; los demás datos se completan después.
                  </span>
                </p>
                {errorRapido && <p className="text-xs text-danger">{errorRapido}</p>}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-ink">
                      Nombre completo <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      value={rapidoNombre}
                      onChange={(e) => setRapidoNombre(e.target.value)}
                      placeholder="Nombre del paciente"
                      className={CLASE_INPUT}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-ink">
                      Fecha de nacimiento <span className="text-danger">*</span>
                    </label>
                    <input
                      type="date"
                      value={rapidoNacimiento}
                      max={hoy}
                      onChange={(e) => setRapidoNacimiento(e.target.value)}
                      className={CLASE_INPUT}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setRegistroRapido(false)}
                    disabled={crearPaciente.isPending}
                  >
                    Volver
                  </Button>
                  <Button
                    size="sm"
                    icon="ri-user-add-line"
                    onClick={handleRegistroRapido}
                    loading={crearPaciente.isPending}
                  >
                    Registrar y seleccionar
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setRegistroRapido(true)}
                className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-danger hover:underline"
              >
                <i className="ri-flashlight-line" />
                ¿Paciente nuevo en una emergencia? Registro rápido (solo nombre y fecha de nacimiento)
              </button>
            )}
          </div>
        )}

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
                      {jvpmDe(usuario) || 'Médico'}
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
                value={inicioFinal}
                min={horaMinima}
                onChange={(e) => {
                  handleHoraInicioChange(e.target.value);
                  setHoraManual(true);
                }}
                className={CLASE_INPUT}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink">
                Hora Fin <span className="text-danger">*</span>
              </label>
              <input
                type="time"
                value={finFinal}
                onChange={(e) => {
                  setHoraInicio(inicioFinal);
                  setHoraFin(e.target.value);
                  setHoraManual(true);
                }}
                className={CLASE_INPUT}
              />
            </div>
          </div>
        )}

        <div>
          <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-ink">
            Tipo de Cita
            <InfoTooltip titulo="¿Qué es cada tipo de cita?" tamano="sm">
              <span className="block space-y-1.5">
                <span className="block">
                  <b className="text-ink">Regular:</b> cita normal en un horario libre del médico,
                  dentro de su jornada. No puede empalmarse con otra.
                </span>
                <span className="block">
                  <b className="text-ink">Emergencia:</b> urgencia que no puede esperar. Se puede dar
                  a cualquier hora, incluso a la misma hora de otra cita. Al agendarla, las citas que
                  chocan se corren detrás de ella y el sistema te muestra cómo quedaron.
                </span>
                <span className="block">
                  <b className="text-ink">Sobrecupo:</b> paciente extra que el médico acepta ver
                  además de su jornada.
                </span>
              </span>
            </InfoTooltip>
          </label>
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
              onClick={() => {
                setTipoCita('EMERGENCIA');
                setHoraManual(false);
              }}
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
              onClick={() => {
                setTipoCita('SOBRECUPO');
                setHoraManual(false);
              }}
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
          {tipoCita === 'EMERGENCIA' && (
            <p className="mt-1.5 text-[11px] text-muted">
              Puede ir a cualquier hora, aunque haya otra cita. Las citas que choquen se corren solas
              detrás de la emergencia.
            </p>
          )}
          {tipoCita === 'SOBRECUPO' && (
            <p className="mt-1.5 text-[11px] text-muted">
              {ultimaCitaFin
                ? `Va después de la última cita del día, que termina a las ${ultimaCitaFin}. Puede quedar fuera del horario del médico.`
                : 'Ese día el médico no tiene citas: el sobrecupo puede ir a la hora que indiques.'}
            </p>
          )}
        </div>
      </form>
    </Modal>

    <EmergenciaCorrioCitasModal corrida={corrida} onClose={() => setCorrida(null)} />
    </>
  );
}

export default AgendarCitaModal;
