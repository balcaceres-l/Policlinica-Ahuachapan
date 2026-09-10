import { useState } from 'react';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';

export function CalendarioPage() {
  const [vista, setVista] = useState<'dia' | 'semana' | 'mes'>('semana');

  return (
    <div className="mx-auto max-w-6xl">
      {/* Encabezado */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Calendario Médico</h1>
          <p className="mt-1 text-sm text-muted">
            Visualización gráfica de los bloques de horarios y citas programadas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-field border border-line bg-surface p-1 shadow-card">
            <button
              type="button"
              onClick={() => setVista('dia')}
              className={`cursor-pointer rounded-field px-3 py-1 text-xs font-semibold transition-colors ${
                vista === 'dia' ? 'bg-brand-600 text-white' : 'text-muted hover:text-ink'
              }`}
            >
              Día
            </button>
            <button
              type="button"
              onClick={() => setVista('semana')}
              className={`cursor-pointer rounded-field px-3 py-1 text-xs font-semibold transition-colors ${
                vista === 'semana' ? 'bg-brand-600 text-white' : 'text-muted hover:text-ink'
              }`}
            >
              Semana
            </button>
            <button
              type="button"
              onClick={() => setVista('mes')}
              className={`cursor-pointer rounded-field px-3 py-1 text-xs font-semibold transition-colors ${
                vista === 'mes' ? 'bg-brand-600 text-white' : 'text-muted hover:text-ink'
              }`}
            >
              Mes
            </button>
          </div>
          <Button icon="ri-calendar-event-line">Nueva Cita</Button>
        </div>
      </div>

      {/* Contenedor principal */}
      <div className="rounded-card border border-line bg-surface shadow-card">
        <EmptyState
          icon="ri-calendar-line"
          title="Calendario en preparación"
          message="La vista de rejilla de agenda con turnos y disponibilidad médica se desplegará aquí."
        />
      </div>
    </div>
  );
}

export default CalendarioPage;
