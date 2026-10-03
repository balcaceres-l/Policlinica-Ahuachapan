import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import SearchBar from '@/components/ui/SearchBar';
import { useCatalogoEspecialidades } from '@/hooks/especialidad/useEspecialidades';
import { DIA_LABEL, DIAS_SEMANA, formatearHora } from '@/lib/constants/dias';
import { cn, normalizar } from '@/lib/utils';
import type { EspecialidadConMedicos } from '@/types/especialidad.types';
import type { Usuario } from '@/types/user.types';

const rutaTodos = '/secretaria/horarios';

const obtenerEspecialidadesDelMedico = (
  catalogo: EspecialidadConMedicos[],
  medicoId: string,
) =>
  catalogo
    .filter((especialidad) => especialidad.medicos.some((medico) => medico.id === medicoId))
    .map((especialidad) => especialidad.nombre);

export function HorariosMedicosPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { especialidadId, medicoId } = useParams<{ especialidadId?: string; medicoId?: string }>();
  const [busqueda, setBusqueda] = useState('');
  const { data: catalogo = [], isLoading } = useCatalogoEspecialidades();

  const medicos = useMemo(() => {
    const unicos = new Map<string, Usuario>();
    for (const especialidad of catalogo) {
      for (const medico of especialidad.medicos) {
        if (medico.estado === 'ACTIVO') unicos.set(medico.id, medico);
      }
    }
    return [...unicos.values()].sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto));
  }, [catalogo]);

  const especialidadSeleccionada = catalogo.find((especialidad) => especialidad.id === especialidadId);
  const medicoSeleccionado = medicos.find((medico) => medico.id === medicoId);

  const medicosVisibles = useMemo(() => {
    if (medicoSeleccionado) return medicoSeleccionado ? [medicoSeleccionado] : [];
    if (especialidadSeleccionada) {
      return especialidadSeleccionada.medicos
        .filter((medico) => medico.estado === 'ACTIVO')
        .sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto));
    }
    return medicos;
  }, [especialidadSeleccionada, medicoSeleccionado, medicos]);

  const sugerencias = useMemo(() => {
    const termino = normalizar(busqueda);
    if (!termino) return [];
    return medicos
      .filter((medico) => normalizar(medico.nombreCompleto).includes(termino))
      .slice(0, 5);
  }, [busqueda, medicos]);

  const titulo = medicoSeleccionado
    ? `Horario de ${medicoSeleccionado.nombreCompleto}`
    : especialidadSeleccionada
      ? `Horarios de ${especialidadSeleccionada.nombre}`
      : 'Horarios de médicos';

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">{titulo}</h1>
        <p className="mt-1 text-sm text-muted">
          Consulta los horarios de atención asignados por el administrador. Solo se muestran médicos activos.
        </p>
      </div>

      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-card border border-line bg-surface p-4 shadow-card">
        <div className="min-w-56 flex-1">
          <label className="mb-1 block text-xs font-semibold text-muted">Especialidad:</label>
          <select
            value={especialidadId ?? ''}
            onChange={(event) =>
              navigate(
                event.target.value
                  ? `${rutaTodos}/especialidad/${event.target.value}`
                  : rutaTodos,
              )
            }
            className="h-10 w-full rounded-field border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-brand-600"
          >
            <option value="">Todas las especialidades ({medicos.length} médicos)</option>
            {catalogo.map((especialidad) => (
              <option key={especialidad.id} value={especialidad.id}>
                {especialidad.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="relative min-w-64 flex-1">
          <label className="mb-1 block text-xs font-semibold text-muted">Buscar médico:</label>
          <SearchBar
            value={busqueda}
            onChange={setBusqueda}
            placeholder="Nombre del doctor..."
          />
          {sugerencias.length > 0 && (
            <div className="absolute inset-x-0 top-[4.35rem] z-10 overflow-hidden rounded-field border border-line bg-surface shadow-pop">
              {sugerencias.map((medico) => (
                <button
                  key={medico.id}
                  type="button"
                  onClick={() => {
                    navigate(`${rutaTodos}/medico/${medico.id}`);
                    setBusqueda('');
                  }}
                  className="flex w-full cursor-pointer items-center justify-between px-3 py-2.5 text-left text-sm hover:bg-brand-50"
                >
                  <span className="font-medium text-ink">{medico.nombreCompleto}</span>
                  <span className="text-xs text-muted">{medico.cargo}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {(especialidadId || medicoId || busqueda) && (
          <button
            type="button"
            onClick={() => {
              navigate(rutaTodos);
              setBusqueda('');
            }}
            className="h-10 cursor-pointer rounded-field border border-line px-3 text-sm font-medium text-muted hover:bg-canvas hover:text-ink"
          >
            <i className="ri-filter-off-line mr-1" />
            Limpiar
          </button>
        )}
      </div>

      {isLoading ? (
        <LoadingSpinner label="Cargando horarios..." />
      ) : medicosVisibles.length === 0 ? (
        <EmptyState
          icon="ri-user-search-line"
          title="No se encontraron médicos"
          message="Prueba con otra especialidad o nombre."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {medicosVisibles.map((medico) => (
            <article
              key={medico.id}
              className={cn(
                'rounded-card border border-line bg-surface p-5 shadow-card',
                medico.id === medicoId && 'border-brand-300 ring-2 ring-brand-600/10',
              )}
            >
              <header className="mb-4 flex items-start justify-between gap-3 border-b border-line pb-4">
                <div>
                  <h2 className="font-bold text-ink">{medico.nombreCompleto}</h2>
                  <p className="mt-1 text-xs text-muted">{medico.cargo}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {obtenerEspecialidadesDelMedico(catalogo, medico.id).map((nombre) => (
                      <span key={nombre} className="rounded-field bg-info-soft px-2 py-0.5 text-xs font-semibold text-info">
                        {nombre}
                      </span>
                    ))}
                  </div>
                </div>
                <i className="ri-calendar-schedule-line text-xl text-brand-600" />
              </header>

              {medico.horarios && medico.horarios.length > 0 ? (
                <div className="space-y-2">
                  {DIAS_SEMANA.map((dia) => {
                    const horarios = medico.horarios?.filter((horario) => horario.dia_semana === dia) ?? [];
                    if (horarios.length === 0) return null;
                    return (
                      <div key={dia} className="flex items-center justify-between rounded-field bg-canvas px-3 py-2">
                        <span className="text-sm font-semibold text-ink">{DIA_LABEL[dia]}</span>
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {horarios.map((horario) => (
                            <span key={horario.id} className="text-sm font-medium text-muted">
                              {formatearHora(horario.hora_inicio)} – {formatearHora(horario.hora_fin)}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-field bg-warning-soft px-3 py-2 text-sm text-warning">
                  No tiene horarios configurados.
                </p>
              )}
            </article>
          ))}
        </div>
      )}

      <p className="mt-4 text-xs text-muted">
        {location.pathname === rutaTodos ? 'Mostrando todos los médicos activos.' : `Mostrando ${medicosVisibles.length} médico(s).`}
      </p>
    </div>
  );
}

export default HorariosMedicosPage;
