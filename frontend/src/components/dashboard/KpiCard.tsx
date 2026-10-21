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
    bgIcono: 'bg-brand-50 text-brand-600',
    textIcono: 'text-brand-600',
  },
  success: {
    bgIcono: 'bg-emerald-50 text-emerald-600',
    textIcono: 'text-emerald-600',
  },
  warning: {
    bgIcono: 'bg-amber-50 text-amber-600',
    textIcono: 'text-amber-600',
  },
  info: {
    bgIcono: 'bg-sky-50 text-sky-600',
    textIcono: 'text-sky-600',
  },
  royal: {
    bgIcono: 'bg-purple-50 text-purple-600',
    textIcono: 'text-purple-600',
  },
  danger: {
    bgIcono: 'bg-rose-50 text-rose-600',
    textIcono: 'text-rose-600',
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
    <div className="relative overflow-hidden rounded-card border border-line bg-surface p-5 shadow-card transition-all hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            {titulo}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              {valor}
            </span>
          </div>

          {(subtexto || tendencia) && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted">
              {tendencia && (
                <span
                  className={`inline-flex items-center gap-0.5 font-semibold ${
                    tendencia.positiva
                      ? 'text-emerald-600'
                      : 'text-rose-600'
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
          className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${estilosColor.bgIcono} text-xl shadow-xs`}
        >
          <i className={icono} />
        </div>
      </div>
    </div>
  );
};

export default KpiCard;
