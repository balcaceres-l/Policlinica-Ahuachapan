import { useState } from 'react';
import VisorAdjuntoLaboratorio, { type AdjuntoLaboratorio } from '@/components/expediente/VisorAdjuntoLaboratorio';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';

interface ParametroLab {
  examen: string;
  valor: string;
  referencia: string;
  alterado: boolean;
}

interface OrdenLaboratorio {
  id: string;
  /** YYYY-MM-DD */
  fecha: string;
  panel: string;
  solicitadoPor: string;
  parametros: ParametroLab[];
  adjunto?: AdjuntoLaboratorio;
}

// Vista HU-23: datos de muestra por paciente hasta conectar la API.
const MUESTRA: Record<string, OrdenLaboratorio[]> = {
  '0f8fad5b-d9cb-469f-a165-708677289501': [
    {
      id: 'lab-c1',
      fecha: '2026-08-12',
      panel: 'Perfil metabólico',
      solicitadoPor: 'Dra. Elena Ramírez Alfaro',
      adjunto: { nombre: 'perfil-metabolico-2026-08-12.pdf', tipo: 'pdf', tamanoKb: 214 },
      parametros: [
        { examen: 'Glucosa en ayunas', valor: '104 mg/dL', referencia: '70 – 99 mg/dL', alterado: true },
        { examen: 'Colesterol total', valor: '188 mg/dL', referencia: '< 200 mg/dL', alterado: false },
        { examen: 'Triglicéridos', valor: '176 mg/dL', referencia: '< 150 mg/dL', alterado: true },
      ],
    },
    {
      id: 'lab-c2',
      fecha: '2026-05-30',
      panel: 'Hemograma',
      solicitadoPor: 'Dra. Elena Ramírez Alfaro',
      parametros: [
        { examen: 'Hemoglobina', valor: '14.8 g/dL', referencia: '13.5 – 17.5 g/dL', alterado: false },
        { examen: 'Leucocitos', valor: '7.2 x10³/µL', referencia: '4.5 – 11.0 x10³/µL', alterado: false },
      ],
    },
    {
      id: 'lab-c3',
      fecha: '2026-02-10',
      panel: 'Radiografía de tórax (informe)',
      solicitadoPor: 'Dr. Miguel Ángel Torres',
      adjunto: { nombre: 'rx-torax-2026-02-10.jpg', tipo: 'imagen', tamanoKb: 1380 },
      parametros: [{ examen: 'Informe radiológico', valor: 'Sin hallazgos agudos', referencia: '—', alterado: false }],
    },
  ],
  '1f8fad5b-d9cb-469f-a165-708677289502': [
    {
      id: 'lab-m1',
      fecha: '2026-07-19',
      panel: 'Hemograma y tiroides',
      solicitadoPor: 'Dra. Carla Mejía',
      adjunto: { nombre: 'hemograma-tsh-2026-07-19.pdf', tipo: 'pdf', tamanoKb: 188 },
      parametros: [
        { examen: 'Hemoglobina', valor: '11.9 g/dL', referencia: '12.0 – 15.5 g/dL', alterado: true },
        { examen: 'TSH', valor: '2.4 mUI/L', referencia: '0.4 – 4.0 mUI/L', alterado: false },
      ],
    },
  ],
};

const fechaLarga = (f: string) =>
  new Date(`${f}T00:00:00`).toLocaleDateString('es-SV', { day: '2-digit', month: 'long', year: 'numeric' });

type Orden = 'reciente' | 'antiguo';

/**
 * HU-23 — resultados de laboratorio del paciente en orden cronológico, con
 * visor de adjuntos. Solo necesita el `pacienteId`.
 */
export function LaboratorioCronologico({ pacienteId }: { pacienteId: string }) {
  const [orden, setOrden] = useState<Orden>('reciente');
  const [adjuntoAbierto, setAdjuntoAbierto] = useState<{ adjunto: AdjuntoLaboratorio; titulo: string } | null>(null);

  const ordenes = [...(MUESTRA[pacienteId] ?? [])].sort((a, b) =>
    orden === 'reciente' ? b.fecha.localeCompare(a.fecha) : a.fecha.localeCompare(b.fecha),
  );

  return (
    <section aria-labelledby="titulo-laboratorio">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="titulo-laboratorio" className="text-lg font-bold text-ink">
            Resultados de laboratorio
          </h2>
          {ordenes.length > 0 && (
            <p className="mt-0.5 text-xs text-muted">
              {ordenes.length} {ordenes.length === 1 ? 'orden registrada' : 'órdenes registradas'}
            </p>
          )}
        </div>

        {ordenes.length > 1 && (
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

      {ordenes.length === 0 ? (
        <div className="rounded-card border border-line bg-surface shadow-card">
          <EmptyState
            icon="ri-flask-line"
            title="Sin resultados de laboratorio"
            message="Este paciente aún no tiene resultados de laboratorio registrados."
          />
        </div>
      ) : (
        <ol className="space-y-4 border-l-2 border-brand-100 pl-5">
          {ordenes.map((o) => (
            <li key={o.id} className="relative">
              <span className="absolute -left-[27px] top-6 size-3 rounded-full border-2 border-surface bg-brand-600" />
              <article className="rounded-card border border-line bg-surface p-5 shadow-card">
                <header className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <time dateTime={o.fecha} className="text-base font-bold text-ink">
                      {fechaLarga(o.fecha)}
                    </time>
                    <p className="mt-0.5 text-xs text-muted">
                      {o.panel} · {o.solicitadoPor}
                    </p>
                  </div>

                  {o.adjunto && (
                    <button
                      type="button"
                      onClick={() => setAdjuntoAbierto({ adjunto: o.adjunto!, titulo: `${o.panel} · ${fechaLarga(o.fecha)}` })}
                      className="inline-flex cursor-pointer items-center gap-2 rounded-field border border-line bg-surface px-3 py-2 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-50"
                    >
                      <i className={o.adjunto.tipo === 'pdf' ? 'ri-file-pdf-2-line' : 'ri-image-line'} />
                      Ver adjunto
                    </button>
                  )}
                </header>

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[480px] text-left text-sm">
                    <thead className="text-xs font-bold uppercase tracking-wide text-muted">
                      <tr>
                        {['Examen', 'Resultado', 'Referencia', 'Estado'].map((c) => (
                          <th key={c} scope="col" className="py-2 pr-4">{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line text-ink">
                      {o.parametros.map((p) => (
                        <tr key={p.examen}>
                          <td className="py-2 pr-4 font-semibold">{p.examen}</td>
                          <td className="py-2 pr-4">{p.valor}</td>
                          <td className="py-2 pr-4 text-muted">{p.referencia}</td>
                          <td className="py-2">
                            <Badge variant={p.alterado ? 'warning' : 'success'} dot>
                              {p.alterado ? 'Alterado' : 'Normal'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            </li>
          ))}
        </ol>
      )}

      <VisorAdjuntoLaboratorio
        adjunto={adjuntoAbierto?.adjunto ?? null}
        titulo={adjuntoAbierto?.titulo ?? ''}
        onClose={() => setAdjuntoAbierto(null)}
      />
    </section>
  );
}

export default LaboratorioCronologico;
