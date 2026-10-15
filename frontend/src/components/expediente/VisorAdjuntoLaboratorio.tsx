import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Modal from '@/components/ui/Modal';
import { useArchivoLaboratorio } from '@/hooks/laboratorio/useLaboratorio';
import { extraerMensajeError } from '@/lib/apiError';
import { formatearTamano } from '@/lib/imagen';
import { formatearFecha } from '@/lib/utils';
import type { ResultadoLaboratorio } from '@/types/laboratorio.types';

interface VisorAdjuntoLaboratorioProps {
  /** Resultado cuyo adjunto se muestra; null mantiene el visor cerrado. */
  resultado: ResultadoLaboratorio | null;
  onClose: () => void;
}

/** HU-23 (TASK-91) — visor del adjunto de un resultado de laboratorio. */
export function VisorAdjuntoLaboratorio({ resultado, onClose }: VisorAdjuntoLaboratorioProps) {
  const archivo = resultado?.archivo ?? null;
  // El archivo llega con la sesión, así que se muestra desde memoria.
  const { data: url, isLoading, isError, error, liberar } = useArchivoLaboratorio(
    archivo ? resultado!.id : null,
  );

  const cerrar = () => {
    liberar();
    onClose();
  };

  const esPdf = archivo?.mime === 'application/pdf';

  return (
    <Modal
      isOpen={archivo !== null}
      onClose={cerrar}
      title={resultado ? `${resultado.nombre_examen} · ${formatearFecha(`${resultado.fecha_examen}T00:00:00`)}` : ''}
      subtitle={archivo ? `${archivo.nombre} · ${formatearTamano(archivo.tamano)}` : undefined}
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={cerrar}>
            Cerrar
          </Button>
          {url && archivo && (
            <a
              href={url}
              download={archivo.nombre}
              className="inline-flex h-10 items-center gap-2 rounded-field bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              <i className="ri-download-2-line" />
              Descargar
            </a>
          )}
        </>
      }
    >
      <div className="rounded-card bg-canvas p-4">
        {isLoading && <LoadingSpinner label="Cargando adjunto..." />}

        {isError && (
          <div role="alert" className="rounded-field bg-danger-soft px-3 py-2.5 text-sm text-danger">
            {extraerMensajeError(error, 'No se pudo cargar el adjunto.')}
          </div>
        )}

        {url && archivo && !esPdf && (
          <img src={url} alt={archivo.nombre} className="mx-auto max-h-[60vh] rounded-field" />
        )}
        {url && archivo && esPdf && (
          <iframe src={url} title={archivo.nombre} className="h-[60vh] w-full rounded-field border border-line bg-white" />
        )}
      </div>
    </Modal>
  );
}

export default VisorAdjuntoLaboratorio;
