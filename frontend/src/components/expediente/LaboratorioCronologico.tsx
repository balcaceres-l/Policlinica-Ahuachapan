import { useState } from 'react';
import toast from 'react-hot-toast';
import RegistrarResultadoLaboratorioModal from '@/components/expediente/RegistrarResultadoLaboratorioModal';
import VisorAdjuntoLaboratorio from '@/components/expediente/VisorAdjuntoLaboratorio';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Modal from '@/components/ui/Modal';
import { useAuth } from '@/hooks/auth/useAuth';
import { useEliminarResultado, useResultadosLaboratorio } from '@/hooks/laboratorio/useLaboratorio';
import { extraerMensajeError } from '@/lib/apiError';
import type { ResultadoLaboratorio } from '@/types/laboratorio.types';

type Orden = 'reciente' | 'antiguo';

interface LaboratorioCronologicoProps {
  pacienteId: string;
  /** Consulta activa: los resultados registrados desde ella quedan ligados. */
  consultaId?: string | null;
}

const fechaLarga = (f: string) =>
  new Date(`${f}T00:00:00`).toLocaleDateString('es-SV', { day: '2-digit', month: 'long', year: 'numeric' });

/**
 * HU-23 — resultados de laboratorio del paciente en orden cronológico, con
 * visor de adjuntos. El médico además registra resultados nuevos (HU-41).
 */
export function LaboratorioCronologico({ pacienteId, consultaId }: LaboratorioCronologicoProps) {
  const { usuario } = useAuth();
  const esMedico = usuario?.rol === 'MEDICO';

  const [orden, setOrden] = useState<Orden>('reciente');
  const [registrando, setRegistrando] = useState(false);
  const [conAdjuntoAbierto, setConAdjuntoAbierto] = useState<ResultadoLaboratorio | null>(null);
  const [porEliminar, setPorEliminar] = useState<ResultadoLaboratorio | null>(null);

  const { data: resultados = [], isLoading, isError, error } = useResultadosLaboratorio(pacienteId);
  const eliminar = useEliminarResultado();

  // El servicio entrega lo más reciente primero; aquí solo se invierte si hace falta.
  const visibles = orden === 'reciente' ? resultados : [...resultados].reverse();

  const confirmarEliminar = async () => {
    if (!porEliminar) return;
    try {
      await eliminar.mutateAsync(porEliminar.id);
      toast.success('Resultado eliminado.');
      setPorEliminar(null);
    } catch (err) {
      toast.error(extraerMensajeError(err, 'No se pudo eliminar el resultado.'));
    }
  };

  return (
    <section aria-labelledby="titulo-laboratorio">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="titulo-laboratorio" className="text-lg font-bold text-ink">
            Resultados de laboratorio
          </h2>
          {resultados.length > 0 && (
            <p className="mt-0.5 text-xs text-muted">
              {resultados.length} {resultados.length === 1 ? 'resultado registrado' : 'resultados registrados'}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {resultados.length > 1 && (
            <button
              type="button"
              onClick={() => setOrden((o) => (o === 'reciente' ? 'antiguo' : 'reciente'))}
              className="inline-flex cursor-pointer items-center gap-2 rounded-field border border-line bg-surface px-3 py-2 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-50"
            >
              <i className={orden === 'reciente' ? 'ri-sort-desc' : 'ri-sort-asc'} />
              {orden === 'reciente' ? 'Más reciente primero' : 'Más antiguo primero'}
            </button>
          )}
          {/** HU-41 */}
          {esMedico && (
            <Button size="sm" icon="ri-add-line" onClick={() => setRegistrando(true)}>
              Registrar resultado
            </Button>
          )}
        </div>
      </div>

      {isLoading && <LoadingSpinner label="Cargando resultados de laboratorio..." />}

      {isError && (
        <div role="alert" className="rounded-field bg-danger-soft px-3 py-2.5 text-sm text-danger">
          {extraerMensajeError(error, 'No se pudieron cargar los resultados de laboratorio.')}
        </div>
      )}

      {!isLoading && !isError && resultados.length === 0 && (
        <div className="rounded-card border border-line bg-surface shadow-card">
          <EmptyState
            icon="ri-flask-line"
            title="Sin resultados de laboratorio"
            message="Este paciente aún no tiene resultados de laboratorio registrados."
          />
        </div>
      )}

      {visibles.length > 0 && (
        <ol className="space-y-4 border-l-2 border-brand-100 pl-5">
          {visibles.map((r) => (
            <li key={r.id} className="relative">
              <span className="absolute -left-[27px] top-6 size-3 rounded-full border-2 border-surface bg-brand-600" />
              <article className="rounded-card border border-line bg-surface p-5 shadow-card">
                <header className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <time dateTime={r.fecha_examen} className="text-xs font-semibold uppercase tracking-wide text-muted">
                      {fechaLarga(r.fecha_examen)}
                    </time>
                    <h3 className="text-base font-bold text-ink">{r.nombre_examen}</h3>
                    {r.registradoPorNombre && (
                      <p className="mt-0.5 text-xs text-muted">Registrado por {r.registradoPorNombre}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {r.archivo && (
                      <button
                        type="button"
                        onClick={() => setConAdjuntoAbierto(r)}
                        className="inline-flex cursor-pointer items-center gap-2 rounded-field border border-line bg-surface px-3 py-2 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-50"
                      >
                        <i className={r.archivo.mime === 'application/pdf' ? 'ri-file-pdf-2-line' : 'ri-image-line'} />
                        Ver adjunto
                      </button>
                    )}
                    {r.registrado_por_id === usuario?.id && (
                      <button
                        type="button"
                        onClick={() => setPorEliminar(r)}
                        aria-label="Eliminar resultado"
                        className="flex size-9 cursor-pointer items-center justify-center rounded-field text-muted transition-colors hover:bg-danger-soft hover:text-danger"
                      >
                        <i className="ri-delete-bin-line" />
                      </button>
                    )}
                  </div>
                </header>

                {r.resultado_texto && (
                  <p className="mt-3 whitespace-pre-wrap text-sm text-ink">{r.resultado_texto}</p>
                )}
              </article>
            </li>
          ))}
        </ol>
      )}

      <VisorAdjuntoLaboratorio resultado={conAdjuntoAbierto} onClose={() => setConAdjuntoAbierto(null)} />

      {registrando && (
        <RegistrarResultadoLaboratorioModal
          pacienteId={pacienteId}
          consultaId={consultaId}
          onClose={() => setRegistrando(false)}
        />
      )}

      <Modal
        isOpen={porEliminar !== null}
        onClose={() => setPorEliminar(null)}
        title="Eliminar resultado"
        subtitle={porEliminar?.nombre_examen}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPorEliminar(null)} disabled={eliminar.isPending}>
              Cancelar
            </Button>
            <Button variant="danger" icon="ri-delete-bin-line" loading={eliminar.isPending} onClick={confirmarEliminar}>
              Eliminar
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink">
          El resultado y su adjunto se quitarán del expediente del paciente. Esta acción no se puede deshacer.
        </p>
      </Modal>
    </section>
  );
}

export default LaboratorioCronologico;
