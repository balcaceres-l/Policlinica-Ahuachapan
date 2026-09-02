import { useMemo, useState } from 'react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import DataTable from '@/components/ui/DataTable';
import Pagination from '@/components/ui/Pagination';
import SearchBar from '@/components/ui/SearchBar';
import type { Column } from '@/components/ui/DataTable';
import { useUsuarios } from '@/hooks/usuario/useUsuarios';
import {
  ESTADO_LABEL,
  OPCIONES_ESTADO,
  OPCIONES_ROL,
  ROL_AVATAR,
  ROL_BADGE,
  ROL_LABEL,
} from '@/lib/constants/roles';
import { cn, getIniciales, normalizar } from '@/lib/utils';
import type { EstadoUsuario, RolUsuario, Usuario } from '@/types/user.types';

const POR_PAGINA = 5;

export function ListaUsuariosPage() {
  const { data: usuarios = [], isLoading } = useUsuarios();

  const [busqueda, setBusqueda] = useState('');
  const [rol, setRol] = useState<RolUsuario | 'TODOS'>('TODOS');
  const [estado, setEstado] = useState<EstadoUsuario | 'TODOS'>('TODOS');
  const [pagina, setPagina] = useState(1);

  /** Aplica los tres criterios de la HU-06 sobre los datos mock. */
  const filtrados = useMemo(() => {
    const termino = normalizar(busqueda);

    return usuarios.filter((usuario) => {
      const coincideTexto =
        termino === '' ||
        normalizar(usuario.nombreCompleto).includes(termino) ||
        normalizar(usuario.usuario).includes(termino);

      const coincideRol = rol === 'TODOS' || usuario.rol === rol;
      const coincideEstado = estado === 'TODOS' || usuario.estado === estado;

      return coincideTexto && coincideRol && coincideEstado;
    });
  }, [usuarios, busqueda, rol, estado]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const inicio = (paginaActual - 1) * POR_PAGINA;
  const visibles = filtrados.slice(inicio, inicio + POR_PAGINA);

  /** Cualquier cambio de filtro devuelve la tabla a la primera página. */
  const alFiltrar = <T,>(setter: (valor: T) => void) => (valor: T) => {
    setter(valor);
    setPagina(1);
  };

  const hayFiltros = busqueda !== '' || rol !== 'TODOS' || estado !== 'TODOS';

  const limpiarFiltros = () => {
    setBusqueda('');
    setRol('TODOS');
    setEstado('TODOS');
    setPagina(1);
  };

  const columnas: Array<Column<Usuario>> = [
    {
      key: 'nombre',
      header: 'Nombre completo',
      render: (usuario) => (
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold',
              ROL_AVATAR[usuario.rol],
            )}
          >
            {getIniciales(usuario.nombreCompleto)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">{usuario.nombreCompleto}</p>
            <p className="truncate text-xs text-muted">{usuario.cargo}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'usuario',
      header: 'Usuario',
      render: (usuario) => <span className="text-muted">{usuario.usuario}</span>,
    },
    {
      key: 'rol',
      header: 'Rol',
      render: (usuario) => (
        <span
          className={cn(
            'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
            ROL_BADGE[usuario.rol],
          )}
        >
          {ROL_LABEL[usuario.rol]}
        </span>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (usuario) => (
        <Badge dot variant={usuario.estado === 'ACTIVO' ? 'success' : 'danger'}>
          {ESTADO_LABEL[usuario.estado]}
        </Badge>
      ),
    },
    {
      key: 'acciones',
      header: 'Acciones',
      className: 'w-28 text-right',
      render: (usuario) => (
        <div className="flex justify-end gap-1">
          <button
            type="button"
            disabled
            title="Edición de usuarios — HU-04 (Dennis)"
            className="flex size-8 cursor-not-allowed items-center justify-center rounded-field text-muted opacity-50"
          >
            <i className="ri-pencil-line text-base" />
          </button>
          <button
            type="button"
            disabled
            title="Activar/Desactivar — HU-05 (Dennis)"
            className="flex size-8 cursor-not-allowed items-center justify-center rounded-field text-muted opacity-50"
          >
            <i
              className={cn(
                'text-base',
                usuario.estado === 'ACTIVO' ? 'ri-forbid-line' : 'ri-checkbox-circle-line',
              )}
            />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      {/* Encabezado */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Gestión de Usuarios</h1>
          <p className="mt-1 text-sm text-muted">
            Administra el acceso y roles del personal clínico.
          </p>
        </div>
        <Button
          icon="ri-add-line"
          disabled
          title="Registro de usuarios — HU-03 (Dennis)"
        >
          Nuevo Usuario
        </Button>
      </div>

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-card border border-line bg-surface p-4 shadow-card">
        <SearchBar
          value={busqueda}
          onChange={alFiltrar(setBusqueda)}
          placeholder="Buscar por nombre o usuario..."
          className="min-w-[240px] flex-1"
        />

        <select
          value={rol}
          onChange={(event) => alFiltrar(setRol)(event.target.value as RolUsuario | 'TODOS')}
          className="h-10 cursor-pointer rounded-field border border-line bg-surface px-3 text-sm text-ink focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-600/10"
        >
          {OPCIONES_ROL.map((opcion) => (
            <option key={opcion.value} value={opcion.value}>
              {opcion.label}
            </option>
          ))}
        </select>

        <select
          value={estado}
          onChange={(event) =>
            alFiltrar(setEstado)(event.target.value as EstadoUsuario | 'TODOS')
          }
          className="h-10 cursor-pointer rounded-field border border-line bg-surface px-3 text-sm text-ink focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-600/10"
        >
          {OPCIONES_ESTADO.map((opcion) => (
            <option key={opcion.value} value={opcion.value}>
              {opcion.label}
            </option>
          ))}
        </select>

        {hayFiltros && (
          <Button variant="ghost" icon="ri-filter-off-line" onClick={limpiarFiltros}>
            Limpiar
          </Button>
        )}
      </div>

      {/* Tabla */}
      <DataTable
        columns={columnas}
        data={visibles}
        keyExtractor={(usuario) => usuario.id}
        isLoading={isLoading}
        emptyIcon="ri-user-search-line"
        emptyTitle="No se encontraron usuarios"
        emptyMessage="Ajusta la búsqueda o los filtros de rol y estado para ver resultados."
        footer={
          <Pagination
            paginaActual={paginaActual}
            totalPaginas={totalPaginas}
            total={filtrados.length}
            desde={inicio + 1}
            hasta={inicio + visibles.length}
            etiqueta="usuarios"
            onCambiarPagina={setPagina}
          />
        }
      />
    </div>
  );
}

export default ListaUsuariosPage;
