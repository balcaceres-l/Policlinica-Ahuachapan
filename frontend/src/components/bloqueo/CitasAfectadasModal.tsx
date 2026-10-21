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
  useSimularCorrerCitas,
} from '@/hooks/bloqueo/useBloqueos';
import { extraerMensajeError } from '@/lib/apiError';
import { cn } from '@/lib/utils';
import type { BloqueoAgenda } from '@/types/bloqueo.types';
import type { Cita, CitaCorridaPlan } from '@/types/cita.types';

export type BloqueoGestionable = Pick<
  BloqueoAgenda,
  'id' | 'medicoNombre' | 'fecha' | 'tipo_bloqueo' | 'hora_inicio' | 'hora_fin' | 'motivo'
>;

interface CitasAfectadasModalProps {
  bloqueo: BloqueoGestionable | null;
  onClose: () => void;
}

/** Aviso de una cita que no se pudo correr: se queda en su hora y recepción debe decidir. */
function AvisoSinEspacio({ detalle }: { detalle: string }) {
  return (
    <p className="mt-1 flex items-start gap-1 text-[11px] font-semibold text-danger">
      <i className="ri-error-warning-line mt-px" aria-hidden="true" />
      <span>{detalle}</span>
    </p>
  );
}

/**
 * HU-35 — citas que quedaron dentro de un bloqueo de agenda. Recepción contacta
 * a cada paciente (fuera del sistema) y aquí registra qué decidió: reagendar,
 * correr las citas si ya está en la clínica, o cancelar.
 */
