import { cn } from '@/lib/utils';

interface PaginationProps {
  paginaActual: number;
  totalPaginas: number;
  total: number;
  desde: number;
  hasta: number;
  etiqueta?: string;
  onCambiarPagina: (pagina: number) => void;
}

/** Construye la secuencia de páginas con elipsis: 1 2 3 … 8 */
const construirPaginas = (actual: number, total: number): Array<number | '...'> => {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);

  const paginas: Array<number | '...'> = [];
  const inicio = Math.max(1, Math.min(actual - 1, total - 3));
  const fin = Math.min(total, inicio + 2);

  for (let i = inicio; i <= fin; i += 1) paginas.push(i);
  if (fin < total - 1) paginas.push('...');
  if (fin < total) paginas.push(total);

  return paginas;
};

export function Pagination({
  paginaActual,
  totalPaginas,
  total,
  desde,
  hasta,
  etiqueta = 'registros',
  onCambiarPagina,
}: PaginationProps) {
  const paginas = construirPaginas(paginaActual, totalPaginas);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted">
        Mostrando <span className="font-semibold text-ink">{desde}</span> a{' '}
        <span className="font-semibold text-ink">{hasta}</span> de{' '}
        <span className="font-semibold text-ink">{total}</span> {etiqueta}
      </p>

      <nav className="flex items-center gap-1" aria-label="Paginación">
        <button
          type="button"
          onClick={() => onCambiarPagina(paginaActual - 1)}
          disabled={paginaActual === 1}
          aria-label="Página anterior"
          className="flex size-8 cursor-pointer items-center justify-center rounded-field text-muted transition-colors hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-40"
        >
          <i className="ri-arrow-left-s-line text-lg" />
        </button>

        {paginas.map((pagina, indice) =>
          pagina === '...' ? (
            <span key={`gap-${indice}`} className="px-1.5 text-sm text-muted">
              ...
            </span>
          ) : (
            <button
              key={pagina}
              type="button"
              onClick={() => onCambiarPagina(pagina)}
              aria-current={pagina === paginaActual ? 'page' : undefined}
              className={cn(
                'flex size-8 cursor-pointer items-center justify-center rounded-field text-sm font-semibold transition-colors',
                pagina === paginaActual
                  ? 'bg-brand-600 text-white'
                  : 'text-muted hover:bg-canvas hover:text-ink',
              )}
            >
              {pagina}
            </button>
          ),
        )}

        <button
          type="button"
          onClick={() => onCambiarPagina(paginaActual + 1)}
          disabled={paginaActual === totalPaginas}
          aria-label="Página siguiente"
          className="flex size-8 cursor-pointer items-center justify-center rounded-field text-muted transition-colors hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-40"
        >
          <i className="ri-arrow-right-s-line text-lg" />
        </button>
      </nav>
    </div>
  );
}

export default Pagination;
