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
    <div className="flex flex-col justify-between rounded-2xl border border-line bg-surface dark:bg-[#131C2E] dark:border-[#1E293B] p-5 shadow-card">
      <div>
        <div className="flex items-center justify-between border-b border-line dark:border-[#1E293B]/70 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <i className={icono} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-ink dark:text-white tracking-tight">{titulo}</h3>
              {subtitulo && <p className="text-xs text-muted dark:text-slate-400">{subtitulo}</p>}
            </div>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="flex h-44 items-center justify-center text-xs text-muted dark:text-slate-400">
            {mensajeVacio}
          </div>
        ) : (
          <div className="mt-4 space-y-3.5">
            {items.map((item, index) => (
              <div key={item.id ?? `${item.titulo}-${index}`} className="group">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-canvas dark:bg-[#162032] text-[10px] font-bold text-muted dark:text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-600 dark:group-hover:text-sky-400">
                      {index + 1}
                    </span>
                    <span className="truncate font-semibold text-ink dark:text-slate-200" title={item.titulo}>
                      {item.titulo}
                    </span>
                    {item.badge && (
                      <span className="rounded bg-brand-50 dark:bg-[#1A253A] dark:text-sky-400 dark:border dark:border-sky-900/40 px-1.5 py-0.5 text-[10px] font-mono text-brand-700">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="font-bold text-ink dark:text-slate-200">{item.valor}</span>
                    {item.etiquetaValor && (
                      <span className="ml-1 text-muted dark:text-slate-400 text-[11px]">{item.etiquetaValor}</span>
                    )}
                  </div>
                </div>

                {item.porcentaje !== undefined && (
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-canvas dark:bg-[#1C263A]">
                    <div
                      className="h-full rounded-full bg-brand-500 dark:bg-sky-600 transition-all duration-500 group-hover:bg-brand-600 dark:group-hover:bg-sky-500"
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
