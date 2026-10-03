import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import CancelarCitaModal from '@/components/cita/CancelarCitaModal';
import ReprogramarCitaModal from '@/components/cita/ReprogramarCitaModal';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import {
  bloqueosKeys,
  useCitasAfectadas,
  useCorrerCitasBloqueo,
} from '@/hooks/bloqueo/useBloqueos';
import { extraerMensajeError } from '@/lib/apiError';
import type { BloqueoAgenda } from '@/types/bloqueo.types';
import type { Cita } from '@/types/cita.types';

export type BloqueoGestionable = Pick<
  BloqueoAgenda,
  'id' | 'medicoNombre' | 'fecha' | 'tipo_bloqueo' | 'hora_inicio' | 'hora_fin' | 'motivo'
>;

interface CitasAfectadasModalProps {
  bloqueo: BloqueoGestionable | null;
  onClose: () => void;
}

/**
 * HU-35 — citas que quedaron dentro de un bloqueo de agenda. Recepción contacta
 * a cada paciente (fuera del sistema) y aquí registra qué decidió: reagendar,
 * correr las citas si ya está en la clínica, o cancelar.
 */
export function CitasAfectadasModal({ bloqueo, onClose }: CitasAfectadasModalProps) {
  const queryClient = useQueryClient();
  const { data: citas = [], isLoading, isError } = useCitasAfectadas(bloqueo?.id);
  const correr = useCorrerCitasBloqueo();

  const [citaAReagendar, setCitaAReagendar] = useState<Cita | null>(null);
  const [citaACancelar, setCitaACancelar] = useState<Cita | null>(null);
  const [confirmandoCorrer, setConfirmandoCorrer] = useState(false);

  if (!bloqueo) return null;

  const esParcial = bloqueo.tipo_bloqueo === 'PARCIAL' && bloqueo.hora_fin !== null;
  const primera = citas[0];

  // Mientras se reagenda o cancela se oculta esta ventana para no apilar diálogos;
  // al volver, el listado se refresca con lo que cambió.
  const hijoAbierto = citaAReagendar !== null || citaACancelar !== null;

  const cerrarHijo = () => {
    setCitaAReagendar(null);
    setCitaACancelar(null);
    void queryClient.invalidateQueries({ queryKey: bloqueosKeys.all });
  };

  const cerrar = () => {
    setConfirmandoCorrer(false);
    onClose();
  };

  const handleCorrer = async () => {
    try {
      const resultado = await correr.mutateAsync(bloqueo.id);
      toast.success(`${resultado.citas.length} cita(s) corrida(s).`);

      if (resultado.fueraDeHorario.length > 0) {
        toast(
          `${resultado.fueraDeHorario.length} cita(s) quedaron fuera del horario del médico. ` +
            'Revisa si hay que reagendarlas.',
          { icon: '⚠️', duration: 6000 },
        );
      }
      setConfirmandoCorrer(false);
    } catch (err) {
      toast.error(extraerMensajeError(err, 'No se pudieron correr las citas.'));
      setConfirmandoCorrer(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={!hijoAbierto}
        onClose={cerrar}
        title="Citas afectadas por el bloqueo"
        subtitle={`${bloqueo.medicoNombre} · ${bloqueo.fecha} · ${
          esParcial ? `${bloqueo.hora_inicio} - ${bloqueo.hora_fin}` : 'Día completo'
        }`}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={cerrar}>
              Cerrar
            </Button>
            {esParcial && citas.length > 0 && !confirmandoCorrer && (
              <Button icon="ri-time-line" onClick={() => setConfirmandoCorrer(true)}>
                Correr citas
              </Button>
            )}
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-field border border-line bg-canvas p-3 text-xs text-muted">
            <p>
              <span className="font-semibold text-ink">Motivo:</span> {bloqueo.motivo || '—'}
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>
                Si el paciente <b>aún no llega</b>, contáctalo y reagéndalo con otro cupo del
                médico, o en otro día si ese día no hay espacio.
              </li>
              <li>
                Si el paciente <b>ya está en la clínica</b>, usa <b>Correr citas</b>: las afectadas
                pasan a empezar cuando termina el bloqueo, en orden, y solo se corren las citas
                siguientes que choquen con ellas.
              </li>
              <li>Si ya no quiere su cita, cancélala.</li>
            </ul>
          </div>

          {confirmandoCorrer && esParcial && primera && (
            <div className="space-y-3 rounded-field border border-warning/40 bg-warning-soft/40 p-3">
              <p className="text-sm font-semibold text-ink">
                La cita de {primera.hora_inicio} pasará a las {bloqueo.hora_fin}. Las demás afectadas
                irán detrás, una por una y en orden, y solo se moverá una cita posterior si
                choca con la anterior. Las que ya estaban libres no se tocan. ¿Continuar?
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setConfirmandoCorrer(false)}
                  disabled={correr.isPending}
                >
                  Volver
                </Button>
                <Button size="sm" onClick={handleCorrer} loading={correr.isPending}>
                  Confirmar y correr citas
                </Button>
              </div>
            </div>
          )}

          {isLoading ? (
            <p className="py-6 text-center text-sm text-muted">Cargando citas...</p>
          ) : isError ? (
            <p className="py-6 text-center text-sm text-danger">
              No se pudieron cargar las citas afectadas.
            </p>
          ) : citas.length === 0 ? (
            <div className="rounded-field border border-dashed border-line p-8 text-center text-muted">
              <i className="ri-checkbox-circle-line text-3xl text-success" />
              <p className="mt-1 text-sm font-semibold text-ink">
                No quedan citas dentro de este bloqueo.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-line rounded-field border border-line">
              {citas.map((cita) => (
                <li key={cita.id} className="flex flex-wrap items-center gap-3 p-3">
                  <div className="w-28 shrink-0 text-sm font-bold text-ink">
                    {cita.hora_inicio} - {cita.hora_fin}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{cita.pacienteNombre}</p>
                    <p className="text-xs text-muted">Exp: {cita.pacienteExpediente}</p>
                  </div>
                  <Badge variant={cita.estado === 'EN_ESPERA' ? 'info' : 'warning'} dot>
                    {cita.estado === 'EN_ESPERA' ? 'Ya está en la clínica' : 'Aún no llega'}
                  </Badge>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      icon="ri-calendar-line"
                      onClick={() => setCitaAReagendar(cita)}
                    >
                      Reagendar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon="ri-close-circle-line"
                      onClick={() => setCitaACancelar(cita)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>

      <ReprogramarCitaModal
        cita={citaAReagendar}
        isOpen={citaAReagendar !== null}
        onClose={cerrarHijo}
      />

      <CancelarCitaModal
        cita={citaACancelar}
        isOpen={citaACancelar !== null}
        onClose={cerrarHijo}
      />
    </>
  );
}

export default CitasAfectadasModal;
