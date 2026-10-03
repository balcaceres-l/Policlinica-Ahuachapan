import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import HistorialDiagnosticos from '@/components/expediente/HistorialDiagnosticos';
import LaboratorioCronologico from '@/components/expediente/LaboratorioCronologico';
import SignosVitalesHistorial from '@/components/expediente/SignosVitalesHistorial';
import DirectorioPacientes from '@/components/paciente/DirectorioPacientes';
import SelectorPacienteAutocomplete from '@/components/paciente/SelectorPacienteAutocomplete';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { usePaciente } from '@/hooks/paciente/usePacientes';
import { cn, getIniciales } from '@/lib/utils';

type TabExpediente = 'consultas' | 'signos' | 'laboratorio';

const PESTANAS: { clave: TabExpediente; etiqueta: string; icono: string }[] = [
  { clave: 'consultas', etiqueta: 'Citas y Consultas Previas', icono: 'ri-stethoscope-line' },
  { clave: 'signos', etiqueta: 'Evolución de Signos Vitales', icono: 'ri-heart-pulse-line' },
  { clave: 'laboratorio', etiqueta: 'Resultados de Laboratorio', icono: 'ri-flask-line' },
];

const calcularEdad = (fechaNac?: string | null): string => {
  if (!fechaNac) return '—';
  const nacimiento = new Date(fechaNac.includes('T') ? fechaNac : `${fechaNac}T00:00:00`);
  if (isNaN(nacimiento.getTime())) return '—';
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--;
  }
  return `${edad} años`;
};

export function ExpedientePage() {
  const navigate = useNavigate();
  // El paciente vive en la URL para poder enlazar su expediente desde otras pantallas.
  const { pacienteId = '' } = useParams();
  const [tabActiva, setTabActiva] = useState<TabExpediente>('consultas');

  const { data: paciente, isLoading: cargandoPaciente } = usePaciente(pacienteId);

  const seleccionarPaciente = (id: string) => {
    navigate(id ? `/medico/expediente/${id}` : '/medico/expediente');
  };

  // Si no hay paciente seleccionado en la URL, mostramos la vista global de pacientes
  // compartida con recepción para que el médico busque cualquier paciente por nombre, expediente o DUI.
  if (!pacienteId) {
    return (
      <div className="space-y-6">
        <DirectorioPacientes />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Navegación para volver al listado */}
      <div>
        <button
          type="button"
          onClick={() => navigate('/medico/expediente')}
          className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-900 transition-colors"
        >
          <i className="ri-arrow-left-line" />
          Volver al directorio de pacientes
        </button>
      </div>

      {/* Encabezado y buscador rápido */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Expediente Clínico Electrónico</h1>
          <p className="mt-1 text-sm text-muted">
            Consulta integral del historial médico, citas, evolución de signos y diagnósticos compartidos.
          </p>
        </div>
      </div>

      {/* Selección de paciente / Búsqueda rápida */}
      <div className="rounded-card border border-line bg-surface p-4 shadow-card">
        <SelectorPacienteAutocomplete
          pacienteId={pacienteId}
          onSelectPaciente={seleccionarPaciente}
          label="Buscar o cambiar paciente en expediente"
          required={false}
        />
      </div>

      {/* Resumen del Paciente */}
      {cargandoPaciente ? (
        <LoadingSpinner label="Cargando datos del paciente..." />
      ) : paciente ? (
        <header className="rounded-card border border-line bg-surface p-5 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand-100 text-lg font-bold text-brand-800">
                {getIniciales(paciente.nombre_completo)}
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold text-ink">{paciente.nombre_completo}</h2>
                  <Badge variant={paciente.estado === 'FALLECIDO' ? 'danger' : 'success'}>
                    {paciente.estado === 'FALLECIDO' ? 'Fallecido' : 'Activo'}
                  </Badge>
                  <Badge variant={paciente.es_menor_edad ? 'warning' : 'default'}>
                    {paciente.es_menor_edad ? 'Menor de edad' : 'Adulto'}
                  </Badge>
                </div>

                <p className="mt-1 text-xs text-muted">
                  Expediente:{' '}
                  <span className="font-mono font-bold text-ink">{paciente.numero_expediente}</span>
                  {' · '}
                  Documento:{' '}
                  <span className="font-semibold text-ink">
                    {paciente.dui ? `${paciente.tipo_documento ?? 'DUI'}: ${paciente.dui}` : 'Sin documento'}
                  </span>
                  {' · '}
                  Edad: <span className="font-semibold text-ink">{calcularEdad(paciente.fecha_nacimiento)}</span>
                  {' ('}
                  {paciente.fecha_nacimiento}
                  {')'}
                </p>

                <div className="mt-2.5 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted">
                  {paciente.telefono && (
                    <span className="inline-flex items-center gap-1">
                      <i className="ri-phone-line text-brand-600" />
                      {paciente.telefono}
                    </span>
                  )}
                  {paciente.direccion && (
                    <span className="inline-flex items-center gap-1">
                      <i className="ri-map-pin-line text-brand-600" />
                      {paciente.direccion}
                    </span>
                  )}
                  {paciente.es_menor_edad && paciente.responsable_nombre && (
                    <span className="inline-flex items-center gap-1 font-medium text-ink">
                      <i className="ri-parent-line text-brand-600" />
                      Responsable: {paciente.responsable_nombre} ({paciente.responsable_parentesco})
                      {paciente.responsable_telefono ? ` · Tel: ${paciente.responsable_telefono}` : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>
      ) : null}

      {/* Pestañas de contenido del expediente */}
      <div>
        <div role="tablist" aria-label="Secciones del expediente" className="mb-4 flex flex-wrap gap-2">
          {PESTANAS.map(({ clave, etiqueta, icono }) => (
            <button
              key={clave}
              type="button"
              role="tab"
              aria-selected={tabActiva === clave}
              onClick={() => setTabActiva(clave)}
              className={cn(
                'inline-flex cursor-pointer items-center gap-2 rounded-field border px-4 py-2.5 text-xs font-semibold transition-colors',
                tabActiva === clave
                  ? 'border-brand-600 bg-brand-50 text-brand-800 shadow-xs'
                  : 'border-line bg-surface text-muted hover:bg-brand-50 hover:text-ink',
              )}
            >
              <i className={icono} />
              {etiqueta}
            </button>
          ))}
        </div>

        <div role="tabpanel">
          {tabActiva === 'consultas' && <HistorialDiagnosticos pacienteId={pacienteId} />}
          {tabActiva === 'signos' && <SignosVitalesHistorial pacienteId={pacienteId} />}
          {tabActiva === 'laboratorio' && <LaboratorioCronologico pacienteId={pacienteId} />}
        </div>
      </div>
    </div>
  );
}

export default ExpedientePage;
