import React from 'react';

export type KpiColor = 'brand' | 'success' | 'warning' | 'info' | 'royal' | 'danger';

interface KpiCardProps {
  titulo: string;
  valor: string | number;
  subtexto?: string;
  icono: string;
  color?: KpiColor;
  tendencia?: {
    texto: string;
    positiva?: boolean;
  };
}

const COLOR_MAP: Record<
  KpiColor,
  {
    bgIcono: string;
    textIcono: string;
    borderTop?: string;
  }
> = {
  brand: {
    bgIcono: 'bg-brand-50 text-brand-600 dark:bg-sky-500/10 dark:border dark:border-sky-500/20 dark:text-sky-400',
    textIcono: 'text-brand-600 dark:text-sky-400',
  },
  success: {
    bgIcono: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:border dark:border-emerald-500/20 dark:text-emerald-400',
    textIcono: 'text-emerald-600 dark:text-emerald-400',
  },
  warning: {
    bgIcono: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:border dark:border-amber-500/20 dark:text-amber-400',
    textIcono: 'text-amber-600 dark:text-amber-400',
  },
  info: {
    bgIcono: 'bg-sky-50 text-sky-600 dark:bg-cyan-500/10 dark:border dark:border-cyan-500/20 dark:text-cyan-400',
    textIcono: 'text-sky-600 dark:text-cyan-400',
  },
  royal: {
    bgIcono: 'bg-purple-50 text-purple-600 dark:bg-fuchsia-500/10 dark:border dark:border-fuchsia-500/20 dark:text-fuchsia-400',
    textIcono: 'text-purple-600 dark:text-fuchsia-400',
  },
  danger: {
    bgIcono: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:border dark:border-rose-500/20 dark:text-rose-400',
    textIcono: 'text-rose-600 dark:text-rose-400',
  },
};

export const KpiCard: React.FC<KpiCardProps> = ({
  titulo,
  valor,
  subtexto,
  icono,
  color = 'brand',
  tendencia,
}) => {
  const estilosColor = COLOR_MAP[color];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-surface dark:bg-[#131C2E] dark:border-[#1E293B] dark:hover:border-slate-700 p-5 shadow-card transition-all hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted dark:text-slate-400">
            {titulo}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl dark:text-white">
              {valor}
            </span>
          </div>

          {(subtexto || tendencia) && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted dark:text-slate-400">
              {tendencia && (
                <span
                  className={`inline-flex items-center gap-0.5 font-semibold ${
                    tendencia.positiva
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  <i
                    className={
                      tendencia.positiva
                        ? 'ri-arrow-up-line'
                        : 'ri-arrow-down-line'
                    }
                  />
                  {tendencia.texto}
                </span>
              )}
              {subtexto && <span>{subtexto}</span>}
            </div>
          )}
        </div>

        <div
          className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${estilosColor.bgIcono} text-xl shadow-xs`}
        >
          <i className={icono} />
        </div>
      </div>
    </div>
  );
};

export default KpiCard;
