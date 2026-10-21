import React, { useState } from 'react';
import type { PeriodoFiltro } from '@/types/dashboard.types';

interface SelectorPeriodoProps {
  periodoActual: PeriodoFiltro;
  desde?: string;
  hasta?: string;
  onChange: (nuevoPeriodo: PeriodoFiltro, desde?: string, hasta?: string) => void;
  disabled?: boolean;
}

const OPCIONES: { valor: PeriodoFiltro; etiqueta: string }[] = [
  { valor: 'mes_actual', etiqueta: 'Mes actual' },
  { valor: 'mes_anterior', etiqueta: 'Mes anterior' },
  { valor: 'ultimos_30_dias', etiqueta: 'Últimos 30 días' },
  { valor: 'ano_actual', etiqueta: 'Año actual' },
  { valor: 'personalizado', etiqueta: 'Personalizado' },
];

export const SelectorPeriodo: React.FC<SelectorPeriodoProps> = ({
  periodoActual,
  desde = '',
  hasta = '',
  onChange,
  disabled = false,
}) => {
  const [desdeLocal, setDesdeLocal] = useState(desde);
  const [hastaLocal, setHastaLocal] = useState(hasta);

  const handleSeleccionarPeriodo = (opcion: PeriodoFiltro) => {
    if (opcion !== 'personalizado') {
      onChange(opcion);
    } else {
      onChange('personalizado', desdeLocal || undefined, hastaLocal || undefined);
    }
  };

  const handleAplicarPersonalizado = (e: React.FormEvent) => {
    e.preventDefault();
    if (desdeLocal && hastaLocal) {
      onChange('personalizado', desdeLocal, hastaLocal);
    }
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Botones de periodo tipo pills */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-line bg-surface p-1 shadow-xs">
        {OPCIONES.map((op) => {
          const activo = periodoActual === op.valor;
          return (
            <button
              key={op.valor}
              type="button"
              disabled={disabled}
              onClick={() => handleSeleccionarPeriodo(op.valor)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                activo
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'text-muted hover:bg-canvas hover:text-ink'
              }`}
            >
              {op.etiqueta}
            </button>
          );
        })}
      </div>

      {/* Rango de fechas si es personalizado */}
      {periodoActual === 'personalizado' && (
        <form
          onSubmit={handleAplicarPersonalizado}
          className="flex flex-wrap items-center gap-2"
        >
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <span>Desde:</span>
            <input
              type="date"
              value={desdeLocal}
              onChange={(e) => setDesdeLocal(e.target.value)}
              className="rounded-lg border border-line bg-surface px-2.5 py-1 text-xs text-ink focus:border-brand-500 focus:outline-none"
              required
            />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <span>Hasta:</span>
            <input
              type="date"
              value={hastaLocal}
              min={desdeLocal}
              onChange={(e) => setHastaLocal(e.target.value)}
              className="rounded-lg border border-line bg-surface px-2.5 py-1 text-xs text-ink focus:border-brand-500 focus:outline-none"
              required
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-brand-600 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Filtrar
          </button>
        </form>
      )}
    </div>
  );
};

export default SelectorPeriodo;
