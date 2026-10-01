
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '@/components/ui/Button';
import { useConsultas } from '@/hooks/medico/useConsultas';
import type { PacienteConsulta } from '@/types/consulta';

type Filtro = 'espera' | 'consulta' | 'atendido';

const filtros: { valor: Filtro; texto: string }[] = [
  { valor: 'espera', texto: 'Sala de espera' },
  { valor: 'consulta', texto: 'En consulta' },
  { valor: 'atendido', texto: 'Atendidos' },
];

export default function SalaEsperaPage() {
  const { pacientes, iniciar, reiniciar, cargando } = useConsultas();

  const [filtro, setFiltro] = useState<Filtro>('espera');
  const [aviso, setAviso] = useState('');
  const [iniciando, setIniciando] = useState<string | null>(null);

  const navigate = useNavigate();

  const enConsulta = pacientes.some(
    (paciente) => paciente.estado === 'consulta'
  );

  const filtrados = pacientes.filter(
    (paciente) => paciente.estado === filtro
  );

  const cantidad = (estado: Filtro) =>
    pacientes.filter((paciente) => paciente.estado === estado).length;

  const atender = async (paciente: PacienteConsulta) => {
    if (enConsulta || iniciando) {
      setAviso('Finalice la consulta actual antes de iniciar otra.');
      return;
    }

    setIniciando(paciente.id);
    setAviso('');

    try {
      const resultado = await iniciar(paciente.id);

      if (resultado) {
        navigate(`/medico/consulta/${paciente.id}`);
      } else {
        setAviso(
          'No se pudo iniciar la consulta. Verifique si existe otra consulta activa.'
        );
      }
    } catch {
      setAviso('Ocurrió un error al iniciar la consulta.');
    } finally {
      setIniciando(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">

      {/* Encabezado */}

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-brand-600">
            Consulta del día
          </p>

          <h1 className="mt-1 text-2xl font-bold text-ink">
            Lista de espera
          </h1>

          <p className="mt-1 text-sm text-muted">
            Pacientes pendientes, en consulta y atendidos.
          </p>
        </div>

        {/* Temporal: eliminar al conectar el backend */}

        <Button
          variant="secondary"
          onClick={() => {
            reiniciar();
            setFiltro('espera');
            setAviso('');
          }}
        >
          Restablecer datos de prueba
        </Button>
      </header>

      {/* Resumen */}

      <div className="grid gap-3 sm:grid-cols-3">
        {filtros.map((item) => (
          <div
            key={item.valor}
            className="rounded-card border border-line bg-surface p-4 shadow-card"
          >
            <p className="text-xs font-bold uppercase tracking-wide text-muted">
              {item.texto}
            </p>

            <p className="mt-2 text-3xl font-bold text-ink">
              {cantidad(item.valor)}
            </p>
          </div>
        ))}
      </div>

      {/* Filtros */}

      <div
        className="flex flex-wrap gap-2 border-b border-line"
        role="tablist"
        aria-label="Estado de atención"
      >
        {filtros.map((item) => (
          <button
            key={item.valor}
            type="button"
            role="tab"
            aria-selected={filtro === item.valor}
            className={`border-b-2 px-4 py-3 text-sm font-semibold ${
              filtro === item.valor
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-muted hover:text-ink'
            }`}
            onClick={() => {
              setFiltro(item.valor);
              setAviso('');
            }}
          >
            {item.texto} ({cantidad(item.valor)})
          </button>
        ))}
      </div>

      {/* Mensajes */}

      {aviso && (
        <p
          role="alert"
          className="rounded-field bg-amber-50 p-3 text-sm text-amber-900"
        >
          {aviso}
        </p>
      )}

      {/* Pacientes */}

      {cargando ? (
        <div className="rounded-card border border-line bg-surface p-10 text-center text-sm text-muted">
          Cargando pacientes...
        </div>
      ) : filtrados.length === 0 ? (
        <div className="rounded-card border border-line bg-surface p-10 text-center text-sm text-muted">
          No hay pacientes en esta sección.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-card border border-line bg-surface shadow-card">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-canvas text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="p-4">Paciente</th>
                <th className="p-4">Signos vitales</th>
                <th className="p-4">Tipo</th>
                <th className="p-4">Estado</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-line">
              {filtrados.map((paciente) => (
                <tr key={paciente.id}>

                  <td className="p-4">
                    <p className="font-semibold text-ink">
                      {paciente.nombre}
                    </p>

                    <p className="mt-1 text-xs text-muted">
                      {paciente.edad} años · {paciente.expediente}
                    </p>

                    <p className="mt-1 text-xs text-muted">
                      {paciente.motivo} · Llegó {paciente.horaLlegada}
                    </p>
                  </td>

                  <td className="p-4 text-muted">
                    PA: {paciente.signos.sistolica || '—'}/
                    {paciente.signos.diastolica || '—'}
                    <br />
                    T°: {paciente.signos.temperatura || '—'} °C
                    {' · '}
                    FC: {paciente.signos.frecuencia || '—'}
                    <br />
                    SpO₂: {paciente.signos.saturacion || '—'}%
                  </td>

                  <td className="p-4">
                    <span className="rounded-full bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700">
                      {paciente.tipo}
                    </span>
                  </td>

                  <td className="p-4 text-muted">
                    {paciente.estado === 'espera'
                      ? 'En espera'
                      : paciente.estado === 'consulta'
                        ? 'En consulta'
                        : 'Atendido'}
                  </td>

                  <td className="p-4 text-right">
                    {paciente.estado === 'espera' ? (
                      <Button
                        size="sm"
                        disabled={enConsulta || iniciando !== null}
                        onClick={() => atender(paciente)}
                      >
                        {iniciando === paciente.id
                          ? 'Iniciando...'
                          : 'Atender'}
                      </Button>
                    ) : (
                      <Link
                        className="font-semibold text-brand-700 underline"
                        to={`/medico/consulta/${paciente.id}`}
                      >
                        {paciente.estado === 'consulta'
                          ? 'Continuar'
                          : 'Ver'}
                      </Link>
                    )}
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}