export function CitasAfectadasModal({ bloqueo, onClose }: CitasAfectadasModalProps) {
  const queryClient = useQueryClient();
  const { data: citas = [], isLoading, isError } = useCitasAfectadas(bloqueo?.id);
  const simular = useSimularCorrerCitas();
  const correr = useCorrerCitasBloqueo();

  const [citaAReagendar, setCitaAReagendar] = useState<Cita | null>(null);
  const [citaACancelar, setCitaACancelar] = useState<Cita | null>(null);
  /** Vista previa pendiente de confirmar: cómo quedaría cada cita. */
  const [plan, setPlan] = useState<{
    movidas: CitaCorridaPlan[];
    sinEspacio: string[];
  } | null>(null);
  /** Citas que la última vez que se corrió no cupieron antes de las 11 p. m. */
  const [noCupieron, setNoCupieron] = useState<{ bloqueoId: string; ids: string[] } | null>(null);
  /** Cita sobre la que se acaba de actuar: se muestra "actualizando" hasta que el listado se refresque. */
  const [actualizando, setActualizando] = useState<string | null>(null);

  if (!bloqueo) return null;

  const esParcial = bloqueo.tipo_bloqueo === 'PARCIAL' && bloqueo.hora_fin !== null;

  // Mientras se reagenda o cancela se oculta esta ventana para no apilar diálogos;
  // al volver, el listado se refresca con lo que cambió.
  const hijoAbierto = citaAReagendar !== null || citaACancelar !== null;

  const cerrarHijo = () => {
    const id = (citaAReagendar ?? citaACancelar)?.id ?? null;
    setCitaAReagendar(null);
    setCitaACancelar(null);
    // La cita que se acaba de atender sigue en la lista hasta que el servidor responde:
    // se marca para que nadie la vuelva a reagendar mientras tanto.
    setActualizando(id);
    void queryClient
      .invalidateQueries({ queryKey: bloqueosKeys.all })
      .finally(() => setActualizando(null));
  };

  const cerrar = () => {
    setPlan(null);
    onClose();
  };

  /** Primero se muestra cómo quedarían las citas; recién después se confirma. */
  const handlePrevisualizar = async () => {
    try {
      const r = await simular.mutateAsync(bloqueo.id);
      setPlan({ movidas: r.plan, sinEspacio: r.sinEspacio });
    } catch (err) {
      toast.error(extraerMensajeError(err, 'No se pudo calcular cómo quedarían las citas.'));
    }
  };

  const handleCorrer = async () => {
    try {
      const resultado = await correr.mutateAsync(bloqueo.id);
      setNoCupieron({ bloqueoId: bloqueo.id, ids: resultado.sinEspacio });

      if (resultado.citas.length > 0) {
        toast.success(`${resultado.citas.length} cita(s) corrida(s).`);
      }
      if (resultado.sinEspacio.length > 0) {
        toast.error(
          `${resultado.sinEspacio.length} cita(s) no caben antes de las 11 p. m. y se quedaron en su hora. ` +
            'Reagéndalas o cancélalas.',
          { duration: 8000 },
        );
      }
      if (resultado.fueraDeHorario.length > 0) {
        toast(
          `${resultado.fueraDeHorario.length} cita(s) quedaron fuera del horario del médico: ` +
            'aparecen marcadas en la agenda.',
          { icon: '⚠️', duration: 6000 },
        );
      }
      setPlan(null);
    } catch (err) {
      toast.error(extraerMensajeError(err, 'No se pudieron correr las citas.'));
      setPlan(null);
    }
  };

  const planDe = (id: string) => plan?.movidas.find((p) => p.id === id);
  // Citas que se correrían sin estar entre las afectadas: chocan con una que se mueve.
  const tambienSeCorren = plan?.movidas.filter((p) => !citas.some((c) => c.id === p.id)) ?? [];

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
            {esParcial && citas.length > 0 && !plan && (
              <Button icon="ri-time-line" onClick={handlePrevisualizar} loading={simular.isPending}>
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
                siguientes que choquen con ellas. Las que terminarían después de las 11 p. m. no se
                mueven: hay que reagendarlas o cancelarlas.
              </li>
              <li>
                Si el paciente <b>ya no quiere la cita</b>, cancélala.
              </li>
            </ul>
          </div>

          {plan && (
            <div className="space-y-3 rounded-field border border-warning/40 bg-warning-soft/40 p-3">
              <p className="text-sm font-semibold text-ink">
                Las demás afectadas irán detrás, una por una y en orden, y solo se moverá una cita
                posterior si choca con la anterior. Las que ya estaban libres no se tocan.
                ¿Continuar?
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPlan(null)}
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
              {citas.map((cita) => {
                const nueva = planDe(cita.id);
                const sinCupo =
                  (plan?.sinEspacio.includes(cita.id) ?? false) ||
                  (noCupieron?.bloqueoId === bloqueo.id && noCupieron.ids.includes(cita.id));
                const ocupada = actualizando === cita.id;

                return (
                  <li
                    key={cita.id}
                    className={cn(
                      'flex flex-wrap items-center gap-3 p-3 transition-opacity',
                      ocupada && 'pointer-events-none opacity-60',
                    )}
                  >
                    <div className="w-28 shrink-0 text-sm">
                      {nueva ? (
                        <>
                          <p className="text-xs text-muted line-through">
                            {cita.hora_inicio} - {cita.hora_fin}
                          </p>
                          <p className="font-bold text-brand-700">
                            {nueva.nuevo_inicio} - {nueva.nuevo_fin}
                          </p>
                          {nueva.fueraDeHorario && (
                            <p className="text-[10px] font-bold text-warning">Fuera de su horario</p>
                          )}
                        </>
                      ) : (
                        <p className="font-bold text-ink">
                          {cita.hora_inicio} - {cita.hora_fin}
                        </p>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{cita.pacienteNombre}</p>
                      <p className="text-xs text-muted">Exp: {cita.pacienteExpediente}</p>
                      {sinCupo && (
                        <AvisoSinEspacio detalle="No cabe antes de las 11 p. m.: reagéndala o cancélala." />
                      )}
                    </div>
                    <Badge variant={cita.estado === 'EN_ESPERA' ? 'info' : 'warning'} dot>
                      {cita.estado === 'EN_ESPERA' ? 'Ya está en la clínica' : 'Aún no llega'}
                    </Badge>
                    {ocupada ? (
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                        <i className="ri-loader-4-line animate-spin text-base" aria-hidden="true" />
                        Actualizando...
                      </span>
                    ) : (
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
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {tambienSeCorren.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold text-muted">
                También se correrían, porque chocan con una de las anteriores:
              </p>
              <ul className="divide-y divide-line rounded-field border border-line">
                {tambienSeCorren.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-3 p-3">
                    <div className="w-28 shrink-0 text-sm">
                      <p className="text-xs text-muted line-through">
                        {p.hora_inicio} - {p.hora_fin}
                      </p>
                      <p className="font-bold text-brand-700">
                        {p.nuevo_inicio} - {p.nuevo_fin}
                      </p>
                      {p.fueraDeHorario && (
                        <p className="text-[10px] font-bold text-warning">Fuera de su horario</p>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{p.pacienteNombre}</p>
                      <p className="text-xs text-muted">Exp: {p.pacienteExpediente}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
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
