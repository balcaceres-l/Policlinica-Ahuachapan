import React from 'react';

interface EstadoCitasGridProps {
  estados: {
    ATENDIDA: number;
    AGENDADA: number;
    EN_ESPERA: number;
    EN_ATENCION: number;
    CANCELADA: number;
    NO_ASISTIO: number;
  };
}

const CONFIG_ESTADOS: {
  clave: keyof EstadoCitasGridProps['estados'];
  label: string;
  colorBg: string;
  colorTexto: string;
  colorBarra: string;
  icono: string;
}[] = [
  {
    clave: 'ATENDIDA',
    label: 'Atendidas',
    colorBg: 'bg-emerald-50 dark:bg-[#111A2B] dark:border-emerald-900/30 dark:hover:border-emerald-700/50',
    colorTexto: 'text-emerald-700 dark:text-emerald-400',
    colorBarra: 'bg-emerald-500',
    icono: 'ri-checkbox-circle-line',
  },
  {
    clave: 'AGENDADA',
    label: 'Agendadas',
    colorBg: 'bg-brand-50 dark:bg-[#111A2B] dark:border-sky-900/30 dark:hover:border-sky-700/50',
    colorTexto: 'text-brand-700 dark:text-sky-400',
    colorBarra: 'bg-sky-500',
    icono: 'ri-calendar-line',
  },
  {
    clave: 'EN_ESPERA',
    label: 'En espera',
    colorBg: 'bg-amber-50 dark:bg-[#111A2B] dark:border-amber-900/30 dark:hover:border-amber-700/50',
    colorTexto: 'text-amber-700 dark:text-amber-400',
    colorBarra: 'bg-amber-500',
    icono: 'ri-time-line',
  },
  {
    clave: 'EN_ATENCION',
    label: 'En atención',
    colorBg: 'bg-purple-50 dark:bg-[#111A2B] dark:border-purple-900/30 dark:hover:border-purple-700/50',
    colorTexto: 'text-purple-700 dark:text-purple-400',
    colorBarra: 'bg-purple-500',
    icono: 'ri-stethoscope-line',
  },
  {
    clave: 'CANCELADA',
    label: 'Canceladas',
    colorBg: 'bg-rose-50 dark:bg-[#111A2B] dark:border-rose-900/30 dark:hover:border-rose-700/50',
    colorTexto: 'text-rose-700 dark:text-rose-400',
    colorBarra: 'bg-rose-500',
    icono: 'ri-close-circle-line',
  },
  {
    clave: 'NO_ASISTIO',
    label: 'No asistió',
    colorBg: 'bg-gray-100 dark:bg-[#111A2B] dark:border-slate-800 dark:hover:border-slate-700',
    colorTexto: 'text-gray-700 dark:text-slate-400',
    colorBarra: 'bg-slate-400 dark:bg-slate-600',
    icono: 'ri-user-unfollow-line',
  },
];

export const EstadoCitasGrid: React.FC<EstadoCitasGridProps> = ({ estados }) => {
  const total = Object.values(estados).reduce((acc, curr) => acc + curr, 0);

  return (
    <div className="rounded-2xl border border-line bg-surface dark:bg-[#131C2E] dark:border-[#1E293B] p-5 shadow-card">
      <div className="flex items-center justify-between border-b border-line dark:border-[#1E293B]/70 pb-3">
        <div>
          <h3 className="text-sm font-bold text-ink dark:text-white tracking-tight">Distribución de Citas</h3>
          <p className="text-xs text-muted dark:text-slate-400">Desglose de estados en el periodo</p>
        </div>
        <span className="rounded-lg bg-brand-50 dark:bg-[#162032] dark:border dark:border-[#233148] px-3 py-1 text-xs font-bold text-brand-700 dark:text-slate-300 shadow-xs">
          Total: {total}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {CONFIG_ESTADOS.map((item) => {
          const cantidad = estados[item.clave] ?? 0;
          const porcentaje = total > 0 ? Math.round((cantidad / total) * 100) : 0;

          return (
            <div
              key={item.clave}
              className={`flex flex-col justify-between rounded-xl border border-line/60 ${item.colorBg} p-3.5 transition-all hover:scale-[1.02]`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold ${item.colorTexto}`}>
                  {item.label}
                </span>
                <i className={`${item.icono} ${item.colorTexto} text-base`} />
              </div>

              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-xl font-bold text-ink dark:text-white">{cantidad}</span>
                <span className="text-[11px] font-semibold text-muted dark:text-slate-400">
                  {porcentaje}%
                </span>
              </div>

              {/* Mini barra de progreso */}
              <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-surface/80 dark:bg-slate-800">
                <div
                  className={`h-full ${item.colorBarra} transition-all duration-500`}
                  style={{ width: `${porcentaje}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EstadoCitasGrid;
