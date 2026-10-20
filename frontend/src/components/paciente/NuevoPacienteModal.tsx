import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { useCrearPaciente } from '@/hooks/paciente/usePacientes';
import { extraerMensajeError } from '@/lib/apiError';
import { contieneLetrasOCaracteresEspeciales, formatearDui, formatearTelefono, obtenerFechaLocal } from '@/lib/utils';
import type { Paciente, TipoDocumento } from '@/types/paciente.types';

interface NuevoPacienteModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Recibe el paciente recién registrado (consulta inmediata lo usa para atenderlo). */
  onCreado?: (paciente: Paciente) => void;
  /** Texto bajo el título; la consulta inmediata explica que recepción completará el registro. */
  subtitulo?: string;
}

const CLASE_INPUT =
  'h-11 w-full rounded-field border border-line bg-surface px-3 text-sm text-ink outline-none ' +
  'transition-colors placeholder:text-muted focus:border-brand-600 focus:ring-4 ' +
  'focus:ring-brand-600/15 disabled:opacity-60';

const CLASE_TEXTAREA =
  'min-h-16 w-full resize-y rounded-field border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none ' +
  'transition-colors placeholder:text-muted focus:border-brand-600 focus:ring-4 ' +
  'focus:ring-brand-600/15 disabled:opacity-60';

