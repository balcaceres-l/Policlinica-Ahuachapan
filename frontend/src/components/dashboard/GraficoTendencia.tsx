import React from 'react';
import type { TendenciaDiaria, TipoAgrupacion } from '@/types/dashboard.types';
import { cn } from '@/lib/utils';

interface GraficoTendenciaProps {
  titulo: string;
  subtitulo?: string;
  datos: TendenciaDiaria[];
  agrupacionActiva?: 'dia' | 'mes' | 'ano';
  agrupacionSeleccionada?: TipoAgrupacion;
  onCambiarAgrupacion?: (nueva: TipoAgrupacion) => void;
}

const OPCIONES_AGRUPACION: { valor: TipoAgrupacion; etiqueta: string }[] = [
  { valor: 'auto', etiqueta: 'Auto' },
  { valor: 'dia', etiqueta: 'Día' },
  { valor: 'mes', etiqueta: 'Mes' },
  { valor: 'ano', etiqueta: 'Año' },
];

export const GraficoTendencia: React.FC<GraficoTendenciaProps> = ({
  titulo,
  subtitulo,
  datos,
  agrupacionActiva = 'dia',
  agrupacionSeleccionada = 'auto',
  onCambiarAgrupacion,
}) => {
  const maxTotal = Math.max(...datos.map((d) => d.total), 1);

  return (
    <div className="rounded-2xl border border-line bg-surface dark:bg-[#131C2E] dark:border-[#1E293B] p-5 sm:p-6 shadow-card">
      {/* Cabecera con título, leyenda y selector de agrupación */}
      <div className="flex flex-col justify-between gap-4 pb-5 border-b border-line dark:border-[#1E293B]/70 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-base font-bold text-ink dark:text-white tracking-tight">{titulo}</h3>
            <span className="rounded-md bg-canvas text-muted border border-line dark:border-[#2B3B57] dark:bg-[#1A253A] dark:text-slate-400 px-2 py-0.5 text-[11px] font-semibold">
              {agrupacionActiva === 'mes'
                ? 'Vista mensual'
                : agrupacionActiva === 'ano'
                  ? 'Vista anual'
                  : 'Vista diaria'}
            </span>
          </div>
          {subtitulo && <p className="text-xs text-muted dark:text-slate-400 mt-0.5">{subtitulo}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Selector de Agrupación Día / Mes / Año */}
          {onCambiarAgrupacion && (
            <div className="flex items-center rounded-lg border border-line bg-canvas dark:bg-[#0C1322] dark:border-[#1E293B] p-0.5 text-xs font-semibold">
              {OPCIONES_AGRUPACION.map((op) => {
                const activo = agrupacionSeleccionada === op.valor;
                return (
                  <button
                    key={op.valor}
                    type="button"
                    onClick={() => onCambiarAgrupacion(op.valor)}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all ${
                      activo
                        ? 'bg-surface text-brand-600 shadow-xs dark:bg-[#1E2A42] dark:text-white'
                        : 'text-muted hover:text-ink dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    {op.etiqueta}
                  </button>
                );
              })}
            </div>
          )}

          {/* Leyenda */}
          <div className="flex items-center gap-3 text-xs pl-1">
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/50" />
              <span className="text-[11px] text-muted dark:text-slate-400">Atendidas</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-rose-500" />
              <span className="text-[11px] text-muted dark:text-slate-400">Canceladas</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-slate-500" />
              <span className="text-[11px] text-muted dark:text-slate-400">Otras</span>
            </div>
          </div>
        </div>
      </div>

      {datos.length === 0 ? (
        <div className="flex h-56 items-center justify-center text-xs text-muted dark:text-slate-400">
          No hay datos de citas registrados en este periodo.
        </div>
      ) : (
        /* Contenedor con scroll horizontal suave para ver 1 mes, 12 meses o 3 años sin aplastamiento */
        <div className="mt-4 flex flex-col">
          <div className="flex h-72 items-end gap-2 overflow-x-auto pb-4 pt-28 sm:gap-3">
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
                  key={`${d.clave ?? d.fecha ?? d.etiqueta}-${index}`}
                  className="group relative flex h-full flex-1 min-w-[44px] sm:min-w-[50px] flex-col items-center justify-end shrink-0"
                >
                  {/* Tooltip flotante al pasar el mouse */}
                  <div
                    className={cn(
                      'pointer-events-none absolute -top-24 z-30 hidden whitespace-nowrap rounded-xl',
                      'bg-slate-900/95 dark:bg-[#0C1322] border border-slate-700/60 dark:border-[#1E293B]',
                      'px-3 py-2 text-[11px] font-medium text-white dark:text-slate-200 shadow-xl backdrop-blur-xs transition-all group-hover:block',
                      index === 0
                        ? 'left-0'
                        : index >= datos.length - 2
                          ? 'right-0'
                          : 'left-1/2 -translate-x-1/2',
                    )}
                  >
                    <p className="font-bold text-slate-100 dark:text-white pb-1 mb-1 border-b border-slate-700/50 dark:border-[#1E293B]">
                      {d.subtitulo ? d.subtitulo : d.etiqueta} {d.dia && d.dia !== d.etiqueta ? `(${d.dia})` : ''}
                    </p>
                    <div className="space-y-0.5 min-w-[120px]">
                      <div className="flex items-center justify-between gap-4">
                        <span className="flex items-center gap-1.5 text-slate-300">
                          <span className="size-1.5 rounded-full bg-emerald-400" />
                          Atendidas:
                        </span>
                        <span className="font-bold text-emerald-400">{d.atendidas}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="flex items-center gap-1.5 text-slate-300">
                          <span className="size-1.5 rounded-full bg-rose-400" />
                          Canceladas:
                        </span>
                        <span className="font-bold text-rose-400">{d.canceladas}</span>
                      </div>
                      {otras > 0 && (
                        <div className="flex items-center justify-between gap-4">
                          <span className="flex items-center gap-1.5 text-slate-300">
                            <span className="size-1.5 rounded-full bg-slate-400" />
                            Otras:
                          </span>
                          <span className="font-bold text-slate-300">{otras}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-4 border-t border-slate-700/50 dark:border-[#1E293B] pt-1 mt-1 font-semibold text-slate-200">
                        <span>Total:</span>
                        <span className="font-bold text-white">{d.total}</span>
                      </div>
                    </div>
                  </div>

                  {/* Columna / Barra apilada con animación hover */}
                  <div
                    className="w-full max-w-[30px] overflow-hidden rounded-t-sm bg-canvas dark:bg-[#0C1322] transition-all group-hover:scale-y-[1.03] group-hover:opacity-90"
                    style={{ height: `${Math.max(alturaTotalPct, 6)}%` }}
                  >
                    <div className="flex h-full flex-col justify-end">
                      {otras > 0 && (
                        <div
                          className="w-full bg-[#64748B]/60"
                          style={{ height: `${alturaOtrasPct}%` }}
                        />
                      )}
                      {d.canceladas > 0 && (
                        <div
                          className="w-full bg-rose-500"
                          style={{ height: `${alturaCanceladasPct}%` }}
                        />
                      )}
                      {d.atendidas > 0 && (
                        <div
                          className="w-full bg-emerald-500 shadow-sm shadow-emerald-500/20"
                          style={{ height: `${alturaAtendidasPct}%` }}
                        />
                      )}
                      {d.total === 0 && (
                        <div className="h-1.5 w-full bg-line/60 dark:bg-slate-700/30 rounded-t-sm" />
                      )}
                    </div>
                  </div>

                  {/* Etiquetas de fecha al pie */}
                  <div className="mt-2 text-center w-full">
                    <p className="text-[11px] font-bold text-ink dark:text-slate-300 truncate">
                      {d.etiqueta}
                    </p>
                    {agrupacionActiva === 'dia' && (
                      <p className="text-[10px] text-muted dark:text-slate-500 font-medium">{d.dia}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {datos.length > 12 && (
            <div className="pt-3 border-t border-line/40 dark:border-[#1E293B]/40 flex justify-end">
              <span className="text-[11px] text-muted dark:text-slate-400 italic">
                Desliza horizontalmente para ver el periodo completo →
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GraficoTendencia;
