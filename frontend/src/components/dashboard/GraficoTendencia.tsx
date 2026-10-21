import React from 'react';
import type { TendenciaDiaria } from '@/types/dashboard.types';

interface GraficoTendenciaProps {
  titulo: string;
  subtitulo?: string;
  datos: TendenciaDiaria[];
}

export const GraficoTendencia: React.FC<GraficoTendenciaProps> = ({
  titulo,
  subtitulo,
  datos,
}) => {
  const maxTotal = Math.max(...datos.map((d) => d.total), 1);

  return (
    <div className="rounded-card border border-line bg-surface p-5 shadow-card">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-sm font-bold text-ink">{titulo}</h3>
          {subtitulo && <p className="text-xs text-muted">{subtitulo}</p>}
        </div>

        {/* Leyenda */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-emerald-500" />
            <span className="text-muted">Atendidas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-rose-400" />
            <span className="text-muted">Canceladas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-brand-200" />
            <span className="text-muted">Otras / Agendadas</span>
          </div>
        </div>
      </div>

      {datos.length === 0 ? (
        <div className="flex h-52 items-center justify-center text-xs text-muted">
          No hay datos de citas registrados en este periodo.
        </div>
      ) : (
        <div className="mt-6 flex h-52 items-end gap-2 pt-6 sm:gap-3">
          {datos.map((d, index) => {
            const alturaTotalPct = Math.round((d.total / maxTotal) * 100);
            const alturaAtendidasPct =
              d.total > 0 ? Math.round((d.atendidas / d.total) * 100) : 0;
            const alturaCanceladasPct =
              d.total > 0 ? Math.round((d.canceladas / d.total) * 100) : 0;
            const otras = Math.max(0, d.total - d.atendidas - d.canceladas);
            const alturaOtrasPct =
              d.total > 0 ? Math.max(0, 100 - alturaAtendidasPct - alturaCanceladasPct) : 0;

            return (
              <div
                key={`${d.fecha}-${index}`}
                className="group relative flex flex-1 flex-col items-center h-full justify-end"
              >
                {/* Tooltip flotante al pasar el mouse */}
                <div className="pointer-events-none absolute -top-12 z-20 hidden -translate-y-2 whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1.5 text-[11px] font-medium text-white shadow-lg transition-all group-hover:block">
                  <p className="font-bold text-gray-200">
                    {d.dia} {d.etiqueta}
                  </p>
                  <p className="text-emerald-300">Atendidas: {d.atendidas}</p>
                  <p className="text-rose-300">Canceladas: {d.canceladas}</p>
                  {otras > 0 && <p className="text-gray-300">Otras: {otras}</p>}
                  <p className="border-t border-gray-700 pt-0.5 text-gray-400">
                    Total: {d.total}
                  </p>
                </div>

                {/* Columna / Barra apilada */}
                <div
                  className="w-full max-w-[36px] overflow-hidden rounded-t-md bg-canvas transition-all group-hover:opacity-90"
                  style={{ height: `${Math.max(alturaTotalPct, 6)}%` }}
                >
                  <div className="flex h-full flex-col justify-end">
                    {otras > 0 && (
                      <div
                        className="w-full bg-brand-200"
                        style={{ height: `${alturaOtrasPct}%` }}
                      />
                    )}
                    {d.canceladas > 0 && (
                      <div
                        className="w-full bg-rose-400"
                        style={{ height: `${alturaCanceladasPct}%` }}
                      />
                    )}
                    {d.atendidas > 0 && (
                      <div
                        className="w-full bg-emerald-500"
                        style={{ height: `${alturaAtendidasPct}%` }}
                      />
                    )}
                    {d.total === 0 && (
                      <div className="h-full w-full bg-line/60" />
                    )}
                  </div>
                </div>

                {/* Etiquetas de fecha al pie */}
                <div className="mt-2 text-center">
                  <p className="text-[10px] font-bold text-ink">{d.dia}</p>
                  <p className="text-[9px] text-muted">{d.etiqueta}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GraficoTendencia;
