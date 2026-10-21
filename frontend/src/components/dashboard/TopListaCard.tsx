import React from 'react';

export interface ItemTopLista {
  id?: string;
  titulo: string;
  subtitulo?: string;
  valor: number | string;
  porcentaje?: number;
  etiquetaValor?: string;
  badge?: string;
}

interface TopListaCardProps {
  titulo: string;
  subtitulo?: string;
  items: ItemTopLista[];
  mensajeVacio?: string;
  icono?: string;
}

export const TopListaCard: React.FC<TopListaCardProps> = ({
  titulo,
  subtitulo,
  items,
  mensajeVacio = 'No hay registros en este periodo.',
  icono = 'ri-bar-chart-fill',
}) => {
  return (
    <div className="flex flex-col justify-between rounded-card border border-line bg-surface p-5 shadow-card">
      <div>
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <i className={icono} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-ink">{titulo}</h3>
              {subtitulo && <p className="text-xs text-muted">{subtitulo}</p>}
            </div>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="flex h-44 items-center justify-center text-xs text-muted">
            {mensajeVacio}
          </div>
        ) : (
          <div className="mt-4 space-y-3.5">
            {items.map((item, index) => (
              <div key={item.id ?? `${item.titulo}-${index}`} className="group">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-canvas text-[10px] font-bold text-muted group-hover:bg-brand-50 group-hover:text-brand-600">
                      {index + 1}
                    </span>
                    <span className="truncate font-semibold text-ink" title={item.titulo}>
                      {item.titulo}
                    </span>
                    {item.badge && (
                      <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-mono text-brand-700">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="font-bold text-ink">{item.valor}</span>
                    {item.etiquetaValor && (
                      <span className="ml-1 text-muted">{item.etiquetaValor}</span>
                    )}
                  </div>
                </div>

                {item.porcentaje !== undefined && (
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-canvas">
                    <div
                      className="h-full rounded-full bg-brand-500 transition-all duration-500 group-hover:bg-brand-600"
                      style={{ width: `${Math.min(Math.max(item.porcentaje, 2), 100)}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TopListaCard;
