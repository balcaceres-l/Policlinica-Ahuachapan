import { useState } from 'react';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import SearchBar from '@/components/ui/SearchBar';

export function CitasPage() {
  const [busqueda, setBusqueda] = useState('');

  return (
    <div className="mx-auto max-w-6xl">
      {/* Encabezado */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Citas Médicas</h1>
          <p className="mt-1 text-sm text-muted">
            Control y seguimiento de las consultas programadas para tu agenda médica.
          </p>
        </div>
        <Button icon="ri-calendar-check-line">Agendar Cita</Button>
      </div>

      {/* Barra de filtros */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-card border border-line bg-surface p-4 shadow-card">
        <SearchBar
          value={busqueda}
          onChange={setBusqueda}
          placeholder="Buscar cita por paciente o motivo..."
          className="min-w-[260px] flex-1"
        />
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-info-soft px-3 py-1 text-xs font-semibold text-info">
            Hoy
          </span>
        </div>
      </div>

      {/* Contenedor principal */}
      <div className="rounded-card border border-line bg-surface shadow-card">
        <EmptyState
          icon="ri-calendar-check-line"
          title="No hay citas registradas"
          message="Las citas programadas para el día o periodos seleccionados aparecerán aquí."
        />
      </div>
    </div>
  );
}

export default CitasPage;
