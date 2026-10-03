import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

export interface AdjuntoLaboratorio {
  nombre: string;
  tipo: 'pdf' | 'imagen';
  tamanoKb: number;
  /** URL real del archivo; sin ella el visor muestra una vista previa de demostración. */
  url?: string;
}

interface VisorAdjuntoLaboratorioProps {
  adjunto: AdjuntoLaboratorio | null;
  titulo: string;
  onClose: () => void;
}

const formatearTamano = (kb: number): string =>
  kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;

/** Hoja simulada para la demostración, hasta que existan archivos reales. */
function VistaPreviaDemo() {
  return (
    <div className="mx-auto w-full max-w-md rounded-field border border-line bg-white p-6 shadow-card" aria-hidden="true">
      <div className="mb-4 h-3 w-1/2 rounded bg-brand-100" />
      <div className="space-y-2">
        {[100, 92, 96, 70, 88, 60].map((ancho, i) => (
          <div key={i} className="h-2 rounded bg-line" style={{ width: `${ancho}%` }} />
        ))}
      </div>
      <div className="my-5 h-px bg-line" />
      <div className="space-y-2">
        {[84, 90, 76, 94].map((ancho, i) => (
          <div key={i} className="h-2 rounded bg-line" style={{ width: `${ancho}%` }} />
        ))}
      </div>
    </div>
  );
}

/** HU-23 (TASK-91) — visor de adjuntos de un resultado de laboratorio. */
export function VisorAdjuntoLaboratorio({ adjunto, titulo, onClose }: VisorAdjuntoLaboratorioProps) {
  return (
    <Modal
      isOpen={adjunto !== null}
      onClose={onClose}
      title={titulo}
      subtitle={adjunto ? `${adjunto.nombre} · ${formatearTamano(adjunto.tamanoKb)}` : undefined}
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
          <Button icon="ri-download-2-line" disabled={!adjunto?.url}>
            Descargar
          </Button>
        </>
      }
    >
      {adjunto && (
        <div className="rounded-card bg-canvas p-4">
          {adjunto.url && adjunto.tipo === 'imagen' && (
            <img src={adjunto.url} alt={adjunto.nombre} className="mx-auto max-h-[60vh] rounded-field" />
          )}
          {adjunto.url && adjunto.tipo === 'pdf' && (
            <iframe src={adjunto.url} title={adjunto.nombre} className="h-[60vh] w-full rounded-field border border-line bg-white" />
          )}
          {!adjunto.url && (
            <>
              <VistaPreviaDemo />
              <p className="mt-4 text-center text-xs text-muted">
                Vista previa de demostración: el archivo real se mostrará aquí cuando se conecte la API.
              </p>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}

export default VisorAdjuntoLaboratorio;
