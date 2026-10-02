import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { useActualizarPaciente } from '@/hooks/paciente/usePacientes';
import { extraerMensajeError } from '@/lib/apiError';
import { contieneLetrasOCaracteresEspeciales, formatearTelefono } from '@/lib/utils';
import type { Paciente } from '@/types/paciente.types';

interface EditarPacienteModalProps {
  paciente: Paciente | null;
  isOpen: boolean;
  onClose: () => void;
}

const CLASE_INPUT =
  'h-11 w-full rounded-field border border-line bg-surface px-3 text-sm text-ink outline-none ' +
  'transition-colors placeholder:text-muted focus:border-brand-600 focus:ring-4 ' +
  'focus:ring-brand-600/15 disabled:opacity-60';

const CLASE_INPUT_DISABLED =
  'h-11 w-full rounded-field border border-line/60 bg-muted/10 px-3 text-sm text-muted outline-none ' +
  'cursor-not-allowed select-none font-medium';

export function EditarPacienteModal({ paciente, isOpen, onClose }: EditarPacienteModalProps) {
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [responsableNombre, setResponsableNombre] = useState('');
  const [responsableTelefono, setResponsableTelefono] = useState('');
  const [responsableParentesco, setResponsableParentesco] = useState('Madre');
  const [error, setError] = useState<string | null>(null);

  const actualizarMutation = useActualizarPaciente();

  useEffect(() => {
    if (paciente && isOpen) {
      setNombreCompleto(paciente.nombre_completo || '');
      setTelefono(paciente.telefono || '');
      setDireccion(paciente.direccion || '');
      setResponsableNombre(paciente.responsable_nombre || '');
      setResponsableTelefono(paciente.responsable_telefono || '');
      setResponsableParentesco(paciente.responsable_parentesco || 'Madre');
      setError(null);
    }
  }, [paciente, isOpen]);

  if (!paciente) return null;

  const esMenor = paciente.es_menor_edad;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const nombreLimpio = nombreCompleto.trim();
    if (!nombreLimpio) {
      setError('El nombre completo es obligatorio.');
      return;
    }
    if (nombreLimpio.length < 3) {
      setError('El nombre completo debe tener al menos 3 caracteres.');
      return;
    }

    const telLimpio = telefono.trim();
    if (!esMenor && telLimpio && contieneLetrasOCaracteresEspeciales(telLimpio)) {
      setError('El teléfono de contacto solo debe contener números.');
      return;
    }

    if (esMenor) {
      if (!responsableNombre.trim()) {
        setError('El nombre del responsable es obligatorio.');
        return;
      }
      if (responsableNombre.trim().length < 3) {
        setError('El nombre del responsable debe tener al menos 3 caracteres.');
        return;
      }
      if (!responsableTelefono.trim()) {
        setError('El teléfono del responsable es obligatorio.');
        return;
      }
      if (contieneLetrasOCaracteresEspeciales(responsableTelefono.trim())) {
        setError('El teléfono del responsable no debe contener letras ni caracteres especiales.');
        return;
      }
    }

    try {
      await actualizarMutation.mutateAsync({
        id: paciente.id,
        payload: {
          nombre_completo: nombreLimpio,
          telefono: esMenor ? null : (telLimpio || null),
          direccion: direccion.trim() || null,
          responsable_nombre: esMenor ? responsableNombre.trim() : undefined,
          responsable_telefono: esMenor ? responsableTelefono.trim() : undefined,
          responsable_parentesco: esMenor ? responsableParentesco : undefined,
        },
      });

      toast.success('Información del paciente actualizada correctamente.');
      onClose();
    } catch (err: unknown) {
      setError(extraerMensajeError(err, 'Error al actualizar paciente.'));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Editar Información del Paciente"
      subtitle="Actualiza los datos personales o de contacto del paciente."
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={actualizarMutation.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            loading={actualizarMutation.isPending}
            icon="ri-save-line"
          >
            Guardar Cambios
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

        {/* Datos de identidad inmutables */}
        <div className="rounded-card border border-line bg-canvas/60 p-3.5 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-muted flex items-center gap-1.5">
              <i className="ri-lock-line text-brand-600" />
              Datos de Identidad (No editables)
            </span>
            <span className="rounded bg-brand-50 px-2 py-0.5 font-bold text-[11px] text-brand-700">
              Expediente: {paciente.numero_expediente}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted">
                Documento de Identidad
              </label>
              <input
                type="text"
                disabled
                value={
                  paciente.dui
                    ? `${paciente.tipo_documento ?? 'DUI'}: ${paciente.dui}`
                    : 'Sin documento (Menor de edad)'
                }
                className={CLASE_INPUT_DISABLED}
                title="El DUI/Pasaporte no puede ser modificado por seguridad y unicidad clínica."
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted">
                Fecha de Nacimiento
              </label>
              <input
                type="text"
                disabled
                value={`${paciente.fecha_nacimiento} (${esMenor ? 'Menor de edad' : 'Adulto'})`}
                className={CLASE_INPUT_DISABLED}
                title="La fecha de nacimiento no puede ser modificada."
              />
            </div>
          </div>
          <p className="text-[11px] text-muted">
            <i className="ri-information-line mr-1 text-brand-600" />
            Por seguridad e integridad del historial médico, el documento de identidad y la fecha de nacimiento no son editables.
          </p>
        </div>

        {/* Campos editables del Paciente */}
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

        {!esMenor && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink">
                Teléfono de Contacto
              </label>
              <input
                type="text"
                value={telefono}
                onChange={(e) => setTelefono(formatearTelefono(e.target.value))}
                placeholder="7000-0000"
                maxLength={9}
                className={CLASE_INPUT}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink">
                Dirección
              </label>
              <input
                type="text"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Municipio, departamento"
                className={CLASE_INPUT}
              />
            </div>
          </div>
        )}

        {esMenor && (
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink">
              Dirección
            </label>
            <input
              type="text"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Municipio, departamento"
              className={CLASE_INPUT}
            />
          </div>
        )}

        {/* Sección editable del Responsable para menores */}
        {esMenor && (
          <div className="rounded-card border border-brand-200 bg-brand-50/50 p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-brand-700">
              <i className="ri-parent-line mr-1 text-sm" />
              Datos del Responsable Legal
            </p>

            <div>
              <label className="mb-1 block text-xs font-semibold text-ink">
                Nombre Completo del Responsable <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={responsableNombre}
                onChange={(e) => setResponsableNombre(e.target.value)}
                placeholder="Nombre del padre, madre o tutor legal"
                className={CLASE_INPUT}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted">
                  Documento del Responsable (No editable)
                </label>
                <input
                  type="text"
                  disabled
                  value={
                    paciente.responsable_documento
                      ? `${paciente.responsable_tipo_documento ?? 'DUI'}: ${paciente.responsable_documento}`
                      : 'No registrado'
                  }
                  className={CLASE_INPUT_DISABLED}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-ink">
                  Teléfono Responsable <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={responsableTelefono}
                  onChange={(e) => setResponsableTelefono(formatearTelefono(e.target.value))}
                  placeholder="7000-0000"
                  maxLength={9}
                  className={CLASE_INPUT}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-ink">
                Parentesco <span className="text-danger">*</span>
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
        )}
      </form>
    </Modal>
  );
}

export default EditarPacienteModal;
