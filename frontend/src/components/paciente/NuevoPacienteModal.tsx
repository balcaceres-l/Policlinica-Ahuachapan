import { useState } from 'react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { useCrearPaciente } from '@/hooks/paciente/usePacientes';

interface NuevoPacienteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CLASE_INPUT =
  'h-11 w-full rounded-field border border-line bg-surface px-3 text-sm text-ink outline-none ' +
  'transition-colors placeholder:text-muted focus:border-brand-600 focus:ring-4 ' +
  'focus:ring-brand-600/15 disabled:opacity-60';

export function NuevoPacienteModal({ isOpen, onClose }: NuevoPacienteModalProps) {
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [dui, setDui] = useState('');
  const [telefono, setTelefono] = useState('');
  const [esMenorEdad, setEsMenorEdad] = useState(false);
  const [responsableNombre, setResponsableNombre] = useState('');
  const [responsableTelefono, setResponsableTelefono] = useState('');
  const [responsableParentesco, setResponsableParentesco] = useState('Madre');
  const [error, setError] = useState<string | null>(null);

  const crearMutation = useCrearPaciente();

  const handleFechaNacimientoChange = (fecha: string) => {
    setFechaNacimiento(fecha);
    if (fecha) {
      const hoy = new Date();
      const cumple = new Date(fecha);
      let edad = hoy.getFullYear() - cumple.getFullYear();
      const m = hoy.getMonth() - cumple.getMonth();
      if (m < 0 || (m === 0 && hoy.getDate() < cumple.getDate())) {
        edad--;
      }
      setEsMenorEdad(edad < 18);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!nombreCompleto.trim()) {
      setError('El nombre completo es obligatorio.');
      return;
    }
    if (!fechaNacimiento) {
      setError('La fecha de nacimiento es obligatoria.');
      return;
    }
    if (!esMenorEdad && !dui.trim()) {
      setError('El DUI es obligatorio para mayores de edad.');
      return;
    }
    if (esMenorEdad && (!responsableNombre.trim() || !responsableTelefono.trim())) {
      setError('Los datos del responsable son obligatorios para menores de edad.');
      return;
    }

    try {
      await crearMutation.mutateAsync({
        nombre_completo: nombreCompleto.trim(),
        fecha_nacimiento: fechaNacimiento,
        dui: esMenorEdad && !dui.trim() ? 'MENOR' : dui.trim(),
        telefono: telefono.trim() || undefined,
        es_menor_edad: esMenorEdad,
        responsable_nombre: esMenorEdad ? responsableNombre.trim() : undefined,
        responsable_telefono: esMenorEdad ? responsableTelefono.trim() : undefined,
        responsable_parentesco: esMenorEdad ? responsableParentesco : undefined,
      });

      toast.success('Paciente registrado y expediente generado.');
      onClose();
      // Reset
      setNombreCompleto('');
      setFechaNacimiento('');
      setDui('');
      setTelefono('');
      setEsMenorEdad(false);
      setResponsableNombre('');
      setResponsableTelefono('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar paciente.';
      setError(msg);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nuevo Registro de Paciente"
      subtitle="Genera el expediente clínico e ingresa la información de contacto."
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={crearMutation.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            loading={crearMutation.isPending}
            icon="ri-user-add-line"
          >
            Guardar Paciente
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-field border border-danger/30 bg-danger-soft p-3 text-xs text-danger">
            <i className="ri-error-warning-line mr-1 text-sm align-middle" />
            {error}
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-semibold text-ink">
            Nombre Completo <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            value={nombreCompleto}
            onChange={(e) => setNombreCompleto(e.target.value)}
            placeholder="Ejemplo: Roberto Alexander Ramos Méndez"
            className={CLASE_INPUT}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink">
              Fecha de Nacimiento <span className="text-danger">*</span>
            </label>
            <input
              type="date"
              value={fechaNacimiento}
              onChange={(e) => handleFechaNacimientoChange(e.target.value)}
              className={CLASE_INPUT}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink">
              Teléfono de Contacto
            </label>
            <input
              type="text"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="7000-0000"
              className={CLASE_INPUT}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 items-center gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink">
              DUI {esMenorEdad ? '(Opcional)' : <span className="text-danger">*</span>}
            </label>
            <input
              type="text"
              value={dui}
              onChange={(e) => setDui(e.target.value)}
              placeholder="00000000-0"
              className={CLASE_INPUT}
            />
          </div>
          <div className="pt-4">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-ink">
              <input
                type="checkbox"
                checked={esMenorEdad}
                onChange={(e) => setEsMenorEdad(e.target.checked)}
                className="size-4 rounded text-brand-600 focus:ring-brand-600/30"
              />
              ¿Es menor de edad?
            </label>
          </div>
        </div>

        {esMenorEdad && (
          <div className="rounded-card border border-brand-200 bg-brand-50/50 p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-brand-700">
              <i className="ri-parent-line mr-1 text-sm" />
              Datos Obligatorios del Responsable
            </p>
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink">
                Nombre del Responsable <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={responsableNombre}
                onChange={(e) => setResponsableNombre(e.target.value)}
                placeholder="Nombre del padre, madre o tutor legal"
                className={CLASE_INPUT}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink">
                  Teléfono Responsable <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={responsableTelefono}
                  onChange={(e) => setResponsableTelefono(e.target.value)}
                  placeholder="7000-0000"
                  className={CLASE_INPUT}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink">
                  Parentesco
                </label>
                <select
                  value={responsableParentesco}
                  onChange={(e) => setResponsableParentesco(e.target.value)}
                  className={CLASE_INPUT}
                >
                  <option value="Madre">Madre</option>
                  <option value="Padre">Padre</option>
                  <option value="Tutor Legal">Tutor Legal</option>
                  <option value="Abuelo/a">Abuelo/a</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}

export default NuevoPacienteModal;
