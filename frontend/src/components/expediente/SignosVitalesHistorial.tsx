import { useMemo } from 'react';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useHistorialPaciente } from '@/hooks/historial/useHistorial';

const fechaLarga = (f?: string | null): string => {
  if (!f) return '—';
  const normalizado = f.includes('T') ? f : f.replace(' ', 'T');
  const d = new Date(normalizado);
  if (isNaN(d.getTime())) return f;
  return (
    d.toLocaleDateString('es-SV', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit', hour12: true })
  );
};

const calcularImc = (peso?: number | null, talla?: number | null, imcDirecto?: number | null): string => {
  if (imcDirecto != null) return Number(imcDirecto).toFixed(1);
  if (peso && talla && talla > 0) {
    const metros = talla > 3 ? talla / 100 : talla;
    return (peso / (metros * metros)).toFixed(1);
  }
  return '—';
};

const COLUMNAS = [
  'Fecha y hora',
  'Médico',
  'P/A (mmHg)',
  'Temp. (°C)',
  'FC (lpm)',
  'FR (rpm)',
  'SpO₂ (%)',
  'Peso (kg)',
  'Talla (cm)',
  'IMC',
];

/**
 * HU-28 — evolución de signos vitales registrados en citas y consultas previas.
 * Conectado en tiempo real con el historial clínico del paciente.
 */
export function SignosVitalesHistorial({ pacienteId }: { pacienteId: string }) {
  const { data: consultas = [], isLoading } = useHistorialPaciente(pacienteId);

  const registros = useMemo(() => {
    return consultas
      .filter(
        (c) =>
          c.signos_vitales &&
          (c.signos_vitales.presion_sistolica != null ||
            c.signos_vitales.frecuencia_cardiaca != null ||
            c.signos_vitales.temperatura_c != null ||
            c.signos_vitales.peso_kg != null ||
            c.signos_vitales.saturacion_oxigeno != null),
      )
      .map((c) => {
        const s = c.signos_vitales!;
        return {
          id: s.id ?? c.cita_id,
          fecha: s.fecha_registro ?? c.fecha_hora_inicio,
          medico: c.medicoNombre,
          sistolica: s.presion_sistolica,
          diastolica: s.presion_diastolica,
          temperatura: s.temperatura_c,
          frecuencia: s.frecuencia_cardiaca,
          respiratoria: s.frecuencia_respiratoria,
          saturacion: s.saturacion_oxigeno,
          peso: s.peso_kg,
          talla: s.talla_cm,
          imc: calcularImc(s.peso_kg, s.talla_cm, s.imc),
        };
      });
  }, [consultas]);

  if (isLoading) {
    return <LoadingSpinner label="Cargando signos vitales del paciente..." />;
  }

  if (registros.length === 0) {
    return (
      <div className="rounded-card border border-line bg-surface shadow-card">
        <EmptyState
          icon="ri-heart-pulse-line"
          title="Sin signos vitales previos"
          message="Este paciente aún no tiene signos vitales registrados en citas o consultas anteriores."
        />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-card border border-line bg-surface shadow-card">
      <table className="w-full min-w-[700px] text-left text-sm">
        <thead className="bg-canvas text-xs font-bold uppercase tracking-wide text-muted">
          <tr>
            {COLUMNAS.map((c) => (
              <th key={c} scope="col" className="px-4 py-3">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line text-ink">
          {registros.map((r) => (
            <tr key={r.id} className="hover:bg-brand-50/30 transition-colors">
              <td className="px-4 py-3 font-semibold whitespace-nowrap">{fechaLarga(r.fecha)}</td>
              <td className="px-4 py-3 text-xs text-muted font-medium">{r.medico}</td>
              <td className="px-4 py-3 font-mono font-medium">
                {r.sistolica != null && r.diastolica != null ? `${r.sistolica}/${r.diastolica}` : '—'}
              </td>
              <td className="px-4 py-3 font-mono">{r.temperatura != null ? Number(r.temperatura).toFixed(1) : '—'}</td>
              <td className="px-4 py-3 font-mono">{r.frecuencia != null ? r.frecuencia : '—'}</td>
              <td className="px-4 py-3 font-mono">{r.respiratoria != null ? r.respiratoria : '—'}</td>
              <td className="px-4 py-3 font-mono">{r.saturacion != null ? `${r.saturacion}%` : '—'}</td>
              <td className="px-4 py-3 font-mono">{r.peso != null ? Number(r.peso).toFixed(1) : '—'}</td>
              <td className="px-4 py-3 font-mono">{r.talla != null ? r.talla : '—'}</td>
              <td className="px-4 py-3 font-semibold text-brand-700">{r.imc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default SignosVitalesHistorial;
