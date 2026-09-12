import { useMemo, useState } from 'react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import SearchBar from '@/components/ui/SearchBar';
import { useCatalogoEspecialidades } from '@/hooks/especialidad/useEspecialidades';
import { cn, getIniciales, normalizar } from '@/lib/utils';
import { getHorarioResumidoMedico, mockCatalogoEspecialidades } from '@/services/mockData';
import type { EspecialidadConMedicos } from '@/types/especialidad.types';
import type { Usuario } from '@/types/user.types';

type ModoVista = 'ESPECIALIDADES' | 'MEDICOS';

export function CatalogoEspecialidadesPage() {
  const { data: rawCatalogo = [], isLoading } = useCatalogoEspecialidades();

  // Asegurar siempre datos de mockData si el backend no responde o devuelve lista vacía
  const catalogo: EspecialidadConMedicos[] = useMemo(() => {
    return Array.isArray(rawCatalogo) && rawCatalogo.length > 0
      ? rawCatalogo
      : mockCatalogoEspecialidades;
  }, [rawCatalogo]);

  const [busqueda, setBusqueda] = useState('');
  const [filtroEspecialidad, setFiltroEspecialidad] = useState<string>('TODAS');
  const [filtroMedico, setFiltroMedico] = useState<string>('TODOS');
  const [filtroDisponibilidad, setFiltroDisponibilidad] = useState<'TODOS' | 'ACTIVO'>('TODOS');
  const [modoVista, setModoVista] = useState<ModoVista>('ESPECIALIDADES');

  const [expandidas, setExpandidas] = useState<string[]>([]);
  const [colapsadas, setColapsadas] = useState<string[]>([]);

  // Directorio consolidado de médicos únicos con sus especialidades asignadas
  const todosLosMedicos = useMemo(() => {
    const mapa = new Map<string, { medico: Usuario; especialidades: string[] }>();
    catalogo.forEach((esp) => {
      esp.medicos.forEach((m) => {
        const existente = mapa.get(m.id);
        if (existente) {
          if (!existente.especialidades.includes(esp.nombre)) {
            existente.especialidades.push(esp.nombre);
          }
        } else {
          mapa.set(m.id, { medico: m, especialidades: [esp.nombre] });
        }
      });
    });
    return Array.from(mapa.values()).sort((a, b) =>
      a.medico.nombreCompleto.localeCompare(b.medico.nombreCompleto),
    );
  }, [catalogo]);

  // Lista de especialidades únicas para el filtro
  const listaEspecialidades = useMemo(() => {
    return catalogo.map((e) => ({ id: e.id, nombre: e.nombre }));
  }, [catalogo]);

  const hayFiltrosActivos = Boolean(
    busqueda.trim() ||
      filtroEspecialidad !== 'TODAS' ||
      filtroMedico !== 'TODOS' ||
      filtroDisponibilidad !== 'TODOS',
  );

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroEspecialidad('TODAS');
    setFiltroMedico('TODOS');
    setFiltroDisponibilidad('TODOS');
    setColapsadas([]);
  };

  // Filtrado de especialidades: DENTRO de cada especialidad, SOLO se muestran los médicos que coinciden
  const especialidadesFiltradas = useMemo(() => {
    const termino = normalizar(busqueda);

    return catalogo
      .map((esp) => {
        // 1. Filtro por especialidad seleccionada
        if (filtroEspecialidad !== 'TODAS' && esp.id !== filtroEspecialidad) {
          return null;
        }

        const coincideNombreEspecialidad =
          !termino || normalizar(esp.nombre).includes(termino);

        // 2. Filtrar médicos estrictamente según la búsqueda y filtros
        const medicosVisibles = esp.medicos.filter((medico) => {
          const coincideId = filtroMedico === 'TODOS' || medico.id === filtroMedico;
          const coincideEstado =
            filtroDisponibilidad === 'TODOS' || medico.estado === filtroDisponibilidad;

          if (termino) {
            const coincideTextoMedico =
              normalizar(medico.nombreCompleto).includes(termino) ||
              normalizar(medico.usuario).includes(termino) ||
              (medico.telefono && normalizar(medico.telefono).includes(termino));

            // Si el término coincide directamente con el médico
            if (coincideTextoMedico) {
              return coincideId && coincideEstado;
            }

            // Si el término coincide con el nombre de la especialidad, pero NO con el médico:
            // Solo incluirlo si no se especificó un médico en el dropdown
            if (coincideNombreEspecialidad && filtroMedico === 'TODOS') {
              return coincideEstado;
            }

            return false;
          }

          return coincideId && coincideEstado;
        });

        // Si el usuario aplicó filtros específicos y ningún médico coincidió, descartar la especialidad
        const busquedaAvanzadaActiva =
          Boolean(termino) || filtroMedico !== 'TODOS' || filtroDisponibilidad !== 'TODOS';

        if (busquedaAvanzadaActiva && medicosVisibles.length === 0) {
          return null;
        }

        return {
          ...esp,
          medicosVisibles,
        };
      })
      .filter((esp): esp is (EspecialidadConMedicos & { medicosVisibles: Usuario[] }) => esp !== null);
  }, [catalogo, busqueda, filtroEspecialidad, filtroMedico, filtroDisponibilidad]);

  // Filtrado para la vista "Directorio de Médicos"
  const medicosDirectorioFiltrados = useMemo(() => {
    const termino = normalizar(busqueda);

    return todosLosMedicos.filter(({ medico, especialidades }) => {
      const coincideId = filtroMedico === 'TODOS' || medico.id === filtroMedico;
      const coincideEstado =
        filtroDisponibilidad === 'TODOS' || medico.estado === filtroDisponibilidad;

      const coincideEsp =
        filtroEspecialidad === 'TODAS' ||
        catalogo.some(
          (esp) => esp.id === filtroEspecialidad && esp.medicos.some((m) => m.id === medico.id),
        );

      const coincideTexto =
        !termino ||
        normalizar(medico.nombreCompleto).includes(termino) ||
        normalizar(medico.usuario).includes(termino) ||
        (medico.telefono && normalizar(medico.telefono).includes(termino)) ||
        especialidades.some((espNombre) => normalizar(espNombre).includes(termino));

      return coincideId && coincideEstado && coincideEsp && coincideTexto;
    });
  }, [todosLosMedicos, busqueda, filtroMedico, filtroDisponibilidad, filtroEspecialidad, catalogo]);

  // Manejo inteligente de apertura de acordeones
  const estaAbierta = (id: string) => {
    if (busqueda.trim() || filtroMedico !== 'TODOS') {
      return !colapsadas.includes(id);
    }
    return expandidas.includes(id);
  };

  const alternar = (id: string) => {
    if (busqueda.trim() || filtroMedico !== 'TODOS') {
      setColapsadas((previas) =>
        previas.includes(id) ? previas.filter((v) => v !== id) : [...previas, id],
      );
    } else {
      setExpandidas((previas) =>
        previas.includes(id) ? previas.filter((v) => v !== id) : [...previas, id],
      );
    }
  };

  // Métricas rápidas
  const totalMedicosActivos = todosLosMedicos.filter((m) => m.medico.estado === 'ACTIVO').length;

  if (isLoading) {
    return <LoadingSpinner label="Cargando catálogo de especialidades..." />;
  }

  return (
    <div className="mx-auto max-w-6xl">
      {/* Encabezado */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Catálogo de Especialidades y Médicos</h1>
          <p className="mt-1 text-sm text-muted">
            Consulta las especialidades clínicas activas, los médicos especialistas y sus
            horarios de atención.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-info-soft px-3 py-1.5 text-xs font-semibold text-info">
            <i className="ri-eye-line" />
            Vista de orientación y consulta
          </span>
        </div>
      </div>

      {/* Métricas rápidas */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-card border border-line bg-surface p-4 shadow-card">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-field bg-brand-50 text-brand-600">
            <i className="ri-stethoscope-line text-xl" />
          </span>
          <div>
            <p className="text-2xl font-bold text-ink">{catalogo.length}</p>
            <p className="text-xs text-muted">Especialidades activas</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-card border border-line bg-surface p-4 shadow-card">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-field bg-royal-soft text-royal">
            <i className="ri-user-star-line text-xl" />
          </span>
          <div>
            <p className="text-2xl font-bold text-ink">{todosLosMedicos.length}</p>
            <p className="text-xs text-muted">Médicos especialistas</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-card border border-line bg-surface p-4 shadow-card">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-field bg-success-soft text-success">
            <i className="ri-checkbox-circle-line text-xl" />
          </span>
          <div>
            <p className="text-2xl font-bold text-ink">{totalMedicosActivos}</p>
            <p className="text-xs text-muted">Especialistas disponibles</p>
          </div>
        </div>
      </div>

      {/* Barra de Filtros Limpia */}
      <div className="mb-4 rounded-card border border-line bg-surface p-4 shadow-card space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <SearchBar
            value={busqueda}
            onChange={setBusqueda}
            placeholder="Buscar por especialidad o nombre del médico..."
            className="min-w-60 flex-1"
          />

          {/* Filtro por Especialidad */}
          <select
            value={filtroEspecialidad}
            onChange={(e) => setFiltroEspecialidad(e.target.value)}
            className="h-10 rounded-field border border-line bg-surface px-3 text-xs font-medium text-ink outline-none focus:border-brand-600"
          >
            <option value="TODAS">Todas las Especialidades</option>
            {listaEspecialidades.map((esp) => (
              <option key={esp.id} value={esp.id}>
                {esp.nombre}
              </option>
            ))}
          </select>

          {/* Filtro por Médico Específico */}
          <select
            value={filtroMedico}
            onChange={(e) => setFiltroMedico(e.target.value)}
            className="h-10 rounded-field border border-line bg-surface px-3 text-xs font-medium text-ink outline-none focus:border-brand-600"
          >
            <option value="TODOS">Todos los Médicos</option>
            {todosLosMedicos.map(({ medico }) => (
              <option key={medico.id} value={medico.id}>
                {medico.nombreCompleto}
              </option>
            ))}
          </select>

          {/* Filtro por Disponibilidad */}
          <select
            value={filtroDisponibilidad}
            onChange={(e) => setFiltroDisponibilidad(e.target.value as 'TODOS' | 'ACTIVO')}
            className="h-10 rounded-field border border-line bg-surface px-3 text-xs font-medium text-ink outline-none focus:border-brand-600"
          >
            <option value="TODOS">Todos los estados</option>
            <option value="ACTIVO">Solo disponibles</option>
          </select>

          {hayFiltrosActivos && (
            <button
              type="button"
              onClick={limpiarFiltros}
              title="Limpiar todos los filtros"
              className="flex h-10 cursor-pointer items-center gap-1.5 rounded-field border border-line px-3 text-xs font-semibold text-muted transition-colors hover:bg-canvas hover:text-ink"
            >
              <i className="ri-filter-off-line text-sm" />
              Limpiar
            </button>
          )}
        </div>

        {/* Selector de Modo de Vista */}
        <div className="flex items-center justify-between border-t border-line/60 pt-3">
          <p className="text-xs text-muted">
            {modoVista === 'ESPECIALIDADES'
              ? `Mostrando ${especialidadesFiltradas.length} especialidad(es) activa(s)`
              : `Mostrando ${medicosDirectorioFiltrados.length} médico(s) especialista(s)`}
          </p>

          <div className="flex items-center rounded-field border border-line bg-canvas p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setModoVista('ESPECIALIDADES')}
              className={cn(
                'flex items-center gap-1.5 rounded-field px-3 py-1.5 transition-colors',
                modoVista === 'ESPECIALIDADES'
                  ? 'bg-surface text-brand-700 shadow-sm'
                  : 'text-muted hover:text-ink',
              )}
            >
              <i className="ri-folder-shared-line" />
              Por Especialidad
            </button>
            <button
              type="button"
              onClick={() => setModoVista('MEDICOS')}
              className={cn(
                'flex items-center gap-1.5 rounded-field px-3 py-1.5 transition-colors',
                modoVista === 'MEDICOS'
                  ? 'bg-surface text-brand-700 shadow-sm'
                  : 'text-muted hover:text-ink',
              )}
            >
              <i className="ri-user-star-line" />
              Directorio de Médicos
            </button>
          </div>
        </div>
      </div>

      {/* VISTA 1: Por Especialidad */}
      {modoVista === 'ESPECIALIDADES' && (
        <>
          {especialidadesFiltradas.length === 0 ? (
            <div className="rounded-card border border-line bg-surface shadow-card">
              <EmptyState
                icon="ri-search-line"
                title="Sin especialidades o médicos encontrados"
                message="No se encontraron especialidades ni médicos que coincidan con los filtros aplicados."
                action={
                  hayFiltrosActivos ? (
                    <Button variant="secondary" size="sm" onClick={limpiarFiltros}>
                      Limpiar filtros
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <div className="grid gap-3">
              {especialidadesFiltradas.map((esp) => {
                const abierta = estaAbierta(esp.id);
                const totalMedicos = esp.medicosVisibles.length;
                const totalOriginales = esp.medicos.length;
                const filtrandoMedicos = totalMedicos !== totalOriginales;

                return (
                  <article
                    key={esp.id}
                    className="overflow-hidden rounded-card border border-line bg-surface shadow-card transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => alternar(esp.id)}
                      aria-expanded={abierta}
                      className="flex w-full cursor-pointer items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-brand-50/40"
                    >
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-field bg-brand-50 text-brand-600">
                        <i className="ri-stethoscope-line text-xl" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-bold text-ink">{esp.nombre}</p>
                          {filtrandoMedicos && (
                            <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-700">
                              Filtro activo
                            </span>
                          )}
                        </div>
                        <p className="truncate text-sm text-muted">
                          {esp.descripcion || 'Sin descripción clínica'}
                        </p>
                      </div>

                      {/* Badge con indicación clara del número de médicos que coinciden */}
                      <Badge
                        variant={totalMedicos > 0 ? (filtrandoMedicos ? 'royal' : 'success') : 'warning'}
                        dot
                      >
                        {filtrandoMedicos
                          ? `${totalMedicos} ${totalMedicos === 1 ? 'médico coincidente' : 'médicos coincidentes'}`
                          : `${totalMedicos} ${totalMedicos === 1 ? 'disponible' : 'disponibles'}`}
                      </Badge>

                      <i
                        className={cn(
                          'ri-arrow-down-s-line shrink-0 text-xl text-muted transition-transform',
                          abierta && 'rotate-180',
                        )}
                      />
                    </button>

                    {abierta && (
                      <div className="border-t border-line bg-canvas px-5 py-4">
                        {esp.medicosVisibles.length === 0 ? (
                          <p className="text-sm text-muted">
                            No hay médicos en esta especialidad que coincidan con la búsqueda.
                          </p>
                        ) : (
                          <ul className="grid gap-3 sm:grid-cols-2">
                            {esp.medicosVisibles.map((medico) => {
                              const horarioResumido = getHorarioResumidoMedico(medico.id);

                              return (
                                <li
                                  key={medico.id}
                                  className="flex flex-col justify-between rounded-field border border-line bg-surface p-3.5 shadow-sm transition-shadow hover:shadow"
                                >
                                  <div className="flex items-start gap-3">
                                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                                      {getIniciales(medico.nombreCompleto)}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-sm font-bold text-ink">
                                        {medico.nombreCompleto}
                                      </p>
                                      <p className="truncate text-xs text-muted">
                                        {medico.usuario}
                                        {medico.telefono ? ` · Tel: ${medico.telefono}` : ''}
                                      </p>
                                    </div>
                                    <Badge
                                      dot
                                      variant={medico.estado === 'ACTIVO' ? 'success' : 'danger'}
                                    >
                                      {medico.estado === 'ACTIVO' ? 'Disponible' : 'No disponible'}
                                    </Badge>
                                  </div>

                                  {/* Horarios de atención */}
                                  <div className="mt-3 flex items-center gap-1.5 rounded bg-canvas px-2.5 py-1.5 text-[11px] font-medium text-muted">
                                    <i className="ri-time-line text-brand-600 shrink-0 text-xs" />
                                    <span className="truncate">
                                      Horario: <strong className="text-ink font-semibold">{horarioResumido}</strong>
                                    </span>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* VISTA 2: Directorio Directo de Médicos */}
      {modoVista === 'MEDICOS' && (
        <>
          {medicosDirectorioFiltrados.length === 0 ? (
            <div className="rounded-card border border-line bg-surface shadow-card">
              <EmptyState
                icon="ri-user-search-line"
                title="Sin médicos especialistas encontrados"
                message="No se encontraron médicos especialistas que coincidan con los filtros aplicados."
                action={
                  hayFiltrosActivos ? (
                    <Button variant="secondary" size="sm" onClick={limpiarFiltros}>
                      Limpiar filtros
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {medicosDirectorioFiltrados.map(({ medico, especialidades }) => {
                const horario = getHorarioResumidoMedico(medico.id);

                return (
                  <div
                    key={medico.id}
                    className="flex flex-col justify-between rounded-card border border-line bg-surface p-4 shadow-card transition-shadow hover:shadow-md"
                  >
                    <div>
                      {/* Cabecera del médico */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">
                            {getIniciales(medico.nombreCompleto)}
                          </span>
                          <div>
                            <h3 className="font-bold text-ink leading-snug">
                              {medico.nombreCompleto}
                            </h3>
                            <p className="text-xs text-muted">{medico.usuario}</p>
                          </div>
                        </div>
                      </div>

                      {/* Especialidades asociadas */}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {especialidades.map((espNombre) => (
                          <Badge key={espNombre} variant="info">
                            <i className="ri-stethoscope-line text-[10px] mr-1" />
                            {espNombre}
                          </Badge>
                        ))}
                      </div>

                      {/* Teléfono y estado */}
                      <div className="mt-3 flex items-center justify-between text-xs text-muted border-t border-line/50 pt-2.5">
                        <span className="flex items-center gap-1">
                          <i className="ri-phone-line text-brand-600" />
                          {medico.telefono || 'Sin teléfono'}
                        </span>
                        <Badge
                          dot
                          variant={medico.estado === 'ACTIVO' ? 'success' : 'danger'}
                        >
                          {medico.estado === 'ACTIVO' ? 'Disponible' : 'No disponible'}
                        </Badge>
                      </div>
                    </div>

                    {/* Horario de atención */}
                    <div className="mt-3.5 flex items-start gap-1.5 rounded-field bg-canvas px-3 py-2 text-xs text-muted">
                      <i className="ri-calendar-schedule-line text-brand-600 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold text-ink">Horarios de consulta:</p>
                        <p className="text-[11px] leading-tight text-muted">{horario}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default CatalogoEspecialidadesPage;
