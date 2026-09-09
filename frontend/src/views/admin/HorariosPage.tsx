import { useMemo, useState } from 'react';
import ConfirmarEliminarHorarioModal from '@/components/horario/ConfirmarEliminarHorarioModal';
import HorarioModal from '@/components/horario/HorarioModal';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import DataTable from '@/components/ui/DataTable';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import SearchBar from '@/components/ui/SearchBar';
import type { Column } from '@/components/ui/DataTable';
import { useHorariosDeMedico } from '@/hooks/horario/useHorarios';
import { useMedicos } from '@/hooks/usuario/useUsuarios';
import { DIA_LABEL, formatearHora } from '@/lib/constants/dias';
import { cn, getIniciales, normalizar } from '@/lib/utils';
import type { HorarioMedico } from '@/types/horario.types';

/** '15:00'–'18:30' -> 3.5 h */
const duracionEnHoras = (inicio: string, fin: string): number => {
  const aMinutos = (hora: string) => {
    const [h, m] = hora.split(':').map(Number);
    return h * 60 + m;
  };
  return (aMinutos(fin) - aMinutos(inicio)) / 60;
};

/** HU-34 — el administrador configura los horarios de atención de cada médico. */
export function HorariosPage() {
  const [busqueda, setBusqueda] = useState('');
  const [medicoId, setMedicoId] = useState<number | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [horarioEnEdicion, setHorarioEnEdicion] = useState<HorarioMedico | null>(null);
  const [horarioAEliminar, setHorarioAEliminar] = useState<HorarioMedico | null>(null);

  const { data: medicos = [], isLoading: cargandoMedicos } = useMedicos();
  const { data: horarios = [], isLoading: cargandoHorarios } = useHorariosDeMedico(medicoId);

  const medicoSeleccionado = medicos.find((medico) => medico.id === medicoId) ?? null;

  const medicosFiltrados = useMemo(() => {
    const termino = normalizar(busqueda);
    if (!termino) return medicos;
    return medicos.filter(
      (medico) =>
        normalizar(medico.nombreCompleto).includes(termino) ||
        normalizar(medico.cargo).includes(termino),
    );
  }, [medicos, busqueda]);

  const horasSemanales = horarios.reduce(
    (total, horario) => total + duracionEnHoras(horario.hora_inicio, horario.hora_fin),
    0,
  );

  const abrirAlta = () => {
    setHorarioEnEdicion(null);
    setModalAbierto(true);
  };

  const abrirEdicion = (horario: HorarioMedico) => {
    setHorarioEnEdicion(horario);
    setModalAbierto(true);
  };

  const columnas: Array<Column<HorarioMedico>> = [
    {
      key: 'dia',
      header: 'Día',
      render: (horario) => (
        <span className="font-semibold text-ink">{DIA_LABEL[horario.dia_semana]}</span>
      ),
    },
    {
      key: 'rango',
      header: 'Horario de atención',
      render: (horario) => (
        <span className="text-muted">
          {formatearHora(horario.hora_inicio)} – {formatearHora(horario.hora_fin)}
        </span>
      ),
    },
    {
      key: 'duracion',
      header: 'Duración',
      className: 'w-28',
      render: (horario) => (
        <Badge variant="info">
          {duracionEnHoras(horario.hora_inicio, horario.hora_fin).toLocaleString('es-SV', {
            maximumFractionDigits: 1,
          })}{' '}
          h
        </Badge>
      ),
    },
    {
      key: 'acciones',
      header: 'Acciones',
      className: 'w-28 text-right',
      render: (horario) => (
        <div className="flex justify-end gap-1">
          <button
            type="button"
            onClick={() => abrirEdicion(horario)}
            title="Editar horario"
            className="flex size-8 cursor-pointer items-center justify-center rounded-field text-muted transition-colors hover:bg-brand-50 hover:text-brand-600"
          >
            <i className="ri-pencil-line text-base" />
          </button>
          <button
            type="button"
            onClick={() => setHorarioAEliminar(horario)}
            title="Eliminar horario"
            className="flex size-8 cursor-pointer items-center justify-center rounded-field text-muted transition-colors hover:bg-danger-soft hover:text-danger"
          >
            <i className="ri-delete-bin-line text-base" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Horarios de Atención</h1>
        <p className="mt-1 text-sm text-muted">
          Configura los bloques en que atiende cada médico. Un médico puede tener varios
          bloques el mismo día, siempre que no se traslapen.
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

        {/* --- Columna derecha: horarios del médico --- */}
        <section className="rounded-card border border-line bg-surface p-6 shadow-card">
          {!medicoSeleccionado ? (
            <EmptyState
              icon="ri-time-line"
              title="Selecciona un médico"
              message="Elige un médico de la lista para ver y configurar sus horarios de atención."
            />
          ) : (
            <>
              <header className="mb-5 flex flex-wrap items-center gap-4 border-b border-line pb-5">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-600 text-base font-bold text-white">
                  {getIniciales(medicoSeleccionado.nombreCompleto)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-bold text-ink">
                    {medicoSeleccionado.nombreCompleto}
                  </p>
                  <p className="truncate text-sm text-muted">{medicoSeleccionado.cargo}</p>
                </div>
                <Button icon="ri-add-line" onClick={abrirAlta}>
                  Agregar horario
                </Button>
              </header>

              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-ink">
                  Bloques de atención{' '}
                  <span className="font-normal text-muted">({horarios.length})</span>
                </p>
                {horarios.length > 0 && (
                  <p className="text-xs text-muted">
                    Total semanal:{' '}
                    <span className="font-semibold text-ink">
                      {horasSemanales.toLocaleString('es-SV', { maximumFractionDigits: 1 })} h
                    </span>
                  </p>
                )}
              </div>

              <DataTable
                columns={columnas}
                data={horarios}
                keyExtractor={(horario) => horario.id}
                isLoading={cargandoHorarios}
                emptyIcon="ri-calendar-close-line"
                emptyTitle="Sin horarios configurados"
                emptyMessage="Este médico todavía no tiene bloques de atención. Agrega el primero para que aparezca disponible al agendar citas."
              />
            </>
          )}
        </section>
      </div>

      {medicoSeleccionado && (
        <HorarioModal
          isOpen={modalAbierto}
          medicoId={medicoSeleccionado.id}
          horario={horarioEnEdicion}
          onClose={() => setModalAbierto(false)}
        />
      )}

      <ConfirmarEliminarHorarioModal
        horario={horarioAEliminar}
        onClose={() => setHorarioAEliminar(null)}
      />
    </div>
  );
}

export default HorariosPage;
