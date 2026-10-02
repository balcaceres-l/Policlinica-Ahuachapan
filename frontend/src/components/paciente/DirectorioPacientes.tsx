import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ConfirmarFallecidoModal from '@/components/paciente/ConfirmarFallecidoModal';
import EditarPacienteModal from '@/components/paciente/EditarPacienteModal';
import NuevoPacienteModal from '@/components/paciente/NuevoPacienteModal';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import DataTable, { type Column } from '@/components/ui/DataTable';
import SearchBar from '@/components/ui/SearchBar';
import { useAuth } from '@/hooks/auth/useAuth';
import { usePacientes } from '@/hooks/paciente/usePacientes';
import { getIniciales } from '@/lib/utils';
import type { EstadoPaciente, Paciente } from '@/types/paciente.types';

export function DirectorioPacientes() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const esMedico = usuario?.rol === 'MEDICO';

  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<'TODOS' | 'ADULTO' | 'MENOR'>('TODOS');
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoPaciente>('ACTIVO');
  const [fechaRegistroFiltro, setFechaRegistroFiltro] = useState('');

  const [modalNuevo, setModalNuevo] = useState(false);
  const [pacienteParaEditar, setPacienteParaEditar] = useState<Paciente | null>(null);
  const [pacienteParaFallecido, setPacienteParaFallecido] = useState<Paciente | null>(null);

  // Llamada al hook con el filtro de estado y búsqueda
  const { data: pacientes = [], isLoading } = usePacientes({
    buscar: busqueda,
    estado: estadoFiltro,
    categoria: categoriaFiltro,
  });

  const pacientesFiltrados = useMemo(() => {
    return pacientes.filter((p) => {
      const coincideFecha =
        !fechaRegistroFiltro || p.fecha_registro === fechaRegistroFiltro;
      return coincideFecha;
    });
  }, [pacientes, fechaRegistroFiltro]);

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
      header: 'Documento',
      className: 'w-36',
      render: (p) => {
        if (!p.dui) {
          return (
            <span className="text-xs text-muted italic">
              {p.es_menor_edad ? '— (Menor de edad)' : 'Sin documento'}
            </span>
          );
        }
        return (
          <div>
            <span className="text-xs font-semibold text-ink">{p.dui}</span>
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted">
              {p.tipo_documento === 'PASAPORTE' ? 'Pasaporte' : 'DUI'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'telefono',
      header: 'Teléfono',
      className: 'w-28 text-muted',
      render: (p) => p.telefono ?? '—',
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
      key: 'estado',
      header: 'Estado',
      className: 'w-24',
      render: (p) => (
        <Badge variant={p.estado === 'FALLECIDO' ? 'danger' : 'success'}>
          {p.estado === 'FALLECIDO' ? 'Fallecido' : 'Activo'}
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
              {p.responsable_documento
                ? ` · ${p.responsable_tipo_documento === 'PASAPORTE' ? 'Pasaporte' : 'DUI'}: ${p.responsable_documento}`
                : ''}
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
    {
      key: 'acciones',
      header: 'Acciones',
      className: 'w-32 text-right',
      render: (p) => (
        <div className="flex items-center justify-end gap-1.5">
          {esMedico && (
            <button
              type="button"
              onClick={() => navigate(`/medico/expediente/${p.id}`)}
              title="Ver expediente clínico"
              className="flex size-8 cursor-pointer items-center justify-center rounded-field border border-line text-brand-600 transition-colors hover:bg-brand-50 hover:text-brand-700"
            >
              <i className="ri-folder-open-line text-base" />
            </button>
          )}

          {p.estado !== 'FALLECIDO' ? (
            <>
              <button
                type="button"
                onClick={() => setPacienteParaEditar(p)}
                title="Editar información del paciente"
                className="flex size-8 cursor-pointer items-center justify-center rounded-field border border-line text-brand-600 transition-colors hover:bg-brand-50 hover:text-brand-700"
              >
                <i className="ri-pencil-line text-base" />
              </button>
              <button
                type="button"
                onClick={() => setPacienteParaFallecido(p)}
                title="Marcar como fallecido"
                className="flex size-8 cursor-pointer items-center justify-center rounded-field border border-line text-muted transition-colors hover:border-danger/30 hover:bg-danger-soft hover:text-danger"
              >
                <i className="ri-user-unfollow-line text-base" />
              </button>
            </>
          ) : (
            <span
              title="Paciente fallecido"
              className="flex size-8 items-center justify-center text-muted/40 cursor-default"
            >
              <i className="ri-forbid-line text-base" />
            </span>
          )}
        </div>
      ),
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

      {/* Barra de Filtros */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-card border border-line bg-surface p-4 shadow-card">
        <SearchBar
          value={busqueda}
          onChange={setBusqueda}
          placeholder="Buscar por nombre, expediente o documento..."
          className="min-w-[240px] flex-1"
        />

        {/* Filtro por Categoría de Edad */}
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

        {/* Filtro por Estado: ACTIVO, FALLECIDO, TODOS */}
        <div>
          <select
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value as EstadoPaciente)}
            className="h-10 rounded-field border border-line bg-surface px-3 text-xs font-semibold text-ink outline-none focus:border-brand-600"
          >
            <option value="ACTIVO">Solo Activos (Por defecto)</option>
            <option value="FALLECIDO">Solo Fallecidos</option>
            <option value="TODOS">Todos los Pacientes</option>
          </select>
        </div>

        {/* Filtro por Fecha de Registro */}
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

      {/* Modales */}
      <NuevoPacienteModal isOpen={modalNuevo} onClose={() => setModalNuevo(false)} />

      <ConfirmarFallecidoModal
        paciente={pacienteParaFallecido}
        isOpen={pacienteParaFallecido !== null}
        onClose={() => setPacienteParaFallecido(null)}
      />

      <EditarPacienteModal
        paciente={pacienteParaEditar}
        isOpen={pacienteParaEditar !== null}
        onClose={() => setPacienteParaEditar(null)}
      />
    </div>
  );
}

export default DirectorioPacientes;
