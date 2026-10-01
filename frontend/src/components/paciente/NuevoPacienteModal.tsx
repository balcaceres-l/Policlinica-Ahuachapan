import { useState } from 'react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { useCrearPaciente } from '@/hooks/paciente/usePacientes';
import { contieneLetrasOCaracteresEspeciales, formatearDui, formatearTelefono } from '@/lib/utils';
import type { TipoDocumento } from '@/types/paciente.types';

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
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumento>('DUI');
  const [dui, setDui] = useState('');
  const [telefono, setTelefono] = useState('');
  const [esMenorEdad, setEsMenorEdad] = useState(false);
  const [responsableNombre, setResponsableNombre] = useState('');
  const [responsableTipoDocumento, setResponsableTipoDocumento] = useState<TipoDocumento>('DUI');
  const [responsableDocumento, setResponsableDocumento] = useState('');
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

    const nombreLimpio = nombreCompleto.trim();
    if (!nombreLimpio) {
      setError('El nombre completo es obligatorio.');
      return;
    }
    if (nombreLimpio.length < 3) {
      setError('El nombre completo debe tener al menos 3 caracteres.');
      return;
    }
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.'-]+$/.test(nombreLimpio)) {
      setError('El nombre completo solo puede contener letras y espacios.');
      return;
    }

    if (!fechaNacimiento) {
      setError('La fecha de nacimiento es obligatoria.');
      return;
    }
    const hoyStr = new Date().toISOString().split('T')[0];
    if (fechaNacimiento > hoyStr) {
      setError('La fecha de nacimiento no puede ser posterior a la fecha actual.');
      return;
    }

    // Validación de teléfono (solo valida letras y caracteres especiales)
    const telLimpio = telefono.trim();
    if (telLimpio && contieneLetrasOCaracteresEspeciales(telLimpio)) {
      setError('El teléfono de contacto no debe contener letras ni caracteres especiales (solo números).');
      return;
    }

    const docLimpio = dui.trim();
    if (!esMenorEdad) {
      if (!docLimpio) {
        setError(`El ${tipoDocumento === 'DUI' ? 'DUI' : 'Pasaporte'} es obligatorio para mayores de edad.`);
        return;
      }
      if (tipoDocumento === 'DUI') {
        if (!/^\d{8}-\d$/.test(docLimpio)) {
          setError('El DUI debe tener el formato 00000000-0 (9 dígitos).');
          return;
        }
      } else {
        if (!/^[A-Z0-9]{6,15}$/.test(docLimpio)) {
          setError('El Pasaporte debe contener entre 6 y 15 caracteres alfanuméricos (sin espacios ni símbolos).');
          return;
        }
      }
    } else if (docLimpio) {
      if (tipoDocumento === 'DUI' && !/^\d{8}-\d$/.test(docLimpio)) {
        setError('Si ingresa DUI para el menor, debe tener el formato 00000000-0.');
        return;
      } else if (tipoDocumento === 'PASAPORTE' && !/^[A-Z0-9]{6,15}$/.test(docLimpio)) {
        setError('Si ingresa Pasaporte para el menor, debe contener entre 6 y 15 caracteres alfanuméricos.');
        return;
      }
    }

    if (esMenorEdad) {
      if (!responsableNombre.trim()) {
        setError('El nombre del responsable es obligatorio para menores de edad.');
        return;
      }
      if (responsableNombre.trim().length < 3) {
        setError('El nombre del responsable debe tener al menos 3 caracteres.');
        return;
      }
      const respDocLimpio = responsableDocumento.trim();
      if (!respDocLimpio) {
        setError(`El ${responsableTipoDocumento === 'DUI' ? 'DUI' : 'Pasaporte'} del responsable es obligatorio.`);
        return;
      }
      if (responsableTipoDocumento === 'DUI') {
        if (!/^\d{8}-\d$/.test(respDocLimpio)) {
          setError('El DUI del responsable debe tener el formato 00000000-0 (9 dígitos).');
          return;
        }
      } else {
        if (!/^[A-Z0-9]{6,15}$/.test(respDocLimpio)) {
          setError('El Pasaporte del responsable debe contener entre 6 y 15 caracteres alfanuméricos.');
          return;
        }
      }
      if (!responsableTelefono.trim()) {
        setError('El teléfono del responsable es obligatorio.');
        return;
      }
      if (contieneLetrasOCaracteresEspeciales(responsableTelefono.trim())) {
        setError('El teléfono del responsable no debe contener letras ni caracteres especiales (solo números).');
        return;
      }
    }

    try {
      await crearMutation.mutateAsync({
        nombre_completo: nombreLimpio,
        fecha_nacimiento: fechaNacimiento,
        tipo_documento: tipoDocumento,
        dui: esMenorEdad && !docLimpio ? 'MENOR' : docLimpio,
        telefono: telLimpio || undefined,
        es_menor_edad: esMenorEdad,
        responsable_nombre: esMenorEdad ? responsableNombre.trim() : undefined,
        responsable_tipo_documento: esMenorEdad ? responsableTipoDocumento : undefined,
        responsable_documento: esMenorEdad ? responsableDocumento.trim() : undefined,
        responsable_telefono: esMenorEdad ? responsableTelefono.trim() : undefined,
        responsable_parentesco: esMenorEdad ? responsableParentesco : undefined,
      });

      toast.success('Paciente registrado y expediente generado.');
      onClose();
      // Reset
      setNombreCompleto('');
      setFechaNacimiento('');
      setTipoDocumento('DUI');
      setDui('');
      setTelefono('');
      setEsMenorEdad(false);
      setResponsableNombre('');
      setResponsableTipoDocumento('DUI');
      setResponsableDocumento('');
      setResponsableTelefono('');
      setResponsableParentesco('Madre');
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
              onChange={(e) => setTelefono(formatearTelefono(e.target.value))}
              placeholder="7000-0000"
              maxLength={9}
              className={CLASE_INPUT}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink">
              Tipo de Documento
            </label>
            <select
              value={tipoDocumento}
              onChange={(e) => {
                setTipoDocumento(e.target.value as TipoDocumento);
                setDui('');
              }}
              className={CLASE_INPUT}
            >
              <option value="DUI">DUI (Nacional)</option>
              <option value="PASAPORTE">Pasaporte (Extranjero)</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink">
              {tipoDocumento === 'DUI' ? 'DUI' : 'Pasaporte'}{' '}
              {esMenorEdad ? '(Opcional)' : <span className="text-danger">*</span>}
            </label>
            <input
              type="text"
              value={dui}
              onChange={(e) => {
                if (tipoDocumento === 'DUI') {
                  setDui(formatearDui(e.target.value));
                } else {
                  setDui(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
                }
              }}
              placeholder={tipoDocumento === 'DUI' ? '00000000-0' : 'Ej: A12345678'}
              maxLength={tipoDocumento === 'DUI' ? 10 : 15}
              className={CLASE_INPUT}
            />
          </div>
          <div className="pb-2 sm:pb-3">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink">
                  Tipo Doc. Responsable
                </label>
                <select
                  value={responsableTipoDocumento}
                  onChange={(e) => {
                    setResponsableTipoDocumento(e.target.value as TipoDocumento);
                    setResponsableDocumento('');
                  }}
                  className={CLASE_INPUT}
                >
                  <option value="DUI">DUI (Nacional)</option>
                  <option value="PASAPORTE">Pasaporte (Extranjero)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink">
                  {responsableTipoDocumento === 'DUI'
                    ? 'DUI del Responsable'
                    : 'Pasaporte del Responsable'}{' '}
                  <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={responsableDocumento}
                  onChange={(e) => {
                    if (responsableTipoDocumento === 'DUI') {
                      setResponsableDocumento(formatearDui(e.target.value));
                    } else {
                      setResponsableDocumento(
                        e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''),
                      );
                    }
                  }}
                  placeholder={
                    responsableTipoDocumento === 'DUI' ? '00000000-0' : 'Ej: A12345678'
                  }
                  maxLength={responsableTipoDocumento === 'DUI' ? 10 : 15}
                  className={CLASE_INPUT}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
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
