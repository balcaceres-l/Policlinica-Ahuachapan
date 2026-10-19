import { useState } from 'react';
import VisorDocumentoModal from '@/components/documento/VisorDocumentoModal';
import Badge from '@/components/ui/Badge';
import { rutaPdf } from '@/services/documento/documento.service';
import type { ConstanciaMedica, ReferenciaMedica } from '@/types/documento.types';

interface ListaDocumentosProps {
  consultaId: string;
  /** Si la consulta tiene receta con medicamentos guardados. */
  tieneReceta: boolean;
  constancias: ConstanciaMedica[];
  referencias: ReferenciaMedica[];
  /** Expediente del paciente, para el nombre del archivo. */
  expediente?: string | null;
}

interface DocumentoAbierto {
  ruta: string;
  titulo: string;
  archivo: string;
}

const fechaCorta = (fecha: string) => fecha.slice(0, 10).split('-').reverse().join('/');

/**
 * HU-33 — documentos emitidos en una consulta (receta, constancias y
 * referencias) con su vista previa para imprimir o exportar a PDF.
 */
export function ListaDocumentos({
  consultaId,
  tieneReceta,
  constancias,
  referencias,
  expediente,
}: ListaDocumentosProps) {
  const [abierto, setAbierto] = useState<DocumentoAbierto | null>(null);
  const sufijo = expediente ? `-${expediente}` : '';

  if (!tieneReceta && constancias.length === 0 && referencias.length === 0) return null;

  const fila = (icono: string, titulo: string, detalle: string, documento: DocumentoAbierto, extra?: React.ReactNode) => (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-field border border-line bg-surface px-3 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <i className={`${icono} text-base text-brand-600`} />
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            {titulo}
            {extra}
          </p>
          <p className="truncate text-xs text-muted">{detalle}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setAbierto(documento)}
        className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
      >
        <i className="ri-printer-line" />
        Ver / Imprimir / PDF
      </button>
    </li>
  );

  return (
    <>
      <ul className="space-y-2">
        {tieneReceta &&
          fila('ri-capsule-line', 'Receta médica', 'Medicamentos prescritos en esta consulta', {
            ruta: rutaPdf.receta(consultaId),
            titulo: 'Receta médica',
            archivo: `receta${sufijo}`,
          })}
        {constancias.map((c) =>
          fila('ri-file-text-line', 'Constancia médica', `${fechaCorta(c.fecha_emision)} · ${c.motivo}`, {
            ruta: rutaPdf.constancia(c.id),
            titulo: 'Constancia médica',
            archivo: `constancia${sufijo}`,
          }),
        )}
        {referencias.map((r) =>
          fila(
            'ri-share-forward-line',
            'Referencia médica',
            `${fechaCorta(r.fecha_emision)} · ${r.tipo === 'INTERNA' ? r.medicoDestinoNombre ?? 'Médico de la policlínica' : r.destino} · ${r.motivo}`,
            {
              ruta: rutaPdf.referencia(r.id),
              titulo: r.tipo === 'INTERNA' ? 'Referencia médica interna' : 'Referencia médica externa',
              archivo: `referencia${sufijo}`,
            },
            <Badge variant={r.tipo === 'INTERNA' ? 'info' : 'royal'}>
              {r.tipo === 'INTERNA' ? 'Interna' : 'Externa'}
            </Badge>,
          ),
        )}
      </ul>

      <VisorDocumentoModal
        ruta={abierto?.ruta ?? null}
        titulo={abierto?.titulo ?? ''}
        nombreArchivo={abierto?.archivo ?? 'documento'}
        onClose={() => setAbierto(null)}
      />
    </>
  );
}

export default ListaDocumentos;
