import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import IndicadorDisponibilidad from '@/components/cita/IndicadorDisponibilidad';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { useCatalogoEspecialidades } from '@/hooks/especialidad/useEspecialidades';
import { useReprogramarCita } from '@/hooks/cita/useCitas';
import { useMedicos } from '@/hooks/usuario/useUsuarios';
import { obtenerFechaLocal, obtenerHoraLocal } from '@/lib/utils';
import type { Cita } from '@/types/cita.types';

interface ReprogramarCitaModalProps {
  cita: Cita | null;
  isOpen: boolean;
  onClose: () => void;
}

const CLASE_INPUT =
  'h-11 w-full rounded-field border border-line bg-surface px-3 text-sm text-ink outline-none ' +
  'transition-colors placeholder:text-muted focus:border-brand-600 focus:ring-4 ' +
  'focus:ring-brand-600/15 disabled:opacity-60';

interface FormularioProps {
  cita: Cita;
  onClose: () => void;
}

function FormularioReprogramar({ cita, onClose }: FormularioProps) {
  const [nuevaFecha, setNuevaFecha] = useState(cita.fecha);
  const [nuevaHoraInicio, setNuevaHoraInicio] = useState(cita.hora_inicio);
  const [nuevaHoraFin, setNuevaHoraFin] = useState(cita.hora_fin);
  const [nuevoMedicoId, setNuevoMedicoId] = useState(cita.medico_id);
  const [error, setError] = useState<string | null>(null);

  const { data: medicos = [] } = useMedicos();
  const { data: catalogo = [] } = useCatalogoEspecialidades();

  const reprogramarMutation = useReprogramarCita();

  // Médicos que comparten la misma especialidad de la cita
  const medicosMismaEspecialidad = useMemo(() => {
    if (!cita.especialidad_id) return [];
    const esp = catalogo.find((e) => e.id === cita.especialidad_id);
    return esp ? esp.medicos.filter((m) => m.estado === 'ACTIVO') : [];
  }, [catalogo, cita.especialidad_id]);

  const handleHoraInicioChange = (inicio: string) => {
    setNuevaHoraInicio(inicio);
    const [h, m] = inicio.split(':').map(Number);
    const totalMin = h * 60 + m + 30;
    const finH = String(Math.floor(totalMin / 60) % 24).padStart(2, '0');
    const finM = String(totalMin % 60).padStart(2, '0');
    setNuevaHoraFin(`${finH}:${finM}`);
  };

  const handleConfirmar = async () => {
    if (!nuevaFecha) {
      setError('Debes ingresar la nueva fecha.');
      return;
    }
    const hoyStr = obtenerFechaLocal();
    if (nuevaFecha < hoyStr) {
      setError('No se puede reprogramar una cita para una fecha en el pasado.');
      return;
    }
    if (!nuevaHoraInicio || !nuevaHoraFin) {
      setError('Debes ingresar la hora de inicio y de fin.');
      return;
    }
    if (nuevaHoraInicio >= nuevaHoraFin) {
      setError('La hora de inicio debe ser anterior a la hora de fin.');
      return;
    }
    const horaActual = obtenerHoraLocal();
    if (nuevaFecha === hoyStr && cita.tipo_cita === 'REGULAR' && nuevaHoraInicio < horaActual) {
      setError(`No se puede reprogramar para las ${nuevaHoraInicio} porque esa hora ya transcurrió hoy (hora actual: ${horaActual}).`);
      return;
    }
    if (
      nuevoMedicoId === cita.medico_id &&
      nuevaFecha === cita.fecha &&
      nuevaHoraInicio === cita.hora_inicio &&
      nuevaHoraFin === cita.hora_fin
    ) {
      setError('Debes cambiar la fecha, el horario o reasignar a otro médico.');
      return;
    }

    try {
      await reprogramarMutation.mutateAsync({
        id: cita.id,
        payload: {
          fecha: nuevaFecha,
          hora_inicio: nuevaHoraInicio,
          hora_fin: nuevaHoraFin,
          medico_id: nuevoMedicoId !== cita.medico_id ? nuevoMedicoId : undefined,
        },
      });

      toast.success(
        nuevoMedicoId !== cita.medico_id
          ? 'Cita reasignada y reprogramada correctamente.'
          : 'Cita reprogramada exitosamente.',
      );
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al reprogramar la cita.';
      setError(msg);
    }
  };

  const medicoSeleccionado = medicos.find((m) => m.id === nuevoMedicoId);
  const esReasignado = nuevoMedicoId !== cita.medico_id;

  return (
    <>
      <div className="space-y-4">
        <div className="rounded-field border border-line bg-canvas p-3 text-xs text-ink">
          <p className="font-semibold text-ink">{cita.pacienteNombre}</p>
          <p className="text-muted">Expediente: {cita.pacienteExpediente}</p>
          <p className="text-muted">
            Médico original: {cita.medicoNombre}{' '}
            {cita.especialidadNombre ? `(${cita.especialidadNombre})` : ''} · Horario original:{' '}
            {cita.fecha} ({cita.hora_inicio} - {cita.hora_fin})
          </p>
        </div>

        {error && (
          <div className="rounded-field border border-danger/30 bg-danger-soft p-3 text-xs text-danger">
            <i className="ri-error-warning-line mr-1 text-sm align-middle" />
            {error}
          </div>
        )}

        {/* Selector de Médico (Opcional: permite transferir si el original no llegó) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-ink">
              Médico Tratante (Opcional: cambiar si está ausente)
            </label>
            {esReasignado && (
              <span className="inline-flex items-center gap-1 rounded bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700">
                <i className="ri-arrow-left-right-line text-xs" />
                Reasignando a otro médico
              </span>
            )}
          </div>
          <select
            value={nuevoMedicoId}
            onChange={(e) => {
              setNuevoMedicoId(e.target.value);
              setError(null);
            }}
            className={CLASE_INPUT}
          >
            {medicosMismaEspecialidad.length > 0 ? (
              <>
                <optgroup
                  label={`Médicos de la misma especialidad (${cita.especialidadNombre ?? 'Especialidad'})`}
                >
                  {medicosMismaEspecialidad.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombreCompleto} {m.id === cita.medico_id ? '(Médico actual)' : ''}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Otros Médicos Activos">
                  {medicos
                    .filter(
                      (m) =>
                        m.estado === 'ACTIVO' &&
                        !medicosMismaEspecialidad.some((me) => me.id === m.id),
                    )
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nombreCompleto} {m.cargo ? `· ${m.cargo}` : ''}{' '}
                        {m.id === cita.medico_id ? '(Médico actual)' : ''}
                      </option>
                    ))}
                </optgroup>
              </>
            ) : (
              medicos
                .filter((m) => m.estado === 'ACTIVO')
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombreCompleto} {m.cargo ? `· ${m.cargo}` : ''}{' '}
                    {m.id === cita.medico_id ? '(Médico actual)' : ''}
                  </option>
                ))
            )}
          </select>
          {esReasignado && (
            <p className="mt-1 text-[11px] text-brand-700">
              <i className="ri-information-line mr-1 text-xs align-middle" />
              Se comprobará la disponibilidad y se asignará el turno a{' '}
              <strong>{medicoSeleccionado?.nombreCompleto}</strong>.
            </p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-ink">
            Fecha de Atención <span className="text-danger">*</span>
          </label>
          <input
            type="date"
            value={nuevaFecha}
            onChange={(e) => setNuevaFecha(e.target.value)}
            className={CLASE_INPUT}
          />
        </div>

        {cita.tipo_cita === 'REGULAR' ? (
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink">
              Bloques Disponibles del Médico ({medicoSeleccionado?.nombreCompleto ?? 'Seleccionado'})
            </label>
            <IndicadorDisponibilidad
              medicoId={nuevoMedicoId}
              fecha={nuevaFecha || undefined}
              horaSeleccionada={nuevaHoraInicio}
              onSelect={(inicio, fin) => {
                setNuevaHoraInicio(inicio);
                setNuevaHoraFin(fin);
                setError(null);
              }}
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink">
                Nueva Hora Inicio <span className="text-danger">*</span>
              </label>
              <input
                type="time"
                value={nuevaHoraInicio}
                onChange={(e) => handleHoraInicioChange(e.target.value)}
                className={CLASE_INPUT}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink">
                Nueva Hora Fin <span className="text-danger">*</span>
              </label>
              <input
                type="time"
                value={nuevaHoraFin}
                onChange={(e) => setNuevaHoraFin(e.target.value)}
                className={CLASE_INPUT}
              />
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-end gap-3 border-t border-line pt-4">
        <Button variant="secondary" onClick={onClose} disabled={reprogramarMutation.isPending}>
          Cancelar
        </Button>
        <Button
          onClick={handleConfirmar}
          loading={reprogramarMutation.isPending}
          icon={esReasignado ? 'ri-user-shared-line' : 'ri-calendar-event-line'}
        >
          {esReasignado ? 'Reasignar y Guardar' : 'Guardar Cambio'}
        </Button>
      </div>
    </>
  );
}

export function ReprogramarCitaModal({ cita, isOpen, onClose }: ReprogramarCitaModalProps) {
  if (!isOpen || !cita) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reprogramar Cita"
      subtitle="Asigna una nueva fecha u horario para la cita seleccionada."
      size="md"
    >
      <FormularioReprogramar key={cita.id} cita={cita} onClose={onClose} />
    </Modal>
  );
}

export default ReprogramarCitaModal;
