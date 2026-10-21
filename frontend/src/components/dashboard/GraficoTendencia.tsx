import React from 'react';
import type { TendenciaDiaria, TipoAgrupacion } from '@/types/dashboard.types';

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
    <div className="rounded-card border border-line bg-surface p-5 shadow-card">
      {/* Cabecera con título, leyenda y selector de agrupación */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-ink">{titulo}</h3>
            <span className="rounded bg-canvas px-2 py-0.5 text-[11px] font-semibold text-muted">
              {agrupacionActiva === 'mes'
                ? 'Vista mensual'
                : agrupacionActiva === 'ano'
                  ? 'Vista anual'
                  : 'Vista diaria'}
            </span>
          </div>
          {subtitulo && <p className="text-xs text-muted mt-0.5">{subtitulo}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Selector de Agrupación Día / Mes / Año */}
          {onCambiarAgrupacion && (
            <div className="flex items-center rounded-lg border border-line bg-canvas p-0.5 text-xs">
              {OPCIONES_AGRUPACION.map((op) => {
                const activo = agrupacionSeleccionada === op.valor;
                return (
                  <button
                    key={op.valor}
                    type="button"
                    onClick={() => onCambiarAgrupacion(op.valor)}
                    className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-all ${
                      activo
                        ? 'bg-surface text-brand-600 shadow-xs'
                        : 'text-muted hover:text-ink'
                    }`}
                  >
                    {op.etiqueta}
                  </button>
                );
              })}
            </div>
          )}

          {/* Leyenda */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500" />
              <span className="text-[11px] text-muted">Atendidas</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-rose-400" />
              <span className="text-[11px] text-muted">Canceladas</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-brand-200" />
              <span className="text-[11px] text-muted">Otras</span>
            </div>
          </div>
        </div>
      </div>

      {datos.length === 0 ? (
        <div className="flex h-56 items-center justify-center text-xs text-muted">
          No hay datos de citas registrados en este periodo.
        </div>
      ) : (
        /* Contenedor con scroll horizontal suave para ver 1 mes, 12 meses o 3 años sin aplastamiento */
        <div className="mt-4 flex flex-col">
          <div className="flex h-56 items-end gap-2 overflow-x-auto pb-3 pt-8 sm:gap-3">
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
                  <div className="pointer-events-none absolute -top-14 z-20 hidden -translate-y-2 whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1.5 text-[11px] font-medium text-white shadow-lg transition-all group-hover:block">
                    <p className="font-bold text-gray-200">
                      {d.subtitulo ? d.subtitulo : d.etiqueta} {d.dia !== d.etiqueta ? `(${d.dia})` : ''}
                    </p>
                    <p className="text-emerald-300">Atendidas: {d.atendidas}</p>
                    <p className="text-rose-300">Canceladas: {d.canceladas}</p>
                    {otras > 0 && <p className="text-gray-300">Otras: {otras}</p>}
                    <p className="border-t border-gray-700 pt-0.5 text-gray-400">
                      Total: {d.total}
                    </p>
                  </div>

                  {/* Columna / Barra apilada con animación hover */}
                  <div
                    className="w-full max-w-[34px] overflow-hidden rounded-t-md bg-canvas transition-all group-hover:scale-y-[1.03] group-hover:opacity-90"
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
                  <div className="mt-2 text-center w-full">
                    <p className="text-[11px] font-bold text-ink truncate">
                      {d.etiqueta}
                    </p>
                    {agrupacionActiva === 'dia' && (
                      <p className="text-[9px] text-muted">{d.dia}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {datos.length > 12 && (
            <p className="text-right text-[10px] text-muted italic mt-1">
              Desliza horizontalmente para ver el periodo completo →
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default GraficoTendencia;
