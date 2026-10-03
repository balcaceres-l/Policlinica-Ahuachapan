import { useNavigate, useParams } from 'react-router-dom';
import HistorialDiagnosticos from '@/components/expediente/HistorialDiagnosticos';
import LaboratorioCronologico from '@/components/expediente/LaboratorioCronologico';
import DirectorioPacientes from '@/components/paciente/DirectorioPacientes';
import SelectorPacienteAutocomplete from '@/components/paciente/SelectorPacienteAutocomplete';

export function ExpedientePage() {
  const navigate = useNavigate();
  // El paciente vive en la URL para poder enlazar su expediente desde otras pantallas.
  const { pacienteId = '' } = useParams();

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
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-900 transition-colors"
        >
          <i className="ri-arrow-left-line" />
          Volver al directorio de pacientes
        </button>
      </div>

      {/* Encabezado */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Expediente Clínico Electrónico</h1>
          <p className="mt-1 text-sm text-muted">
            Consulta integral del historial médico, notas clínicas, recetas y diagnósticos.
          </p>
        </div>
      </div>

      {/* Selección de paciente / Búsqueda rápida */}
      <div className="rounded-card border border-line bg-surface p-4 shadow-card">
        <SelectorPacienteAutocomplete
          pacienteId={pacienteId}
          onSelectPaciente={seleccionarPaciente}
          label="Cambiar paciente"
          required={false}
        />
      </div>

      {/* HU-22 — Historial de consultas y diagnósticos */}
      <HistorialDiagnosticos pacienteId={pacienteId} />

      {/* HU-23 — Laboratorio cronológico */}
      <div className="mt-8">
        <LaboratorioCronologico pacienteId={pacienteId} />
      </div>
    </div>
  );
}

export default ExpedientePage;
