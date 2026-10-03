import EmptyState from '@/components/ui/EmptyState';

interface RegistroSignos {
  fecha: string;
  sistolica: number;
  diastolica: number;
  temperatura: number;
  frecuencia: number;
  saturacion: number;
  peso: number;
  talla: number;
}

// Vista HU-28: datos de muestra por paciente hasta conectar la API.
const MUESTRA: Record<string, RegistroSignos[]> = {
  '0f8fad5b-d9cb-469f-a165-708677289501': [
    { fecha: '2026-08-14', sistolica: 128, diastolica: 82, temperatura: 36.7, frecuencia: 78, saturacion: 97, peso: 82.4, talla: 174 },
    { fecha: '2026-06-02', sistolica: 134, diastolica: 86, temperatura: 36.5, frecuencia: 80, saturacion: 98, peso: 83.1, talla: 174 },
    { fecha: '2026-03-19', sistolica: 138, diastolica: 90, temperatura: 36.6, frecuencia: 84, saturacion: 97, peso: 84.0, talla: 174 },
  ],
  '1f8fad5b-d9cb-469f-a165-708677289502': [
    { fecha: '2026-07-21', sistolica: 112, diastolica: 72, temperatura: 36.4, frecuencia: 70, saturacion: 99, peso: 61.2, talla: 163 },
    { fecha: '2026-04-08', sistolica: 110, diastolica: 70, temperatura: 36.6, frecuencia: 72, saturacion: 99, peso: 60.5, talla: 163 },
  ],
};

const imc = (peso: number, talla: number) => (peso / (talla / 100) ** 2).toFixed(1);
const fechaLarga = (f: string) =>
  new Date(`${f}T00:00:00`).toLocaleDateString('es-SV', { day: '2-digit', month: 'short', year: 'numeric' });

const COLUMNAS = ['Fecha', 'Presión (mmHg)', 'Temp. (°C)', 'FC (lpm)', 'SpO₂ (%)', 'Peso (kg)', 'IMC'];

/** HU-28 — evolución de signos vitales registrados en consultas previas. */
export function SignosVitalesHistorial({ pacienteId }: { pacienteId: string }) {
  const registros = MUESTRA[pacienteId] ?? [];

  if (registros.length === 0) {
    return (
      <div className="rounded-card border border-line bg-surface shadow-card">
        <EmptyState
          icon="ri-heart-pulse-line"
          title="Sin signos vitales previos"
          message="Este paciente aún no tiene signos vitales registrados en consultas anteriores."
        />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-card border border-line bg-surface shadow-card">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-canvas text-xs font-bold uppercase tracking-wide text-muted">
          <tr>
            {COLUMNAS.map((c) => (
              <th key={c} scope="col" className="px-4 py-3">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line text-ink">
          {registros.map((r) => (
            <tr key={r.fecha}>
              <td className="px-4 py-3 font-semibold">{fechaLarga(r.fecha)}</td>
              <td className="px-4 py-3">{r.sistolica}/{r.diastolica}</td>
              <td className="px-4 py-3">{r.temperatura.toFixed(1)}</td>
              <td className="px-4 py-3">{r.frecuencia}</td>
              <td className="px-4 py-3">{r.saturacion}</td>
              <td className="px-4 py-3">{r.peso.toFixed(1)}</td>
              <td className="px-4 py-3">{imc(r.peso, r.talla)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default SignosVitalesHistorial;
