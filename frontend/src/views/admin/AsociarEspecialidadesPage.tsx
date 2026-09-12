import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import SearchBar from '@/components/ui/SearchBar';
import {
  useAsignarEspecialidad,
  useEspecialidadesActivas,
  useEspecialidadesDeMedico,
  useQuitarEspecialidad,
} from '@/hooks/especialidad/useEspecialidades';
import { useMedicos } from '@/hooks/usuario/useUsuarios';
import { cn, getIniciales, normalizar } from '@/lib/utils';

export function AsociarEspecialidadesPage() {
  const [busqueda, setBusqueda] = useState('');
  const [medicoId, setMedicoId] = useState<string | null>(null);

  const { data: medicos = [], isLoading: cargandoMedicos } = useMedicos();
  const { data: especialidades = [], isLoading: cargandoEspecialidades } =
    useEspecialidadesActivas();
  const { data: asignadas = [], isLoading: cargandoAsignadas } =
    useEspecialidadesDeMedico(medicoId);

  const asignar = useAsignarEspecialidad();
  const quitar = useQuitarEspecialidad();

  const medicoSeleccionado = medicos.find((m) => m.id === medicoId) ?? null;
  const idsAsignadas = new Set(asignadas.map((esp) => esp.id));
  const mutando = asignar.isPending || quitar.isPending;

  const medicosFiltrados = useMemo(() => {
    const termino = normalizar(busqueda);
    if (!termino) return medicos;
    return medicos.filter(
      (medico) =>
        normalizar(medico.nombreCompleto).includes(termino) ||
        normalizar(medico.cargo).includes(termino),
    );
  }, [medicos, busqueda]);

  /** Un clic sobre el chip alterna la relación médico ↔ especialidad. */
  const alternar = (especialidadId: string, nombre: string) => {
    if (medicoId === null || mutando) return;

    if (idsAsignadas.has(especialidadId)) {
      quitar.mutate(
        { medicoId, especialidadId },
        {
          onSuccess: () => toast.success(`Se quitó "${nombre}".`),
          onError: (error: Error) => toast.error(error.message),
        },
      );
    } else {
      asignar.mutate(
        { medicoId, especialidadId },
        {
          onSuccess: () => toast.success(`Se asignó "${nombre}".`),
          onError: (error: Error) => toast.error(error.message),
        },
      );
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Asociación de Médicos a Especialidades</h1>
        <p className="mt-1 text-sm text-muted">
          Selecciona un médico y marca las especialidades que atiende. Un médico puede tener
          varias especialidades, pero mantiene una sola agenda de citas.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        {/* --- Columna izquierda: médicos --- */}
        <section className="flex max-h-[70vh] flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card">
          <div className="border-b border-line p-4">
            <p className="mb-3 text-sm font-bold text-ink">
              Médicos <span className="font-normal text-muted">({medicos.length})</span>
            </p>
            <SearchBar value={busqueda} onChange={setBusqueda} placeholder="Buscar médico..." />
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {cargandoMedicos ? (
              <LoadingSpinner label="Cargando médicos..." />
            ) : medicosFiltrados.length === 0 ? (
              <EmptyState
                icon="ri-user-search-line"
                title="Sin coincidencias"
                message="Prueba con otro nombre."
              />
            ) : (
              medicosFiltrados.map((medico) => {
                const activo = medico.id === medicoId;
                return (
                  <button
                    key={medico.id}
                    type="button"
                    onClick={() => setMedicoId(medico.id)}
                    className={cn(
                      'mb-1 flex w-full cursor-pointer items-center gap-3 rounded-field px-3 py-2.5 text-left transition-colors',
                      activo ? 'bg-brand-50 ring-1 ring-brand-200' : 'hover:bg-canvas',
                    )}
                  >
                    <span
                      className={cn(
                        'flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                        activo ? 'bg-brand-600 text-white' : 'bg-info-soft text-info',
                      )}
                    >
                      {getIniciales(medico.nombreCompleto)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">
                        {medico.nombreCompleto}
                      </p>
                      <p className="truncate text-xs text-muted">{medico.cargo}</p>
                    </div>
                    {medico.estado === 'INACTIVO' && (
                      <i className="ri-forbid-line text-sm text-danger" title="Usuario inactivo" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </section>

        {/* --- Columna derecha: especialidades --- */}
        <section className="rounded-card border border-line bg-surface p-6 shadow-card">
          {!medicoSeleccionado ? (
            <EmptyState
              icon="ri-links-line"
              title="Selecciona un médico"
              message="Elige un médico de la lista para ver y modificar sus especialidades asignadas."
            />
          ) : (
            <>
              <header className="mb-5 flex items-center gap-4 border-b border-line pb-5">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-600 text-base font-bold text-white">
                  {getIniciales(medicoSeleccionado.nombreCompleto)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-bold text-ink">
                    {medicoSeleccionado.nombreCompleto}
                  </p>
                  <p className="truncate text-sm text-muted">{medicoSeleccionado.usuario}</p>
                </div>
                <Badge
                  dot
                  variant={medicoSeleccionado.estado === 'ACTIVO' ? 'success' : 'danger'}
                >
                  {medicoSeleccionado.estado === 'ACTIVO' ? 'Activo' : 'Inactivo'}
                </Badge>
              </header>

              {/* Asignadas */}
              <div className="mb-6">
                <p className="mb-2.5 text-sm font-bold text-ink">
                  Especialidades asignadas{' '}
                  <span className="font-normal text-muted">({asignadas.length})</span>
                </p>

                {cargandoAsignadas ? (
                  <LoadingSpinner label="Cargando asignaciones..." />
                ) : asignadas.length === 0 ? (
                  <p className="rounded-field border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
                    Este médico todavía no tiene especialidades asignadas.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {asignadas.map((esp) => (
                      <span
                        key={esp.id}
                        className="inline-flex items-center gap-2 rounded-full bg-brand-600 py-1.5 pl-3.5 pr-2 text-sm font-semibold text-white"
                      >
                        {esp.nombre}
                        <button
                          type="button"
                          disabled={mutando}
                          onClick={() => alternar(esp.id, esp.nombre)}
                          aria-label={`Quitar ${esp.nombre}`}
                          className="flex size-5 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <i className="ri-close-line text-sm" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Disponibles */}
              <div>
                <p className="mb-2.5 text-sm font-bold text-ink">Catálogo disponible</p>

                {cargandoEspecialidades ? (
                  <LoadingSpinner label="Cargando catálogo..." />
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {especialidades.map((esp) => {
                      const seleccionada = idsAsignadas.has(esp.id);
                      return (
                        <label
                          key={esp.id}
                          className={cn(
                            'flex cursor-pointer items-start gap-3 rounded-field border p-3 transition-colors',
                            seleccionada
                              ? 'border-brand-300 bg-brand-50'
                              : 'border-line hover:bg-canvas',
                            mutando && 'pointer-events-none opacity-60',
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={seleccionada}
                            disabled={mutando}
                            onChange={() => alternar(esp.id, esp.nombre)}
                            className="mt-0.5 size-4 shrink-0 cursor-pointer accent-brand-600"
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-ink">
                              {esp.nombre}
                            </span>
                            <span className="mt-0.5 block text-xs text-muted">
                              {esp.descripcion || 'Sin descripción'}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default AsociarEspecialidadesPage;
