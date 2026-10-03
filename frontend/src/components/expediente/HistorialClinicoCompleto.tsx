import { useState } from 'react';
import HistorialDiagnosticos from '@/components/expediente/HistorialDiagnosticos';
import ResultadosLaboratorioHistorial from '@/components/expediente/ResultadosLaboratorioHistorial';
import SignosVitalesHistorial from '@/components/expediente/SignosVitalesHistorial';
import { cn } from '@/lib/utils';

type Pestana = 'consultas' | 'signos' | 'laboratorio';

const PESTANAS: { clave: Pestana; etiqueta: string; icono: string }[] = [
  { clave: 'consultas', etiqueta: 'Consultas y diagnósticos', icono: 'ri-stethoscope-line' },
  { clave: 'signos', etiqueta: 'Signos vitales', icono: 'ri-heart-pulse-line' },
  { clave: 'laboratorio', etiqueta: 'Laboratorio', icono: 'ri-flask-line' },
];

/**
 * HU-28 — historial clínico completo embebido en la consulta activa.
 * Reutiliza HistorialDiagnosticos (HU-22) y agrega signos vitales y laboratorio.
 */
export function HistorialClinicoCompleto({ pacienteId }: { pacienteId: string }) {
  const [abierto, setAbierto] = useState(true);
  const [pestana, setPestana] = useState<Pestana>('consultas');

  return (
    <section
      aria-labelledby="titulo-historial-completo"
      className="rounded-card border border-line bg-surface p-5 shadow-card"
    >
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        aria-expanded={abierto}
        aria-controls="panel-historial-completo"
        className="flex w-full cursor-pointer items-center justify-between gap-3 text-left"
      >
        <span id="titulo-historial-completo" className="inline-flex items-center gap-2 text-lg font-bold text-ink">
          <i className="ri-history-line text-brand-600" />
          Historial clínico del paciente
        </span>
        <i className={cn('text-xl text-muted', abierto ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line')} />
      </button>

      {abierto && (
        <div id="panel-historial-completo" className="mt-4">
          <div role="tablist" aria-label="Secciones del historial" className="mb-4 flex flex-wrap gap-2">
            {PESTANAS.map(({ clave, etiqueta, icono }) => (
              <button
                key={clave}
                type="button"
                role="tab"
                aria-selected={pestana === clave}
                onClick={() => setPestana(clave)}
                className={cn(
                  'inline-flex cursor-pointer items-center gap-2 rounded-field border px-3 py-2 text-xs font-semibold transition-colors',
                  pestana === clave
                    ? 'border-brand-600 bg-brand-50 text-brand-800'
                    : 'border-line bg-surface text-muted hover:bg-brand-50',
                )}
              >
                <i className={icono} />
                {etiqueta}
              </button>
            ))}
          </div>

          <div role="tabpanel">
            {pestana === 'consultas' && <HistorialDiagnosticos pacienteId={pacienteId} />}
            {pestana === 'signos' && <SignosVitalesHistorial pacienteId={pacienteId} />}
            {pestana === 'laboratorio' && <ResultadosLaboratorioHistorial pacienteId={pacienteId} />}
          </div>
        </div>
      )}
    </section>
  );
}

export default HistorialClinicoCompleto;
