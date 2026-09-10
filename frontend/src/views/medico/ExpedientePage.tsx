import { useState } from 'react';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import SearchBar from '@/components/ui/SearchBar';

export function ExpedientePage() {
  const [busqueda, setBusqueda] = useState('');

  return (
    <div className="mx-auto max-w-6xl">
      {/* Encabezado */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Expediente Clínico</h1>
          <p className="mt-1 text-sm text-muted">
            Consulta integral del historial médico, notas clínicas, recetas y diagnósticos.
          </p>
        </div>
        <Button icon="ri-folder-add-line">Nuevo Registro</Button>
      </div>

      {/* Barra de filtros */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-card border border-line bg-surface p-4 shadow-card">
        <SearchBar
          value={busqueda}
          onChange={setBusqueda}
          placeholder="Buscar por número de expediente (ej. AA01-2026) o paciente..."
          className="min-w-[260px] flex-1"
        />
      </div>

      {/* Contenedor principal */}
      <div className="rounded-card border border-line bg-surface shadow-card">
        <EmptyState
          icon="ri-folder-user-line"
          title="Consulta de expediente clínico"
          message="Ingresa un criterio de búsqueda o selecciona un paciente para revisar su historial clínico electrónico."
        />
      </div>
    </div>
  );
}

export default ExpedientePage;
