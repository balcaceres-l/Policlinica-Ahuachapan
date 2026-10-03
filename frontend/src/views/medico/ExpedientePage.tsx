import { useNavigate, useParams } from 'react-router-dom';
import HistorialDiagnosticos from '@/components/expediente/HistorialDiagnosticos';
import LaboratorioCronologico from '@/components/expediente/LaboratorioCronologico';
import SelectorPacienteAutocomplete from '@/components/paciente/SelectorPacienteAutocomplete';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';

export function ExpedientePage() {
  const navigate = useNavigate();
  // El paciente vive en la URL para poder enlazar su expediente desde otras pantallas.
  const { pacienteId = '' } = useParams();

  const seleccionarPaciente = (id: string) => {
    navigate(id ? `/medico/expediente/${id}` : '/medico/expediente');
  };

  return (
    <div className="mx-auto max-w-6xl">
      {/* Encabezado */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Expediente Clínico</h1>
          <p className="mt-1 text-sm text-muted">
            Consulta integral del historial médico, notas clínicas, recetas y diagnósticos.
          </p>
        </div>
        <Button icon="ri-folder-add-line">Nuevo Registro</Button>
      </div>

      {/* Selección de paciente */}
      <div className="mb-6 rounded-card border border-line bg-surface p-4 shadow-card">
        <SelectorPacienteAutocomplete
          pacienteId={pacienteId}
          onSelectPaciente={seleccionarPaciente}
          label="Paciente"
          required={false}
        />
      </div>

      {/* HU-22 */}
      {pacienteId ? (
        <HistorialDiagnosticos pacienteId={pacienteId} />
      ) : (
        <div className="rounded-card border border-line bg-surface shadow-card">
          <EmptyState
            icon="ri-folder-user-line"
            title="Consulta de expediente clínico"
            message="Busca un paciente por nombre, número de expediente o documento para revisar su historial clínico electrónico."
          />
        </div>
      )}

      {/* HU-23 */}
      {pacienteId && (
        <div className="mt-8">
          <LaboratorioCronologico pacienteId={pacienteId} />
        </div>
      )}
    </div>
  );
}

export default ExpedientePage;