export function NuevoPacienteModal({ isOpen, onClose, onCreado, subtitulo }: NuevoPacienteModalProps) {
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumento>('DUI');
  const [dui, setDui] = useState('');
  // Un menor puede tener pasaporte propio; es opcional y va aparte del documento del adulto.
  const [pasaporteMenor, setPasaporteMenor] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [responsableNombre, setResponsableNombre] = useState('');
  const [responsableTipoDocumento, setResponsableTipoDocumento] = useState<TipoDocumento>('DUI');
  const [responsableDocumento, setResponsableDocumento] = useState('');
  const [responsableTelefono, setResponsableTelefono] = useState('');
  const [responsableParentesco, setResponsableParentesco] = useState('Madre');
  const [error, setError] = useState<string | null>(null);

  const crearMutation = useCrearPaciente();

  // La edad sale de la fecha de nacimiento: no se pregunta aparte.
  const esMenorEdad = useMemo(() => {
    if (!fechaNacimiento) return false;
    const cumple = new Date(`${fechaNacimiento}T00:00:00`);
    if (Number.isNaN(cumple.getTime())) return false;
    const hoy = new Date();
    let edad = hoy.getFullYear() - cumple.getFullYear();
    const m = hoy.getMonth() - cumple.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < cumple.getDate())) edad--;
    return edad < 18;
  }, [fechaNacimiento]);

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

    if (!fechaNacimiento) {
      setError('La fecha de nacimiento es obligatoria.');
      return;
    }
    const hoyStr = obtenerFechaLocal();
    if (fechaNacimiento > hoyStr) {
      setError('La fecha de nacimiento no puede ser posterior a la fecha actual.');
      return;
    }

    const docLimpio = dui.trim();
    const telLimpio = telefono.trim();

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
        if (!/^[A-Za-z0-9]{6,15}$/.test(docLimpio)) {
          setError('El Pasaporte debe contener entre 6 y 15 caracteres alfanuméricos (sin espacios ni símbolos).');
          return;
        }
      }

      if (telLimpio && contieneLetrasOCaracteresEspeciales(telLimpio)) {
        setError('El teléfono de contacto solo debe contener números.');
        return;
      }
    } else {
      if (pasaporteMenor && !/^[A-Za-z0-9]{6,15}$/.test(pasaporteMenor)) {
        setError('El Pasaporte debe contener entre 6 y 15 caracteres alfanuméricos (sin espacios ni símbolos).');
        return;
      }
      // Para menor de edad, validar datos del responsable
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
        if (!/^[A-Za-z0-9]{6,15}$/.test(respDocLimpio)) {
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
      const creado = await crearMutation.mutateAsync({
        nombre_completo: nombreLimpio,
        fecha_nacimiento: fechaNacimiento,
        tipo_documento: esMenorEdad ? (pasaporteMenor ? 'PASAPORTE' : undefined) : tipoDocumento,
        dui: esMenorEdad ? pasaporteMenor || null : docLimpio,
        telefono: esMenorEdad ? null : (telLimpio || undefined),
        direccion: direccion.trim() || undefined,
        es_menor_edad: esMenorEdad,
        responsable_nombre: esMenorEdad ? responsableNombre.trim() : undefined,
        responsable_tipo_documento: esMenorEdad ? responsableTipoDocumento : undefined,
        responsable_documento: esMenorEdad ? responsableDocumento.trim() : undefined,
        responsable_telefono: esMenorEdad ? responsableTelefono.trim() : undefined,
        responsable_parentesco: esMenorEdad ? responsableParentesco : undefined,
      });

      toast.success('Paciente registrado y expediente generado exitosamente.');
      onClose();
      onCreado?.(creado);
      // Reset
      setNombreCompleto('');
      setFechaNacimiento('');
      setTipoDocumento('DUI');
      setDui('');
      setPasaporteMenor('');
      setTelefono('');
      setDireccion('');
      setResponsableNombre('');
      setResponsableTipoDocumento('DUI');
      setResponsableDocumento('');
      setResponsableTelefono('');
      setResponsableParentesco('Madre');
    } catch (err: unknown) {
      setError(extraerMensajeError(err, 'Error al registrar paciente.'));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nuevo Registro de Paciente"
      subtitle={subtitulo ?? 'Genera el expediente clínico e ingresa la información del paciente.'}
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

        <div className="sm:w-1/2">
          <label className="mb-1 block text-xs font-semibold text-ink">
            Fecha de Nacimiento <span className="text-danger">*</span>
          </label>
          <input
            type="date"
            value={fechaNacimiento}
            onChange={(e) => setFechaNacimiento(e.target.value)}
            className={CLASE_INPUT}
          />
        </div>

        {/* Menor de edad: sin teléfono propio; pasaporte opcional; el documento del responsable va abajo. */}
        {esMenorEdad ? (
          <div className="space-y-3">
            <div className="rounded-card border border-info/30 bg-info-soft/40 p-3 text-xs text-info">
              <i className="ri-information-line mr-1 text-sm align-middle" />
              Para pacientes menores de edad <strong>no se solicita teléfono</strong>; se registra el de su responsable legal.
            </div>
            <div className="sm:w-1/2">
              <label className="mb-1 block text-xs font-semibold text-ink">
                Pasaporte del paciente (Opcional)
              </label>
              <input
                type="text"
                value={pasaporteMenor}
                onChange={(e) =>
                  setPasaporteMenor(e.target.value.toUpperCase().replace(/[^A-Za-z0-9]/g, ''))
                }
                placeholder="Ej: A12345678"
                maxLength={15}
                className={CLASE_INPUT}
              />
            </div>
          </div>
        ) : (
          /* Si es MAYOR de edad: documento obligatorio (DUI o Pasaporte) y teléfono */
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink">
                  Tipo de Documento <span className="text-danger">*</span>
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
                  {tipoDocumento === 'DUI' ? 'Número de DUI' : 'Número de Pasaporte'}{' '}
                  <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={dui}
                  onChange={(e) => {
                    if (tipoDocumento === 'DUI') {
                      setDui(formatearDui(e.target.value));
                    } else {
                      setDui(e.target.value.toUpperCase().replace(/[^A-Za-z0-9]/g, ''));
                    }
                  }}
                  placeholder={tipoDocumento === 'DUI' ? '00000000-0' : 'Ej: A12345678'}
                  maxLength={tipoDocumento === 'DUI' ? 10 : 15}
                  className={CLASE_INPUT}
                />
              </div>
            </div>

            <div className="sm:w-1/2">
              <label className="mb-1 block text-xs font-semibold text-ink">
                Teléfono de Contacto (Opcional)
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
        )}

        {/* Ancho completo y debajo del teléfono: así se ve completa una dirección larga. */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink">
            Dirección (Opcional)
          </label>
          <textarea
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            placeholder="Municipio, departamento, colonia, calle y número de casa"
            rows={2}
            maxLength={250}
            className={CLASE_TEXTAREA}
          />
        </div>

        {/* Sección de datos obligatorios del Responsable para menores */}
        {esMenorEdad && (
          <div className="rounded-card border border-brand-200 bg-brand-50/50 p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-brand-700">
              <i className="ri-parent-line mr-1 text-sm" />
              Datos Obligatorios del Responsable
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
                <label className="mb-1 block text-xs font-semibold text-ink">
                  Tipo Doc. Responsable <span className="text-danger">*</span>
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
                        e.target.value.toUpperCase().replace(/[^A-Za-z0-9]/g, ''),
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
          </div>
        )}
      </form>
    </Modal>
  );
}

export default NuevoPacienteModal;
