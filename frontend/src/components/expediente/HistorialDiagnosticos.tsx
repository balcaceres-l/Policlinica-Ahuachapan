import { useState } from 'react';
import ConsultaHistorialCard from '@/components/expediente/ConsultaHistorialCard';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useHistorialPaciente } from '@/hooks/historial/useHistorial';
import { extraerMensajeError } from '@/lib/apiError';

interface HistorialDiagnosticosProps {
  pacienteId: string;
}

type Orden = 'reciente' | 'antiguo';

/**
 * HU-22 — historial cronológico de diagnósticos y planes de manejo de un
 * paciente. Solo necesita el `pacienteId`, así que también se puede embeber
 * dentro de la consulta activa (HU-28).
 */
export function HistorialDiagnosticos({ pacienteId }: HistorialDiagnosticosProps) {
  const [orden, setOrden] = useState<Orden>('reciente');
  const { data: consultas = [], isLoading, isError, error } = useHistorialPaciente(pacienteId);

  // El servicio entrega lo más reciente primero; aquí solo se invierte si hace falta.
  const visibles = orden === 'reciente' ? consultas : [...consultas].reverse();

  return (
    <section aria-labelledby="titulo-historial">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="titulo-historial" className="text-lg font-bold text-ink">
            Historial de diagnósticos y tratamientos
          </h2>
          {consultas.length > 0 && (
            <p className="mt-0.5 text-xs text-muted">
              {consultas.length} {consultas.length === 1 ? 'consulta registrada' : 'consultas registradas'}
            </p>
          )}
        </div>

        {consultas.length > 1 && (
          <button
            type="button"
            onClick={() => setOrden((o) => (o === 'reciente' ? 'antiguo' : 'reciente'))}
            className="inline-flex cursor-pointer items-center gap-2 rounded-field border border-line bg-surface px-3 py-2 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-50"
          >
            <i className={orden === 'reciente' ? 'ri-sort-desc' : 'ri-sort-asc'} />
            {orden === 'reciente' ? 'Más reciente primero' : 'Más antigua primero'}
          </button>
        )}
      </div>

      {isLoading && <LoadingSpinner label="Cargando historial clínico..." />}

      {isError && (
        <div role="alert" className="rounded-field border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {extraerMensajeError(error, 'No se pudo cargar el historial clínico.')}
        </div>
      )}

      {!isLoading && !isError && consultas.length === 0 && (
        <div className="rounded-card border border-line bg-surface shadow-card">
          <EmptyState
            icon="ri-file-list-3-line"
            title="Sin consultas previas"
            message="Este paciente aún no tiene diagnósticos ni planes de manejo registrados."
          />
        </div>
      )}

      {visibles.length > 0 && (
        <ol className="space-y-4 border-l-2 border-brand-100 pl-5">
          {visibles.map((consulta) => (
            <li key={consulta.id} className="relative">
              <span className="absolute -left-[27px] top-6 size-3 rounded-full border-2 border-surface bg-brand-600" />
              <ConsultaHistorialCard consulta={consulta} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export default HistorialDiagnosticos;
