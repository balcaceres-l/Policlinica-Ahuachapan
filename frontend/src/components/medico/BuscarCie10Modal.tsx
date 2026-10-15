import { useState } from 'react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Modal from '@/components/ui/Modal';
import SearchBar from '@/components/ui/SearchBar';
import { LONGITUD_MINIMA_BUSQUEDA_CIE10, useBuscarCie10 } from '@/hooks/cie10/useCie10';
import { useDebounce } from '@/hooks/useDebounce';
import { extraerMensajeError } from '@/lib/apiError';
import type { CodigoCie10 } from '@/types/cie10.types';

interface BuscarCie10ModalProps {
  /** Lo que el médico ya escribió; con eso arranca la búsqueda. */
  textoInicial: string;
  onClose: () => void;
  onSeleccionar: (codigo: CodigoCie10) => void;
}

/**
 * HU-44 — busca el código CIE-10 a partir de los síntomas o el diagnóstico.
 * Se monta al abrirse, así cada apertura parte del texto de su fila.
 */
export function BuscarCie10Modal({ textoInicial, onClose, onSeleccionar }: BuscarCie10ModalProps) {
  const [texto, setTexto] = useState(textoInicial);
  const termino = useDebounce(texto);
  const { data: resultados = [], isFetching, isError, error } = useBuscarCie10(termino);

  const muyCorto = termino.trim().length < LONGITUD_MINIMA_BUSQUEDA_CIE10;

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Buscar código CIE-10"
      subtitle="Escribe los síntomas, el diagnóstico o el inicio del código."
      size="lg"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      <SearchBar value={texto} onChange={setTexto} placeholder="Ej. faringitis, dolor abdominal, J02..." />

      <div className="mt-4 min-h-[220px]">
        {muyCorto && (
          <p className="py-10 text-center text-sm text-muted">
            Escribe al menos {LONGITUD_MINIMA_BUSQUEDA_CIE10} letras para buscar.
          </p>
        )}

        {!muyCorto && isFetching && <LoadingSpinner label="Buscando en el catálogo..." />}

        {!muyCorto && !isFetching && isError && (
          <div role="alert" className="rounded-field bg-warning-soft px-3 py-2.5 text-sm text-warning">
            {extraerMensajeError(error, 'No se pudo consultar el catálogo CIE-10.')}
          </div>
        )}

        {!muyCorto && !isFetching && !isError && resultados.length === 0 && (
          <p className="py-10 text-center text-sm text-muted">
            Sin coincidencias. Prueba con otras palabras o deja el diagnóstico como texto libre.
          </p>
        )}

        {!muyCorto && !isFetching && !isError && resultados.length > 0 && (
          <ul className="divide-y divide-line rounded-field border border-line">
            {resultados.map((fila) => (
              <li key={fila.codigo}>
                <button
                  type="button"
                  onClick={() => onSeleccionar(fila)}
                  className="flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left text-sm text-ink transition-colors hover:bg-brand-50"
                >
                  <Badge variant="royal" className="shrink-0 font-mono">
                    {fila.codigo}
                  </Badge>
                  <span>{fila.descripcion}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}

export default BuscarCie10Modal;
