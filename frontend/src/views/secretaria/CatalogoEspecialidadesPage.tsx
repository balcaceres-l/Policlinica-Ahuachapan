import { useMemo, useState } from 'react';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import SearchBar from '@/components/ui/SearchBar';
import { useCatalogoEspecialidades } from '@/hooks/especialidad/useEspecialidades';
import { cn, getIniciales, normalizar } from '@/lib/utils';

export function CatalogoEspecialidadesPage() {
  const { data: catalogo = [], isLoading } = useCatalogoEspecialidades();
  const [busqueda, setBusqueda] = useState('');
  const [expandidas, setExpandidas] = useState<number[]>([]);

  const filtrado = useMemo(() => {
    const termino = normalizar(busqueda);
    if (!termino) return catalogo;

    return catalogo.filter(
      (esp) =>
        normalizar(esp.nombre).includes(termino) ||
        esp.medicos.some((medico) => normalizar(medico.nombreCompleto).includes(termino)),
    );
  }, [catalogo, busqueda]);

  const alternar = (id: number) =>
    setExpandidas((previas) =>
      previas.includes(id) ? previas.filter((valor) => valor !== id) : [...previas, id],
    );

  if (isLoading) {
    return <LoadingSpinner label="Cargando catálogo de especialidades..." />;
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Catálogo de Especialidades</h1>
        <p className="mt-1 text-sm text-muted">
          Consulta las especialidades activas y los médicos disponibles para orientar el
          agendamiento de citas.
        </p>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <SearchBar
          value={busqueda}
          onChange={setBusqueda}
          placeholder="Buscar especialidad o médico..."
          className="min-w-[260px] flex-1"
        />
        <span className="inline-flex items-center gap-1.5 rounded-full bg-info-soft px-3 py-1.5 text-xs font-semibold text-info">
          <i className="ri-eye-line" />
          Vista de solo consulta
        </span>
      </div>

      {filtrado.length === 0 ? (
        <div className="rounded-card border border-line bg-surface shadow-card">
          <EmptyState
            icon="ri-book-open-line"
            title="Sin especialidades que mostrar"
            message="No hay especialidades activas que coincidan con la búsqueda."
          />
        </div>
      ) : (
        <div className="grid gap-3">
          {filtrado.map((esp) => {
            const abierta = expandidas.includes(esp.id);
            const disponibles = esp.medicos.filter((m) => m.estado === 'ACTIVO').length;

            return (
              <article
                key={esp.id}
                className="overflow-hidden rounded-card border border-line bg-surface shadow-card"
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
                    <p className="truncate font-bold text-ink">{esp.nombre}</p>
                    <p className="truncate text-sm text-muted">
                      {esp.descripcion || 'Sin descripción'}
                    </p>
                  </div>

                  <Badge variant={disponibles > 0 ? 'success' : 'warning'} dot>
                    {disponibles} disponible{disponibles === 1 ? '' : 's'}
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
                    {esp.medicos.length === 0 ? (
                      <p className="text-sm text-muted">
                        Aún no hay médicos vinculados a esta especialidad.
                      </p>
                    ) : (
                      <ul className="grid gap-2 sm:grid-cols-2">
                        {esp.medicos.map((medico) => (
                          <li
                            key={medico.id}
                            className="flex items-center gap-3 rounded-field border border-line bg-surface px-3 py-2.5"
                          >
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-info-soft text-xs font-bold text-info">
                              {getIniciales(medico.nombreCompleto)}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-ink">
                                {medico.nombreCompleto}
                              </p>
                              <p className="truncate text-xs text-muted">
                                {medico.telefono ?? medico.usuario}
                              </p>
                            </div>
                            <Badge
                              dot
                              variant={medico.estado === 'ACTIVO' ? 'success' : 'danger'}
                            >
                              {medico.estado === 'ACTIVO' ? 'Disponible' : 'No disponible'}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default CatalogoEspecialidadesPage;
