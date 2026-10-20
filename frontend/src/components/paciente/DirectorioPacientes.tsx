import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import ConfirmarFallecidoModal from '@/components/paciente/ConfirmarFallecidoModal';
import EditarPacienteModal from '@/components/paciente/EditarPacienteModal';
import NuevoPacienteModal from '@/components/paciente/NuevoPacienteModal';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import DataTable, { type Column } from '@/components/ui/DataTable';
import SearchBar from '@/components/ui/SearchBar';
import { useAuth } from '@/hooks/auth/useAuth';
import { usePacientes } from '@/hooks/paciente/usePacientes';
import type { EstadoPaciente, Paciente } from '@/types/paciente.types';

export function DirectorioPacientes() {
  const navigate = useNavigate();
  const location = useLocation();
  const { usuario } = useAuth();
  const esMedico = usuario?.rol === 'MEDICO';
  const esRecepcionista = usuario?.rol === 'RECEPCIONISTA';

  // Los filtros viven en la URL: al abrir un expediente y volver, el directorio queda como estaba.
  const [params, setParams] = useSearchParams();
  const busqueda = params.get('q') ?? '';
  const categoriaParam = params.get('categoria');
  const categoriaFiltro: 'TODOS' | 'ADULTO' | 'MENOR' =
    categoriaParam === 'ADULTO' || categoriaParam === 'MENOR' ? categoriaParam : 'TODOS';
  const estadoParam = params.get('estado');
  const estadoFiltro: EstadoPaciente =
    estadoParam === 'FALLECIDO' || estadoParam === 'TODOS' ? estadoParam : 'ACTIVO';
  const fechaRegistroFiltro = params.get('registro') ?? '';
  const soloPendientes = params.get('pendientes') === '1';

  const cambiarParams = (cambios: Record<string, string | null>) => {
    setParams(
      (previos) => {
        const nuevos = new URLSearchParams(previos);
        Object.entries(cambios).forEach(([clave, valor]) => {
          if (valor === null || valor === '') nuevos.delete(clave);
          else nuevos.set(clave, valor);
        });
        return nuevos;
      },
      { replace: true },
    );
  };
  const setBusqueda = (valor: string) => cambiarParams({ q: valor });
  const setCategoriaFiltro = (valor: string) =>
    cambiarParams({ categoria: valor === 'TODOS' ? null : valor });
  const setEstadoFiltro = (valor: string) =>
    cambiarParams({ estado: valor === 'ACTIVO' ? null : valor });
  const setFechaRegistroFiltro = (valor: string) => cambiarParams({ registro: valor });
  const setSoloPendientes = (valor: boolean) => cambiarParams({ pendientes: valor ? '1' : null });

  const [modalNuevo, setModalNuevo] = useState(false);
  const [pacienteParaEditar, setPacienteParaEditar] = useState<Paciente | null>(null);
  const [pacienteParaFallecido, setPacienteParaFallecido] = useState<Paciente | null>(null);

  // Consulta inmediata: registros hechos por médicos que recepción debe completar.
  const { data: pendientes = [] } = usePacientes({ estado: 'TODOS', pendientes: true });
  // Sin pendientes el aviso desaparece, y con él el filtro.
  const filtrarPendientes = soloPendientes && pendientes.length > 0;

  // Llamada al hook con el filtro de estado y búsqueda
  const { data: pacientes = [], isLoading } = usePacientes({
    buscar: busqueda,
    estado: estadoFiltro,
    categoria: categoriaFiltro,
    pendientes: filtrarPendientes,
  });

  const pacientesFiltrados = useMemo(() => {
    return pacientes.filter((p) => {
      const coincideFecha =
        !fechaRegistroFiltro || p.fecha_registro === fechaRegistroFiltro;
      return coincideFecha;
    });
  }, [pacientes, fechaRegistroFiltro]);

  // Dos motivos para completar: lo registró un médico, o ya es adulto y falta su documento.
  const sinDocumento = pendientes.filter((p) => p.documento_pendiente).length;
  const deMedicos = pendientes.length - sinDocumento;
  const textoPendientes = [
    sinDocumento > 0 &&
      `${sinDocumento} ${sinDocumento === 1 ? 'paciente cumplió' : 'pacientes cumplieron'} 18 años: falta su documento`,
    deMedicos > 0 &&
      `${deMedicos} ${deMedicos === 1 ? 'paciente registrado' : 'pacientes registrados'} por un médico: completar sus datos`,
  ]
    .filter(Boolean)
    .join('  ·  ');

  const columns: Column<Paciente>[] = [
    {
      key: 'expediente',
      header: 'Expediente',
      render: (p) => (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-field bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700">
          {p.numero_expediente}
        </span>
      ),
    },
    {
      key: 'nombre',
      header: 'Nombre del Paciente',
      render: (p) => (
        <div className="flex items-center gap-3">
          <div>
            <p className="font-semibold text-ink">
              {p.nombre_completo}
              {/* Lo normal es estar activo: solo se marca al fallecido (el filtro de estado sigue arriba). */}
              {p.estado === 'FALLECIDO' && (
                <Badge variant="danger" className="ml-2 align-middle">
                  Fallecido
                </Badge>
              )}
            </p>
            <p className="text-xs text-muted">Nacimiento: {p.fecha_nacimiento}</p>
            {p.documento_pendiente ? (
              <span
                className="mt-1 inline-block"
                title="Se registró de menor y ya cumplió 18 años. Edita el paciente para agregar su documento de identidad."
              >
                <Badge variant="warning">Documento pendiente</Badge>
              </span>
            ) : (
              p.datos_pendientes && (
                <span
                  className="mt-1 inline-block"
                  title="Lo registró un médico al atenderlo sin cita. Recepción debe completar su registro."
                >
                  <Badge variant="warning">Datos pendientes</Badge>
                </span>
              )
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'dui',
      header: 'Documento',
      render: (p) => {
        if (!p.dui) {
          return (
            <span className="text-xs text-muted italic">
              Sin documento
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
      className: 'whitespace-nowrap text-muted',
      render: (p) => p.telefono ?? '—',
    },
    {
      key: 'categoria',
      header: 'Categoría',
      render: (p) => (
        <Badge variant={p.es_menor_edad ? 'warning' : 'default'}>
          {p.es_menor_edad ? 'Menor de edad' : 'Adulto'}
        </Badge>
      ),
    },
    {
      key: 'responsable',
      header: 'Responsable',
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
      header: 'Registro',
      className: 'whitespace-nowrap text-xs text-muted',
      render: (p) => p.fecha_registro,
    },
    {
      key: 'acciones',
      header: 'Acciones',
      className: 'w-px whitespace-nowrap text-right',
      render: (p) => (
        <div className="flex items-center justify-end gap-1.5">
          {(esMedico || esRecepcionista) && (
            <button
              type="button"
              onClick={() => {
                const ruta = esRecepcionista
                  ? `/secretaria/pacientes/${p.id}`
                  : `/medico/expediente/${p.id}`;
                navigate(ruta, {
                  state: { origen: { ruta: `${location.pathname}${location.search}` } },
                });
              }}
              title="Ver expediente clínico y consultas"
              className="flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-field border border-line px-2.5 text-xs font-semibold text-brand-600 transition-colors hover:bg-brand-50 hover:text-brand-700"
            >
              <i className="ri-folder-open-line text-base" />
              Expediente
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
    <div className="mx-auto max-w-[96rem]">
      {/* Encabezado */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Directorio de Pacientes</h1>
          <p className="mt-1 text-sm text-muted">
            Consulta expedientes clínicos, datos de contacto y registra nuevos pacientes.
          </p>
        </div>
        {esRecepcionista && (
          <Button icon="ri-user-add-line" onClick={() => setModalNuevo(true)}>
            Nuevo Paciente
          </Button>
        )}
      </div>

      {esRecepcionista && pendientes.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-card border border-warning/30 bg-warning-soft p-4 text-sm text-ink">
          <p>
            <i className="ri-error-warning-line mr-1.5 align-middle text-warning" />
            {textoPendientes}
          </p>
          <Button variant="secondary" onClick={() => setSoloPendientes(!filtrarPendientes)}>
            {filtrarPendientes ? 'Ver todos' : 'Ver pendientes'}
          </Button>
        </div>
      )}

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
            onChange={(e) => setCategoriaFiltro(e.target.value)}
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
            onChange={(e) => setEstadoFiltro(e.target.value)}
            className="h-10 rounded-field border border-line bg-surface px-3 text-xs font-semibold text-ink outline-none focus:border-brand-600"
          >
            <option value="ACTIVO">Solo Activos</option>
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
        compact
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
