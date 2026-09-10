import { useState, useMemo } from 'react';
import NuevoPacienteModal from '@/components/paciente/NuevoPacienteModal';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import DataTable, { type Column } from '@/components/ui/DataTable';
import SearchBar from '@/components/ui/SearchBar';
import { usePacientes } from '@/hooks/paciente/usePacientes';
import { getIniciales } from '@/lib/utils';
import type { Paciente } from '@/types/paciente.types';

export function PacientesRecepcionPage() {
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<'TODOS' | 'ADULTO' | 'MENOR'>('TODOS');
  const [fechaRegistroFiltro, setFechaRegistroFiltro] = useState('');
  const [modalNuevo, setModalNuevo] = useState(false);

  const { data: pacientes = [], isLoading } = usePacientes(busqueda);

  const pacientesFiltrados = useMemo(() => {
    return pacientes.filter((p) => {
      const coincideCategoria =
        categoriaFiltro === 'TODOS' ||
        (categoriaFiltro === 'MENOR' && p.es_menor_edad) ||
        (categoriaFiltro === 'ADULTO' && !p.es_menor_edad);

      const coincideFecha =
        !fechaRegistroFiltro || p.fecha_registro === fechaRegistroFiltro;

      return coincideCategoria && coincideFecha;
    });
  }, [pacientes, categoriaFiltro, fechaRegistroFiltro]);

  const columns: Column<Paciente>[] = [
    {
      key: 'expediente',
      header: 'Expediente',
      className: 'w-32',
      render: (p) => (
        <span className="inline-flex items-center gap-1.5 rounded-field bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700">
          <i className="ri-folder-user-line" />
          {p.numero_expediente}
        </span>
      ),
    },
    {
      key: 'nombre',
      header: 'Nombre del Paciente',
      render: (p) => (
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
            {getIniciales(p.nombre_completo)}
          </span>
          <div>
            <p className="font-semibold text-ink">{p.nombre_completo}</p>
            <p className="text-xs text-muted">Nacimiento: {p.fecha_nacimiento}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'dui',
      header: 'DUI',
      className: 'w-28 text-muted',
      render: (p) => p.dui,
    },
    {
      key: 'telefono',
      header: 'Teléfono',
      className: 'w-28 text-muted',
      render: (p) => p.telefono ?? 'No registrado',
    },
    {
      key: 'categoria',
      header: 'Categoría',
      className: 'w-28',
      render: (p) => (
        <Badge variant={p.es_menor_edad ? 'warning' : 'default'}>
          {p.es_menor_edad ? 'Menor de edad' : 'Adulto'}
        </Badge>
      ),
    },
    {
      key: 'responsable',
      header: 'Responsable (Menores)',
      render: (p) =>
        p.es_menor_edad && p.responsable_nombre ? (
          <div>
            <p className="text-xs font-semibold text-ink">{p.responsable_nombre}</p>
            <p className="text-[11px] text-muted">
              {p.responsable_parentesco} · {p.responsable_telefono}
            </p>
          </div>
        ) : (
          <span className="text-xs text-muted/60">—</span>
        ),
    },
    {
      key: 'registro',
      header: 'Fecha Registro',
      className: 'w-28 text-xs text-muted',
      render: (p) => p.fecha_registro,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      {/* Encabezado */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Directorio de Pacientes</h1>
          <p className="mt-1 text-sm text-muted">
            Consulta expedientes clínicos, datos de contacto y registra nuevos pacientes.
          </p>
        </div>
        <Button icon="ri-user-add-line" onClick={() => setModalNuevo(true)}>
          Nuevo Paciente
        </Button>
      </div>

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-card border border-line bg-surface p-4 shadow-card">
        <SearchBar
          value={busqueda}
          onChange={setBusqueda}
          placeholder="Buscar por nombre, expediente o número de DUI..."
          className="min-w-[260px] flex-1"
        />

        <div>
          <select
            value={categoriaFiltro}
            onChange={(e) =>
              setCategoriaFiltro(e.target.value as 'TODOS' | 'ADULTO' | 'MENOR')
            }
            className="h-10 rounded-field border border-line bg-surface px-3 text-xs font-medium text-ink outline-none focus:border-brand-600"
          >
            <option value="TODOS">Todas las Categorías</option>
            <option value="ADULTO">Adulto</option>
            <option value="MENOR">Menor de edad</option>
          </select>
        </div>

        <div className="flex items-center gap-1">
          <label className="text-xs font-semibold text-muted">Registro:</label>
          <input
            type="date"
            value={fechaRegistroFiltro}
            onChange={(e) => setFechaRegistroFiltro(e.target.value)}
            className="h-10 rounded-field border border-line bg-surface px-3 text-xs font-semibold text-ink outline-none focus:border-brand-600"
          />
          {fechaRegistroFiltro && (
            <button
              type="button"
              onClick={() => setFechaRegistroFiltro('')}
              title="Limpiar filtro de fecha"
              className="flex size-9 cursor-pointer items-center justify-center rounded-field border border-line text-muted hover:bg-canvas"
            >
              <i className="ri-close-line text-base" />
            </button>
          )}
        </div>
      </div>

      {/* Tabla de Pacientes */}
      <DataTable
        columns={columns}
        data={pacientesFiltrados}
        keyExtractor={(p) => p.id}
        isLoading={isLoading}
        emptyIcon="ri-user-heart-line"
        emptyTitle="No hay pacientes encontrados"
        emptyMessage="No se encontraron pacientes que coincidan con los filtros seleccionados."
      />

      <NuevoPacienteModal isOpen={modalNuevo} onClose={() => setModalNuevo(false)} />
    </div>
  );
}

export default PacientesRecepcionPage;
