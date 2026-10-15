import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import RegistrarResultadoLaboratorioModal from '@/components/expediente/RegistrarResultadoLaboratorioModal';
import VisorAdjuntoLaboratorio from '@/components/expediente/VisorAdjuntoLaboratorio';
import Button from '@/components/ui/Button';
import DataTable, { type Column } from '@/components/ui/DataTable';
import SearchBar from '@/components/ui/SearchBar';
import { useResultadosRecientes } from '@/hooks/laboratorio/useLaboratorio';
import { extraerMensajeError } from '@/lib/apiError';
import { formatearFecha, normalizar } from '@/lib/utils';
import type { ResultadoLaboratorio } from '@/types/laboratorio.types';

/** HU-41 / HU-23 — resultados de laboratorio recientes de todos los pacientes. */
export function LaboratorioClinicoPage() {
  const [busqueda, setBusqueda] = useState('');
  const [registrando, setRegistrando] = useState(false);
  const [conAdjuntoAbierto, setConAdjuntoAbierto] = useState<ResultadoLaboratorio | null>(null);

  const { data: resultados = [], isLoading, isError, error } = useResultadosRecientes();

  const filtrados = useMemo(() => {
    const termino = normalizar(busqueda);
    if (!termino) return resultados;

    return resultados.filter((r) =>
      [r.nombre_examen, r.pacienteNombre, r.pacienteExpediente].some(
        (campo) => campo && normalizar(campo).includes(termino),
      ),
    );
  }, [resultados, busqueda]);

  const columnas: Array<Column<ResultadoLaboratorio>> = [
    {
      key: 'fecha',
      header: 'Fecha',
      className: 'whitespace-nowrap',
      render: (r) => formatearFecha(`${r.fecha_examen}T00:00:00`),
    },
    {
      key: 'paciente',
      header: 'Paciente',
      render: (r) => (
        <Link to={`/medico/expediente/${r.paciente_id}`} className="font-semibold text-brand-700 hover:underline">
          {r.pacienteNombre ?? 'Paciente'}
          <span className="block text-xs font-normal text-muted">{r.pacienteExpediente}</span>
        </Link>
      ),
    },
    {
      key: 'examen',
      header: 'Examen',
      render: (r) => (
        <>
          <span className="font-semibold text-ink">{r.nombre_examen}</span>
          {r.resultado_texto && (
            <span className="block max-w-md truncate text-xs text-muted">{r.resultado_texto}</span>
          )}
        </>
      ),
    },
    {
      key: 'registrado',
      header: 'Registrado por',
      render: (r) => <span className="text-muted">{r.registradoPorNombre ?? '—'}</span>,
    },
    {
      key: 'adjunto',
      header: 'Adjunto',
      className: 'text-right',
      render: (r) =>
        r.archivo ? (
          <button
            type="button"
            onClick={() => setConAdjuntoAbierto(r)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-field border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-50"
          >
            <i className={r.archivo.mime === 'application/pdf' ? 'ri-file-pdf-2-line' : 'ri-image-line'} />
            Ver
          </button>
        ) : (
          <span className="text-xs text-muted">Sin adjunto</span>
        ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Laboratorio Clínico</h1>
          <p className="mt-1 text-sm text-muted">
            Resultados de laboratorio registrados en los expedientes de los pacientes.
          </p>
        </div>
        <Button icon="ri-flask-line" onClick={() => setRegistrando(true)}>
          Registrar resultado
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-card border border-line bg-surface p-4 shadow-card">
        <SearchBar
          value={busqueda}
          onChange={setBusqueda}
          placeholder="Buscar por examen, paciente o número de expediente..."
          className="min-w-[260px] flex-1"
        />
      </div>

      {isError ? (
        <div role="alert" className="rounded-field bg-danger-soft px-3 py-2.5 text-sm text-danger">
          {extraerMensajeError(error, 'No se pudieron cargar los resultados de laboratorio.')}
        </div>
      ) : (
        <DataTable
          columns={columnas}
          data={filtrados}
          keyExtractor={(r) => r.id}
          isLoading={isLoading}
          emptyIcon="ri-flask-line"
          emptyTitle={busqueda ? 'Sin coincidencias' : 'Sin resultados de laboratorio'}
          emptyMessage={
            busqueda
              ? 'Ningún resultado coincide con la búsqueda.'
              : 'Los resultados que registres aparecerán aquí y en el expediente de cada paciente.'
          }
        />
      )}

      <VisorAdjuntoLaboratorio resultado={conAdjuntoAbierto} onClose={() => setConAdjuntoAbierto(null)} />

      {registrando && <RegistrarResultadoLaboratorioModal onClose={() => setRegistrando(false)} />}
    </div>
  );
}

export default LaboratorioClinicoPage;
