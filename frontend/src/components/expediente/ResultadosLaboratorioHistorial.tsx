import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';

type Estado = 'normal' | 'alterado';

interface ResultadoLab {
  examen: string;
  fecha: string;
  valor: string;
  referencia: string;
  estado: Estado;
}

// Vista HU-28: datos de muestra por paciente hasta conectar la API.
const MUESTRA: Record<string, ResultadoLab[]> = {
  '0f8fad5b-d9cb-469f-a165-708677289501': [
    { examen: 'Glucosa en ayunas', fecha: '2026-08-12', valor: '104 mg/dL', referencia: '70 – 99 mg/dL', estado: 'alterado' },
    { examen: 'Colesterol total', fecha: '2026-08-12', valor: '188 mg/dL', referencia: '< 200 mg/dL', estado: 'normal' },
    { examen: 'Triglicéridos', fecha: '2026-08-12', valor: '176 mg/dL', referencia: '< 150 mg/dL', estado: 'alterado' },
    { examen: 'Hemoglobina', fecha: '2026-05-30', valor: '14.8 g/dL', referencia: '13.5 – 17.5 g/dL', estado: 'normal' },
  ],
  '1f8fad5b-d9cb-469f-a165-708677289502': [
    { examen: 'Hemoglobina', fecha: '2026-07-19', valor: '11.9 g/dL', referencia: '12.0 – 15.5 g/dL', estado: 'alterado' },
    { examen: 'TSH', fecha: '2026-07-19', valor: '2.4 mUI/L', referencia: '0.4 – 4.0 mUI/L', estado: 'normal' },
  ],
};

const fechaLarga = (f: string) =>
  new Date(`${f}T00:00:00`).toLocaleDateString('es-SV', { day: '2-digit', month: 'short', year: 'numeric' });

/** HU-28 — resultados de laboratorio del paciente, visibles durante la consulta. */
export function ResultadosLaboratorioHistorial({ pacienteId }: { pacienteId: string }) {
  const resultados = MUESTRA[pacienteId] ?? [];

  if (resultados.length === 0) {
    return (
      <div className="rounded-card border border-line bg-surface shadow-card">
        <EmptyState
          icon="ri-flask-line"
          title="Sin resultados de laboratorio"
          message="Este paciente aún no tiene resultados de laboratorio registrados."
        />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-card border border-line bg-surface shadow-card">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="bg-canvas text-xs font-bold uppercase tracking-wide text-muted">
          <tr>
            {['Examen', 'Fecha', 'Resultado', 'Referencia', 'Estado'].map((c) => (
              <th key={c} scope="col" className="px-4 py-3">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line text-ink">
          {resultados.map((r) => (
            <tr key={`${r.examen}-${r.fecha}`}>
              <td className="px-4 py-3 font-semibold">{r.examen}</td>
              <td className="px-4 py-3">{fechaLarga(r.fecha)}</td>
              <td className="px-4 py-3">{r.valor}</td>
              <td className="px-4 py-3 text-muted">{r.referencia}</td>
              <td className="px-4 py-3">
                <Badge variant={r.estado === 'normal' ? 'success' : 'warning'} dot>
                  {r.estado === 'normal' ? 'Normal' : 'Alterado'}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ResultadosLaboratorioHistorial;
