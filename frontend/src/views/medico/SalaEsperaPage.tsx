import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import {
  useEspecialidadesDisponibles,
  useIniciarConsulta,
  useSalaEspera,
} from '@/hooks/medico/useConsultas';
import type { Cita } from '@/types/cita.types';

type Filtro = 'espera' | 'consulta' | 'atendido';

const filtros: { valor: Filtro; texto: string }[] = [
  { valor: 'espera', texto: 'Sala de espera' },
  { valor: 'consulta', texto: 'En consulta' },
  { valor: 'atendido', texto: 'Atendidos' },
];

export default function SalaEsperaPage() {
  const navigate = useNavigate();
  const { data: citas = [], isLoading: cargando, refetch } = useSalaEspera();
  const { data: especialidades = [] } = useEspecialidadesDisponibles();
  const iniciarMutation = useIniciarConsulta();

  const [filtro, setFiltro] = useState<Filtro>('espera');
  const [aviso, setAviso] = useState('');
  const [iniciandoId, setIniciandoId] = useState<string | null>(null);

  // Modal para seleccionar especialidad si el médico tiene más de una
  const [citaParaAtender, setCitaParaAtender] = useState<Cita | null>(null);
  const [especialidadElegida, setEspecialidadElegida] = useState<string>('');

  const citaEnAtencion = citas.find((c) => c.estado === 'EN_ATENCION');
  const enConsulta = Boolean(citaEnAtencion);

  const filtradas = citas.filter((c) => {
    if (filtro === 'espera') return c.estado === 'EN_ESPERA' || c.estado === 'AGENDADA' || c.estado === 'EN_ATENCION';
    if (filtro === 'consulta') return c.estado === 'EN_ATENCION';
    if (filtro === 'atendido') return c.estado === 'ATENDIDA';
    return false;
  }).sort((a, b) => {
    // Si hay una consulta activa, colocarla de primera
    if (a.estado === 'EN_ATENCION') return -1;
    if (b.estado === 'EN_ATENCION') return 1;
    return 0;
  });

  const cantidad = (estado: Filtro) => {
    return citas.filter((c) => {
      if (estado === 'espera') return c.estado === 'EN_ESPERA' || c.estado === 'AGENDADA';
      if (estado === 'consulta') return c.estado === 'EN_ATENCION';
      if (estado === 'atendido') return c.estado === 'ATENDIDA';
      return false;
    }).length;
  };

  const handleIniciarAtencion = async (cita: Cita, espId?: string) => {
    if (enConsulta) {
      setAviso(`Ya tienes una consulta activa en curso con ${citaEnAtencion?.pacienteNombre}. Debes retomarla y finalizarla antes de atender a otro paciente.`);
      return;
    }

    // Si tiene más de una especialidad y no ha elegido aún, abrir modal
    if (!espId && especialidades.length > 1) {
      setCitaParaAtender(cita);
      setEspecialidadElegida(cita.especialidad_id ?? especialidades[0].id);
      return;
    }

    setIniciandoId(cita.id);
    setAviso('');

    try {
      const consultaIniciada = await iniciarMutation.mutateAsync({
        citaId: cita.id,
        especialidadId: espId ?? (especialidades.length === 1 ? especialidades[0].id : cita.especialidad_id),
      });

      toast.success(`Consulta iniciada para ${cita.pacienteNombre}`);
      navigate(`/medico/consulta/${consultaIniciada.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al iniciar la consulta.';
      setAviso(msg);
      toast.error(msg);
    } finally {
      setIniciandoId(null);
      setCitaParaAtender(null);
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
            Pacientes asignados para atención médica el día de hoy.
          </p>
        </div>

        <Button
          variant="secondary"
          onClick={() => refetch()}
          icon="ri-refresh-line"
        >
          Actualizar lista
        </Button>
      </header>

      {/* Banner destacado si hay una consulta activa / pausada para retomar */}
      {citaEnAtencion && (
        <div className="rounded-card border-2 border-brand-500 bg-brand-50/80 p-5 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-full bg-brand-600 text-white text-xl shadow-sm">
                <i className="ri-stethoscope-fill" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800">
                    <span className="size-2 rounded-full bg-blue-600 animate-pulse" />
                    Consulta en curso
                  </span>
                  <span className="text-xs text-muted">
                    Horario de cita: {citaEnAtencion.hora_inicio} - {citaEnAtencion.hora_fin}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-ink mt-0.5">
                  {citaEnAtencion.pacienteNombre}
                </h2>
                <p className="text-xs text-muted">
                  Expediente: <span className="font-mono font-semibold text-ink">{citaEnAtencion.pacienteExpediente}</span>
                  {citaEnAtencion.especialidadNombre && (
                    <span> · Especialidad: <span className="font-medium text-ink">{citaEnAtencion.especialidadNombre}</span></span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {citaEnAtencion.consulta_id ? (
                <Link
                  to={`/medico/consulta/${citaEnAtencion.consulta_id}`}
                  className="inline-flex items-center gap-2 rounded-field bg-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-brand-700 transition-colors"
                >
                  <i className="ri-play-circle-fill text-lg" />
                  Retomar Consulta
                </Link>
              ) : (
                <span className="text-xs text-muted italic">Iniciando consulta...</span>
              )}
            </div>
          </div>
        </div>
      )}

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
            className={`border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
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

      {/* Mensajes de aviso */}
      {aviso && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-field bg-amber-50 p-3 text-sm text-amber-900 border border-amber-200"
        >
          <i className="ri-alert-line text-lg text-amber-700 shrink-0" />
          <span>{aviso}</span>
        </div>
      )}

      {/* Lista de Pacientes */}
      {cargando ? (
        <div className="rounded-card border border-line bg-surface p-10 text-center text-sm text-muted">
          <i className="ri-loader-4-line mr-2 animate-spin align-middle" />
          Consultando citas del día...
        </div>
      ) : filtradas.length === 0 ? (
        <div className="rounded-card border border-line bg-surface p-10 text-center text-sm text-muted">
          No hay pacientes en esta sección.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-card border border-line bg-surface shadow-card">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-canvas text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="p-4">Paciente</th>
                <th className="p-4">Signos vitales (Triaje)</th>
                <th className="p-4">Tipo</th>
                <th className="p-4">Estado</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-line">
              {filtradas.map((cita) => {
                const signos = cita.signos_vitales;
                const enEspera = cita.estado === 'EN_ESPERA';
                const agendada = cita.estado === 'AGENDADA';
                const esConsultaActiva = cita.estado === 'EN_ATENCION';
                const atendida = cita.estado === 'ATENDIDA';

                return (
                  <tr key={cita.id} className="hover:bg-canvas/50 transition-colors">
                    <td className="p-4">
                      <p className="font-semibold text-ink">
                        {cita.pacienteNombre}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        Expediente: <span className="font-mono text-ink">{cita.pacienteExpediente}</span>
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        Horario: {cita.hora_inicio} - {cita.hora_fin}
                        {cita.hora_llegada && (
                          <span className="ml-2 font-medium text-brand-700">
                            • Llegó: {cita.hora_llegada.slice(11, 16)}
                          </span>
                        )}
                      </p>
                    </td>

                    <td className="p-4 text-xs text-muted">
                      {signos ? (
                        <div className="space-y-0.5">
                          <div>
                            <span className="font-semibold text-ink">PA:</span>{' '}
                            {signos.presion_sistolica && signos.presion_diastolica
                              ? `${signos.presion_sistolica}/${signos.presion_diastolica} mmHg`
                              : '—'}{' '}
                            • <span className="font-semibold text-ink">T°:</span>{' '}
                            {signos.temperatura_c ? `${signos.temperatura_c} °C` : '—'}
                          </div>
                          <div>
                            <span className="font-semibold text-ink">FC:</span>{' '}
                            {signos.frecuencia_cardiaca ? `${signos.frecuencia_cardiaca} lpm` : '—'} •{' '}
                            <span className="font-semibold text-ink">SpO₂:</span>{' '}
                            {signos.saturacion_oxigeno ? `${signos.saturacion_oxigeno}%` : '—'}
                          </div>
                          {signos.imc && (
                            <div className="text-brand-700 font-semibold">
                              IMC: {signos.imc}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="italic text-muted/70">Sin triaje registrado</span>
                      )}
                    </td>

                    <td className="p-4">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${
                          cita.tipo_cita === 'EMERGENCIA'
                            ? 'bg-danger-soft text-danger'
                            : cita.tipo_cita === 'SOBRECUPO'
                              ? 'bg-warning-soft text-warning'
                              : 'bg-brand-50 text-brand-700'
                        }`}
                      >
                        {cita.tipo_cita}
                      </span>
                    </td>

                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          atendida
                            ? 'bg-emerald-50 text-emerald-800'
                            : esConsultaActiva
                              ? 'bg-blue-50 text-blue-800 animate-pulse'
                              : enEspera
                                ? 'bg-amber-50 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        <span className="size-1.5 rounded-full bg-current" />
                        {atendida
                          ? 'Atendido'
                          : esConsultaActiva
                            ? 'En consulta'
                            : enEspera
                              ? 'En espera'
                              : 'Agendada'}
                      </span>
                    </td>

                    <td className="p-4 text-right">
                      {enEspera || agendada ? (
                        <span
                          title={
                            enConsulta
                              ? `Ya tienes una consulta activa en curso con ${citaEnAtencion?.pacienteNombre}. Debes retomarla y finalizarla antes de iniciar una nueva consulta.`
                              : undefined
                          }
                          className="inline-block"
                        >
                          <Button
                            size="sm"
                            icon="ri-stethoscope-line"
                            disabled={enConsulta || iniciandoId !== null}
                            loading={iniciandoId === cita.id}
                            onClick={() => handleIniciarAtencion(cita)}
                          >
                            Atender
                          </Button>
                        </span>
                      ) : esConsultaActiva && cita.consulta_id ? (
                        <Link
                          to={`/medico/consulta/${cita.consulta_id}`}
                          className="inline-flex items-center gap-1.5 rounded-field bg-brand-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-brand-700 transition-colors"
                        >
                          <i className="ri-play-circle-fill text-sm" />
                          Retomar Consulta
                        </Link>
                      ) : cita.consulta_id ? (
                        <Link
                          to={`/medico/consulta/${cita.consulta_id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 underline hover:text-brand-900"
                        >
                          <i className="ri-eye-line" />
                          Ver consulta
                        </Link>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal selector de especialidad al atender */}
      <Modal
        isOpen={citaParaAtender !== null}
        onClose={() => setCitaParaAtender(null)}
        title="Selecciona la Especialidad de Atención"
        subtitle={`Iniciando consulta para ${citaParaAtender?.pacienteNombre}`}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCitaParaAtender(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (citaParaAtender) {
                  handleIniciarAtencion(citaParaAtender, especialidadElegida);
                }
              }}
              loading={iniciarMutation.isPending}
            >
              Iniciar Consulta
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-muted">
            Tienes más de una especialidad activa. Elige con cuál especialidad registrarás esta atención médica:
          </p>
          <select
            className="w-full rounded-field border border-line bg-surface p-2.5 text-sm text-ink outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-600/10"
            value={especialidadElegida}
            onChange={(e) => setEspecialidadElegida(e.target.value)}
          >
            {especialidades.map((esp) => (
              <option key={esp.id} value={esp.id}>
                {esp.nombre}
              </option>
            ))}
          </select>
        </div>
      </Modal>
    </div>
  );
}