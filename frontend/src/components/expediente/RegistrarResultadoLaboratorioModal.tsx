import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import SelectorPacienteAutocomplete from '@/components/paciente/SelectorPacienteAutocomplete';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { useRegistrarResultado } from '@/hooks/laboratorio/useLaboratorio';
import { extraerMensajeError } from '@/lib/apiError';
import { formatearTamano, reducirImagen } from '@/lib/imagen';
import { obtenerFechaLocal } from '@/lib/utils';
import {
  resultadoLaboratorioDefaults,
  resultadoLaboratorioSchema,
  TAMANO_MAXIMO_ADJUNTO,
  TIPOS_ADJUNTO_LABORATORIO,
  type ResultadoLaboratorioFormValues,
} from '@/lib/validations/resultadoLaboratorioSchema';

interface RegistrarResultadoLaboratorioModalProps {
  /** Sin paciente fijo el modal pide elegirlo. */
  pacienteId?: string;
  /** Consulta activa desde la que se registra, si la hay. */
  consultaId?: string | null;
  onClose: () => void;
}

const CLASE_INPUT =
  'h-11 w-full rounded-field border border-line bg-surface px-3 text-sm text-ink outline-none ' +
  'transition-colors placeholder:text-muted focus:border-brand-600 focus:ring-4 ' +
  'focus:ring-brand-600/15 disabled:opacity-60';

/**
 * HU-41 — registro de un resultado de laboratorio como texto, como foto o PDF
 * del resultado, o ambos. Se monta al abrirse.
 */
export function RegistrarResultadoLaboratorioModal({
  pacienteId,
  consultaId,
  onClose,
}: RegistrarResultadoLaboratorioModalProps) {
  const registrar = useRegistrarResultado();
  const [pacienteElegido, setPacienteElegido] = useState(pacienteId ?? '');
  const [archivo, setArchivo] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<ResultadoLaboratorioFormValues>({
    resolver: zodResolver(resultadoLaboratorioSchema),
    defaultValues: resultadoLaboratorioDefaults(),
  });

  const elegirArchivo = (seleccionado: File | null) => {
    clearErrors('root');
    if (seleccionado && seleccionado.size > TAMANO_MAXIMO_ADJUNTO && !seleccionado.type.startsWith('image/')) {
      setArchivo(null);
      setError('root', { message: 'El PDF no puede superar los 5 MB.' });
      return;
    }
    setArchivo(seleccionado);
  };

  const onSubmit = async (valores: ResultadoLaboratorioFormValues) => {
    if (!pacienteElegido) {
      setError('root', { message: 'Selecciona el paciente al que pertenece el resultado.' });
      return;
    }
    if (!valores.resultado_texto && !archivo) {
      setError('root', { message: 'Escribe el resultado o adjunta una imagen o PDF.' });
      return;
    }

    try {
      await registrar.mutateAsync({
        pacienteId: pacienteElegido,
        payload: {
          ...valores,
          archivo: archivo ? await reducirImagen(archivo) : null,
          consulta_id: consultaId,
        },
      });
      toast.success('Resultado de laboratorio registrado.');
      onClose();
    } catch (error) {
      setError('root', {
        message: extraerMensajeError(error, 'No se pudo registrar el resultado.'),
      });
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Registrar resultado de laboratorio"
      subtitle="Escribe el resultado, adjunta la foto o el PDF, o ambos."
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" form="form-resultado-laboratorio" loading={isSubmitting} icon="ri-save-line">
            Registrar
          </Button>
        </>
      }
    >
      <form id="form-resultado-laboratorio" onSubmit={handleSubmit(onSubmit)} noValidate>
        {!pacienteId && (
          <div className="mb-4">
            <SelectorPacienteAutocomplete
              pacienteId={pacienteElegido}
              onSelectPaciente={setPacienteElegido}
              disabled={isSubmitting}
            />
          </div>
        )}

        <div className="mb-4 grid gap-4 sm:grid-cols-[1fr_170px]">
          <div>
            <label htmlFor="lab_nombre_examen" className="mb-1.5 block text-sm font-medium text-ink">
              Examen
            </label>
            <input
              id="lab_nombre_examen"
              type="text"
              disabled={isSubmitting}
              aria-invalid={Boolean(errors.nombre_examen)}
              className={CLASE_INPUT}
              placeholder="Hemograma completo"
              {...register('nombre_examen')}
            />
            {errors.nombre_examen && (
              <p className="mt-1.5 text-xs text-danger">{errors.nombre_examen.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="lab_fecha_examen" className="mb-1.5 block text-sm font-medium text-ink">
              Fecha del examen
            </label>
            <input
              id="lab_fecha_examen"
              type="date"
              max={obtenerFechaLocal()}
              disabled={isSubmitting}
              aria-invalid={Boolean(errors.fecha_examen)}
              className={CLASE_INPUT}
              {...register('fecha_examen')}
            />
            {errors.fecha_examen && (
              <p className="mt-1.5 text-xs text-danger">{errors.fecha_examen.message}</p>
            )}
          </div>
        </div>

        <div className="mb-4">
          <label htmlFor="lab_resultado_texto" className="mb-1.5 block text-sm font-medium text-ink">
            Resultado <span className="font-normal text-muted">(texto)</span>
          </label>
          <textarea
            id="lab_resultado_texto"
            rows={4}
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.resultado_texto)}
            className={`${CLASE_INPUT} h-auto py-2`}
            placeholder="Hemoglobina 14.8 g/dL, leucocitos 7.2 x10³/µL..."
            {...register('resultado_texto')}
          />
          {errors.resultado_texto && (
            <p className="mt-1.5 text-xs text-danger">{errors.resultado_texto.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="lab_archivo" className="mb-1.5 block text-sm font-medium text-ink">
            Adjunto <span className="font-normal text-muted">(foto o PDF del resultado)</span>
          </label>
          <input
            id="lab_archivo"
            type="file"
            accept={TIPOS_ADJUNTO_LABORATORIO}
            disabled={isSubmitting}
            onChange={(e) => elegirArchivo(e.target.files?.[0] ?? null)}
            className="block w-full cursor-pointer text-sm text-muted file:mr-3 file:cursor-pointer file:rounded-field file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
          />
          <p className="mt-1.5 text-xs text-muted">
            {archivo
              ? `${archivo.name} · ${formatearTamano(archivo.size)}`
              : 'JPG, PNG, WEBP o PDF. Las fotos grandes se reducen antes de subirlas.'}
          </p>
        </div>

        {errors.root && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-field bg-danger-soft px-3 py-2.5 text-sm text-danger"
          >
            <i className="ri-error-warning-line mt-0.5 shrink-0" />
            <span>{errors.root.message}</span>
          </div>
        )}
      </form>
    </Modal>
  );
}

export default RegistrarResultadoLaboratorioModal;
