import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export interface Column<T> {
  key: string;
  header: string;
  /** Clases extra para la celda (ancho, alineación...) */
  className?: string;
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Array<Column<T>>;
  data: T[];
  keyExtractor: (row: T) => string | number;
  isLoading?: boolean;
  emptyIcon?: string;
  emptyTitle?: string;
  emptyMessage?: string;
  footer?: ReactNode;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyIcon,
  emptyTitle = 'Sin resultados',
  emptyMessage = 'No se encontraron registros con los criterios seleccionados.',
  footer,
  className,
}: DataTableProps<T>) {
  return (
    <div className={cn('overflow-hidden rounded-card border border-line bg-surface shadow-card', className)}>
      {isLoading ? (
        <LoadingSpinner />
      ) : data.length === 0 ? (
        <EmptyState icon={emptyIcon} title={emptyTitle} message={emptyMessage} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-line bg-canvas">
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={cn(
                      'px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-muted',
                      column.className,
                    )}
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr
                  key={keyExtractor(row)}
                  className="border-b border-line/70 transition-colors last:border-b-0 hover:bg-brand-50/40"
                >
                  {columns.map((column) => (
                    <td key={column.key} className={cn('px-5 py-3.5 align-middle text-sm', column.className)}>
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {footer && !isLoading && data.length > 0 && (
        <div className="border-t border-line px-5 py-3">{footer}</div>
      )}
    </div>
  );
}

export default DataTable;
