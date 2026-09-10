import { useState } from 'react';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import SearchBar from '@/components/ui/SearchBar';

export function PacientesPage() {
  const [busqueda, setBusqueda] = useState('');

  return (
    <div className="mx-auto max-w-6xl">
      {/* Encabezado */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Pacientes</h1>
          <p className="mt-1 text-sm text-muted">
            Listado y búsqueda de pacientes atendidos en consulta médica.
          </p>
        </div>
        <Button icon="ri-user-add-line">Nuevo Paciente</Button>
      </div>

      {/* Barra de filtros */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-card border border-line bg-surface p-4 shadow-card">
        <SearchBar
          value={busqueda}
          onChange={setBusqueda}
          placeholder="Buscar paciente por nombre, expediente o DUI..."
          className="min-w-[260px] flex-1"
        />
      </div>

      {/* Contenedor principal */}
      <div className="rounded-card border border-line bg-surface shadow-card">
        <EmptyState
          icon="ri-user-heart-line"
          title="Sin pacientes cargados"
          message="Los pacientes asignados o con historial clínico se mostrarán aquí una vez registrados en el sistema."
        />
      </div>
    </div>
  );
}

export default PacientesPage;
