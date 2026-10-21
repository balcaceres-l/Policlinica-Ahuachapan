import { useState } from 'react';
import toast from 'react-hot-toast';
import SelectorMedicoCascada from '@/components/cita/SelectorMedicoCascada';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { useDesplazarAgenda } from '@/hooks/cita/useCitas';
import { extraerMensajeError } from '@/lib/apiError';
import type { CitaSinEspacio } from '@/types/cita.types';

interface DesplazarAgendaModalProps {
  isOpen: boolean;
  onClose: () => void;
  fechaPredeterminada: string;
  medicoIdPredeterminado?: string;
}

const CLASE_INPUT =
  'h-11 w-full rounded-field border border-line bg-surface px-3 text-sm text-ink outline-none ' +
  'transition-colors placeholder:text-muted focus:border-brand-600 focus:ring-4 ' +
  'focus:ring-brand-600/15 disabled:opacity-60';

const ATAJOS = [15, 30, 45, 60];

/** HU-37 / RF-40 — corre las citas pendientes cuando el médico llega tarde. */
export function DesplazarAgendaModal({
  isOpen,
  onClose,
  fechaPredeterminada,
  medicoIdPredeterminado,
}: DesplazarAgendaModalProps) {
  const [medicoId, setMedicoId] = useState<string | ''>(medicoIdPredeterminado ?? '');
  const [fecha, setFecha] = useState(fechaPredeterminada);
  const [minutos, setMinutos] = useState(30);
  const [desdeHora, setDesdeHora] = useState('');
  const [error, setError] = useState<string | null>(null);
  /** Citas que no se movieron por pasar de las 11 p. m.: recepción debe verlas antes de cerrar. */
  const [sinEspacio, setSinEspacio] = useState<CitaSinEspacio[] | null>(null);

  const desplazar = useDesplazarAgenda();

  const cerrar = () => {
    setSinEspacio(null);
    setError(null);
    onClose();
  };

  const handleConfirmar = async () => {
    setError(null);

    if (!medicoId) {
      setError('Debes seleccionar el médico que llegó tarde.');
      return;
    }
    if (minutos < 1) {
      setError('Los minutos de atraso deben ser mayores que cero.');
      return;
    }

    try {
      const resultado = await desplazar.mutateAsync({
        medicoId,
        payload: {
          fecha,
          minutos,
          desde_hora: desdeHora || undefined,
        },
      });

      const total = resultado.citas.length;
      if (total > 0) {
        toast.success(`${total} cita(s) desplazada(s) ${minutos} minutos.`);
      } else if (resultado.citasSinEspacio.length === 0) {
        toast('No había citas pendientes que desplazar.');
      }

      if (resultado.fueraDeHorario.length > 0) {
        toast(
          `${resultado.fueraDeHorario.length} cita(s) quedaron fuera del horario del médico: ` +
            'aparecen marcadas en la agenda.',
          { icon: '⚠️', duration: 6000 },
        );
      }

      // Las que no caben antes de las 11 p. m. no se movieron: se muestran para reagendarlas o cancelarlas.
      if (resultado.citasSinEspacio.length > 0) {
        setSinEspacio(resultado.citasSinEspacio);
        return;
      }

      cerrar();
    } catch (err) {
      setError(extraerMensajeError(err, 'No se pudo desplazar la agenda.'));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={cerrar}
      title="Médico con atraso"
      subtitle="Corre las citas pendientes conservando la duración de cada una."
      size="md"
      footer={
        sinEspacio ? (
          <Button onClick={cerrar}>Entendido</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={cerrar} disabled={desplazar.isPending}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmar} loading={desplazar.isPending} icon="ri-time-line">
              Desplazar citas
            </Button>
          </>
        )
      }
    >
      {sinEspacio ? (
        <div className="space-y-3">
          <div className="rounded-field border border-danger/30 bg-danger-soft p-3 text-sm text-danger">
            <p className="font-semibold">
              <i className="ri-error-warning-line mr-1 align-middle" />
              {sinEspacio.length === 1
                ? '1 cita no cabe antes de las 11 p. m.'
                : `${sinEspacio.length} citas no caben antes de las 11 p. m.`}
            </p>
            <p className="mt-1 text-xs">
              No se movieron y siguen en su hora original. Contacta al paciente para reagendarla o,
              si ya no la quiere, cancélala. Quedan marcadas en la agenda como citas que chocan con otra.
            </p>
          </div>
          <ul className="divide-y divide-line rounded-field border border-line">
            {sinEspacio.map((c) => (
              <li key={c.id} className="flex items-center gap-3 p-3">
                <span className="w-28 shrink-0 text-sm font-bold text-ink">
                  {c.hora_inicio} - {c.hora_fin}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{c.pacienteNombre}</p>
                  <p className="text-xs text-muted">Exp: {c.pacienteExpediente}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
      <div className="space-y-4">
        {error && (
          <div className="rounded-field border border-danger/30 bg-danger-soft p-3 text-xs text-danger">
            <i className="ri-error-warning-line mr-1 align-middle" />
            {error}
          </div>
        )}

        <SelectorMedicoCascada medicoId={medicoId} onSelectMedico={(id) => setMedicoId(id)} />

        <div className="grid grid-cols-2 gap-3">
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
              Desde la hora <span className="font-normal text-muted">(opcional)</span>
            </label>
            <input
              type="time"
              value={desdeHora}
              onChange={(e) => setDesdeHora(e.target.value)}
              className={CLASE_INPUT}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-ink">
            Minutos de atraso <span className="text-danger">*</span>
          </label>
          <div className="mb-2 flex gap-2">
            {ATAJOS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMinutos(m)}
                className={`flex-1 cursor-pointer rounded-field border px-2 py-2 text-xs font-semibold transition-colors ${
                  minutos === m
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-line bg-surface text-ink hover:bg-brand-50'
                }`}
              >
                {m} min
              </button>
            ))}
          </div>
          <input
            type="number"
            min={1}
            max={480}
            value={minutos}
            onChange={(e) => setMinutos(Number(e.target.value))}
            className={CLASE_INPUT}
          />
        </div>

        <p className="rounded-field border border-line bg-canvas p-3 text-xs text-muted">
          Solo se mueven las citas agendadas y en espera. Las ya atendidas o canceladas no se
          tocan. Si alguna queda fuera del horario del médico, se corre igual y queda marcada. Las
          que terminarían después de las 11 p. m. no se mueven: hay que reagendarlas o cancelarlas.
        </p>
      </div>
      )}
    </Modal>
  );
}

export default DesplazarAgendaModal;
