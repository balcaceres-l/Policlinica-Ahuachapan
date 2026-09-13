import { useState } from 'react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import {
  useAplicarReubicacionPorAtraso,
  usePrevisualizarReubicacionPorAtraso,
} from '@/hooks/cita/useCitas';
import { useMedicos } from '@/hooks/usuario/useUsuarios';
import { mockMedicos } from '@/services/mockData';
import type { CitaReubicada } from '@/types/cita.types';

interface ReubicarPorAtrasoModalProps {
  isOpen: boolean;
  onClose: () => void;
  fechaPredeterminada?: string;
}

const CLASE_INPUT =
  'h-11 w-full rounded-field border border-line bg-surface px-3 text-sm text-ink outline-none ' +
  'transition-colors placeholder:text-muted focus:border-brand-600 focus:ring-4 ' +
  'focus:ring-brand-600/15 disabled:opacity-60';

export function ReubicarPorAtrasoModal({
  isOpen,
  onClose,
  fechaPredeterminada,
}: ReubicarPorAtrasoModalProps) {
  const hoy = new Date().toISOString().split('T')[0];

  const [medicoId, setMedicoId] = useState<number | ''>('');
  const [fecha, setFecha] = useState(fechaPredeterminada ?? hoy);
  const [minutosAtraso, setMinutosAtraso] = useState(15);
  const [preview, setPreview] = useState<CitaReubicada[] | null>(null);
  const [confirmaColision, setConfirmaColision] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: medicos = mockMedicos } = useMedicos();
  const previsualizarMutation = usePrevisualizarReubicacionPorAtraso();
  const aplicarMutation = useAplicarReubicacionPorAtraso();

  const hayColisiones = preview?.some((c) => c.tieneColision) ?? false;

  const reiniciarPreview = () => {
    setPreview(null);
    setConfirmaColision(false);
    setError(null);
  };

  const handleCerrar = () => {
    reiniciarPreview();
    setMedicoId('');
    setMinutosAtraso(15);
    onClose();
  };

  const handleVerCitasAfectadas = async () => {
    setError(null);

    if (!medicoId) {
      setError('Debes seleccionar el médico con atraso.');
      return;
    }
    if (!fecha) {
      setError('Debes indicar la fecha de la agenda.');
      return;
    }
    if (minutosAtraso <= 0) {
      setError('El atraso debe ser mayor a 0 minutos.');
      return;
    }

    try {
      const resultado = await previsualizarMutation.mutateAsync({
        medico_id: Number(medicoId),
        fecha,
        minutos_atraso: minutosAtraso,
      });
      setPreview(resultado);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudo calcular el corrimiento.';
      setError(msg);
    }
  };

  const handleAplicar = async () => {
    if (!medicoId || !preview) return;

    if (hayColisiones && !confirmaColision) {
      setError('Debes confirmar que deseas continuar pese a las colisiones detectadas.');
      return;
    }

    try {
      await aplicarMutation.mutateAsync({
        medico_id: Number(medicoId),
        fecha,
        minutos_atraso: minutosAtraso,
      });
      toast.success('Las citas siguientes fueron reubicadas exitosamente.');
      handleCerrar();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudo aplicar el corrimiento.';
      setError(msg);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCerrar}
      title="Reubicar citas por atraso del médico"
      subtitle="Corre automáticamente las citas siguientes del día cuando el médico presenta un retraso."
      size="lg"
      footer={
        preview ? (
          <>
            <Button
              variant="secondary"
              onClick={reiniciarPreview}
              disabled={aplicarMutation.isPending}
            >
              Volver
            </Button>
            <Button
              variant={hayColisiones ? 'danger' : 'primary'}
              onClick={handleAplicar}
              loading={aplicarMutation.isPending}
              icon="ri-time-line"
            >
              Aplicar corrimiento
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={handleCerrar}>
              Cancelar
            </Button>
            <Button
              onClick={handleVerCitasAfectadas}
              loading={previsualizarMutation.isPending}
              icon="ri-search-eye-line"
            >
              Ver citas afectadas
            </Button>
          </>
        )
      }
    >
      {error && (
        <div className="mb-4 rounded-field border border-danger/30 bg-danger-soft p-3 text-xs text-danger">
          <i className="ri-error-warning-line mr-1 text-sm align-middle" />
          {error}
        </div>
      )}

      {!preview ? (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink">
              Médico con atraso <span className="text-danger">*</span>
            </label>
            <select
              value={medicoId}
              onChange={(e) => setMedicoId(e.target.value ? Number(e.target.value) : '')}
              className={CLASE_INPUT}
            >
              <option value="">Selecciona un médico...</option>
              {medicos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombreCompleto} — {m.cargo}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink">
                Fecha de la agenda <span className="text-danger">*</span>
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
                Minutos de atraso <span className="text-danger">*</span>
              </label>
              <input
                type="number"
                min={1}
                step={5}
                value={minutosAtraso}
                onChange={(e) => setMinutosAtraso(Number(e.target.value))}
                className={CLASE_INPUT}
              />
            </div>
          </div>

          <p className="text-[11px] text-muted">
            * Se recorrerán todas las citas regulares y de emergencia pendientes de este médico en
            la fecha indicada, respetando su duración original. Las citas de sobrecupo no cambian
            de horario porque ya fueron acordadas con el paciente en un bloque fijo.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {preview.length === 0 ? (
            <p className="text-sm text-muted">No hay citas pendientes para reubicar en esa fecha.</p>
          ) : (
            <div className="overflow-hidden rounded-field border border-line">
              <table className="w-full text-left text-xs">
                <thead className="bg-canvas text-[11px] uppercase text-muted">
                  <tr>
                    <th className="px-3 py-2">Paciente</th>
                    <th className="px-3 py-2">Horario actual</th>
                    <th className="px-3 py-2">Horario nuevo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {preview.map((c) => (
                    <tr key={c.citaId} className={c.tieneColision ? 'bg-danger-soft' : ''}>
                      <td className="px-3 py-2 font-medium text-ink">{c.pacienteNombre}</td>
                      <td className="px-3 py-2 text-muted">
                        {c.horaInicioAnterior} - {c.horaFinAnterior}
                      </td>
                      <td className="px-3 py-2 font-semibold text-ink">
                        {c.horaInicioNueva} - {c.horaFinNueva}
                        {c.tieneColision && (
                          <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase text-danger">
                            <i className="ri-error-warning-line" /> Colisión
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {hayColisiones && (
            <label className="flex cursor-pointer items-start gap-2 rounded-field border border-danger/30 bg-danger-soft p-3 text-xs text-danger">
              <input
                type="checkbox"
                checked={confirmaColision}
                onChange={(e) => setConfirmaColision(e.target.checked)}
                className="mt-0.5"
              />
              Entiendo que algunas citas quedarán en conflicto con un sobrecupo o un bloqueo de
              agenda, y deseo continuar de todas formas.
            </label>
          )}
        </div>
      )}
    </Modal>
  );
}

export default ReubicarPorAtrasoModal;
