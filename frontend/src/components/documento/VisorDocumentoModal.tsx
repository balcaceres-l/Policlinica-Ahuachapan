import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Modal from '@/components/ui/Modal';
import { useDocumentoPdf } from '@/hooks/documento/useDocumentos';
import { extraerMensajeError } from '@/lib/apiError';
import { obtenerPdf } from '@/services/documento/documento.service';

interface VisorDocumentoModalProps {
  /** Ruta del PDF en la API (ver `rutaPdf`); null mantiene el visor cerrado. */
  ruta: string | null;
  titulo: string;
  /** Nombre del archivo al descargar, sin extensión. */
  nombreArchivo: string;
  onClose: () => void;
}

/**
 * HU-33 — vista previa de un documento médico (receta, constancia o
 * referencia) con "Imprimir" (diálogo de impresión del navegador) y
 * "Exportar a PDF" (descarga el archivo).
 */
export function VisorDocumentoModal({ ruta, titulo, nombreArchivo, onClose }: VisorDocumentoModalProps) {
  const { data: url, isLoading, isError, error, liberar } = useDocumentoPdf(ruta);
  const marco = useRef<HTMLIFrameElement>(null);
  const [descargando, setDescargando] = useState(false);

  const cerrar = () => {
    liberar();
    onClose();
  };

  const imprimir = () => {
    const ventana = marco.current?.contentWindow;
    if (!ventana) return;
    ventana.focus();
    ventana.print();
  };

  // Se pide al backend con `descargar` para que el archivo venga como adjunto.
  const descargar = async () => {
    if (!ruta) return;
    setDescargando(true);
    try {
      const archivo = URL.createObjectURL(await obtenerPdf(ruta, true));
      const enlace = document.createElement('a');
      enlace.href = archivo;
      enlace.download = `${nombreArchivo}.pdf`;
      enlace.click();
      URL.revokeObjectURL(archivo);
    } catch (err) {
      toast.error(extraerMensajeError(err, 'No se pudo descargar el documento.'));
    } finally {
      setDescargando(false);
    }
  };

  return (
    <Modal
      isOpen={ruta !== null}
      onClose={cerrar}
      title={titulo}
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={cerrar}>
            Cerrar
          </Button>
          <Button variant="secondary" icon="ri-printer-line" onClick={imprimir} disabled={!url}>
            Imprimir
          </Button>
          <Button icon="ri-file-pdf-2-line" onClick={descargar} loading={descargando} disabled={!url}>
            Exportar a PDF
          </Button>
        </>
      }
    >
      <div className="rounded-card bg-canvas p-2">
        {isLoading && <LoadingSpinner label="Generando documento..." />}

        {isError && (
          <div role="alert" className="rounded-field bg-danger-soft px-3 py-2.5 text-sm text-danger">
            {extraerMensajeError(error, 'No se pudo generar el documento.')}
          </div>
        )}

        {url && (
          <iframe
            ref={marco}
            src={url}
            title={titulo}
            className="h-[70vh] w-full rounded-field border border-line bg-surface"
          />
        )}
      </div>
    </Modal>
  );
}

export default VisorDocumentoModal;
