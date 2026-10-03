import { useEffect, useRef } from 'react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

interface RecetaPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  html: string;
  pacienteNombre?: string | null;
  numeroExpediente?: string | null;
}

/**
 * Modal de previsualización e impresión de receta médica en PDF (HU-29).
 * Permite al médico inspeccionar el documento clínico completo dentro de un iframe
 * y exportarlo a PDF o enviarlo a la impresora con formato optimizado.
 */
export function RecetaPreviewModal({
  isOpen,
  onClose,
  html,
  pacienteNombre,
  numeroExpediente,
}: RecetaPreviewModalProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!isOpen || !html) return;

    // Timeout mínimo para asegurar que el iframe esté montado en el DOM
    const timer = setTimeout(() => {
      const iframe = iframeRef.current;
      if (!iframe) return;

      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) return;

      doc.open();
      doc.write(html);
      doc.close();
    }, 50);

    return () => clearTimeout(timer);
  }, [isOpen, html]);

  const handlePrint = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const win = iframe.contentWindow;
    if (!win) return;

    win.focus();
    win.print();
  };

  const handleAbrirVentana = () => {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) {
      win.focus();
    }
  };

  const subtitulo = [
    pacienteNombre ? `Paciente: ${pacienteNombre}` : null,
    numeroExpediente ? `Expediente: ${numeroExpediente}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Vista Previa de Receta Médica"
      subtitle={subtitulo || 'Documento clínico oficial para impresión y exportación a PDF'}
      size="xl"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted">
            <i className="ri-information-line mr-1 text-brand-600 align-middle" />
            En el diálogo de impresión, selecciona <strong>"Guardar como PDF"</strong> o tu impresora.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleAbrirVentana} icon="ri-external-link-line">
              Pantalla completa
            </Button>
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cerrar
            </Button>
            <Button size="sm" icon="ri-printer-line" onClick={handlePrint}>
              Imprimir / Guardar PDF
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="rounded-field border border-emerald-200 bg-emerald-50/50 px-4 py-2.5 text-xs text-emerald-900 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <i className="ri-shield-check-line text-base text-emerald-700" />
            <span>
              Verifica que los medicamentos, dosis y posología sean correctos antes de emitir la receta.
            </span>
          </span>
          <span className="rounded bg-emerald-100 px-2 py-0.5 font-bold text-[10px] text-emerald-800 uppercase">
            Formato Carta
          </span>
        </div>

        <div className="overflow-hidden rounded-field border border-line bg-canvas shadow-inner">
          <iframe
            ref={iframeRef}
            title="Vista previa de receta médica"
            className="h-[520px] w-full border-0 bg-white"
            sandbox="allow-same-origin allow-modals allow-scripts"
          />
        </div>
      </div>
    </Modal>
  );
}

export default RecetaPreviewModal;
