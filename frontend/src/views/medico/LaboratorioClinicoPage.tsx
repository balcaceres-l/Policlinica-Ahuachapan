import { useState } from 'react';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import SearchBar from '@/components/ui/SearchBar';

export function LaboratorioClinicoPage() {
  const [busqueda, setBusqueda] = useState('');

  return (
    <div className="mx-auto max-w-6xl">
      {/* Encabezado */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Laboratorio Clínico</h1>
          <p className="mt-1 text-sm text-muted">
            Solicitudes de exámenes médicos, pruebas clínicas y consulta de resultados.
          </p>
        </div>
        <Button icon="ri-flask-line">Nueva Solicitud</Button>
      </div>

      {/* Barra de filtros */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-card border border-line bg-surface p-4 shadow-card">
        <SearchBar
          value={busqueda}
          onChange={setBusqueda}
          placeholder="Buscar examen o paciente por nombre o código..."
          className="min-w-[260px] flex-1"
        />
      </div>

      {/* Contenedor principal */}
      <div className="rounded-card border border-line bg-surface shadow-card">
        <EmptyState
          icon="ri-flask-line"
          title="Sin órdenes de laboratorio"
          message="Las solicitudes de pruebas diagnósticas y resultados analíticos aparecerán en esta sección."
        />
      </div>
    </div>
  );
}

export default LaboratorioClinicoPage;
