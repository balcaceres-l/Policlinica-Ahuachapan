import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { useCrearReferencia, useMedicosDestino } from '@/hooks/documento/useDocumentos';
import { extraerMensajeError } from '@/lib/apiError';
import { cn } from '@/lib/utils';
import {
  referenciaFormDefaults,
  referenciaSchema,
  type ReferenciaFormValues,
} from '@/lib/validations/documentoSchema';
import type { ReferenciaMedica, TipoReferencia } from '@/types/documento.types';

interface ReferenciaModalProps {
  isOpen: boolean;
  consultaId: string;
  pacienteNombre?: string | null;
  onClose: () => void;
  /** Recibe la referencia creada (para abrir su PDF). */
  onCreada: (referencia: ReferenciaMedica) => void;
}

const CLASE_INPUT =
  'h-11 w-full rounded-field border border-line bg-surface px-3 text-sm text-ink outline-none ' +
  'transition-colors placeholder:text-muted focus:border-brand-600 focus:ring-4 ' +
  'focus:ring-brand-600/15 disabled:opacity-60';

const CLASE_AREA =
  'w-full rounded-field border border-line bg-surface px-3 py-2 text-sm text-ink outline-none ' +
  'transition-colors placeholder:text-muted focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15';

const TIPOS: { valor: TipoReferencia; titulo: string; detalle: string }[] = [
  {
    valor: 'INTERNA',
    titulo: 'Interna',
    detalle: 'A otro médico de la policlínica. El documento lleva el expediente completo.',
  },
  {
    valor: 'EXTERNA',
    titulo: 'Externa',
    detalle: 'A un especialista de fuera. Lleva solo lo que escribas; no expone el expediente.',
  },
];

/** HU-32 — referencia médica interna o externa desde la consulta. */
export function ReferenciaModal({ isOpen, consultaId, pacienteNombre, onClose, onCreada }: ReferenciaModalProps) {
  const crear = useCrearReferencia();
  const { data: medicos = [], isLoading: cargandoMedicos } = useMedicosDestino(isOpen);
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ReferenciaFormValues>({
    resolver: zodResolver(referenciaSchema),
    defaultValues: referenciaFormDefaults,
  });

  const tipo = useWatch({ control, name: 'tipo' });
  const interna = tipo === 'INTERNA';

  const cerrar = () => {
    reset(referenciaFormDefaults);
    onClose();
  };

  const onSubmit = async (v: ReferenciaFormValues) => {
    try {
      const referencia = await crear.mutateAsync({
        consultaId,
        payload: {
          tipo: v.tipo,
          medico_destino_id: v.tipo === 'INTERNA' ? v.medico_destino_id : undefined,
          destino: v.tipo === 'EXTERNA' ? v.destino : undefined,
          especialidad_destino: v.especialidad_destino || undefined,
          motivo: v.motivo,
          resumen_clinico: v.resumen_clinico || undefined,
        },
      });
      toast.success('Referencia generada.');
      reset(referenciaFormDefaults);
      onCreada(referencia);
    } catch (error) {
      setError('root', { message: extraerMensajeError(error, 'No se pudo generar la referencia.') });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={cerrar}
      title="Referencia médica"
      subtitle={pacienteNombre ? `Para ${pacienteNombre}` : undefined}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={cerrar} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button icon="ri-share-forward-line" onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
            Generar referencia
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {errors.root && (
          <div className="rounded-field border border-danger/30 bg-danger-soft p-3 text-xs text-danger">
            {errors.root.message}
          </div>
        )}

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {TIPOS.map((t) => (
            <button
              key={t.valor}
              type="button"
              onClick={() => setValue('tipo', t.valor)}
              className={cn(
                'cursor-pointer rounded-field border p-3 text-left transition-colors',
                tipo === t.valor
                  ? 'border-brand-600 bg-brand-50 ring-2 ring-brand-600/20'
                  : 'border-line bg-surface hover:bg-canvas',
              )}
            >
              <p className="text-sm font-bold text-ink">{t.titulo}</p>
              <p className="mt-0.5 text-xs text-muted">{t.detalle}</p>
            </button>
          ))}
        </div>

        {interna ? (
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink">
              Médico de la policlínica <span className="text-danger">*</span>
            </label>
            <select {...register('medico_destino_id')} className={CLASE_INPUT} disabled={cargandoMedicos}>
              <option value="">{cargandoMedicos ? 'Cargando médicos…' : 'Selecciona un médico…'}</option>
              {medicos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                  {m.especialidades.length > 0 ? ` — ${m.especialidades.join(', ')}` : ''}
                </option>
              ))}
            </select>
            {errors.medico_destino_id && (
              <p className="mt-1 text-xs text-danger">{errors.medico_destino_id.message}</p>
            )}
          </div>
        ) : (
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink">
              Especialista o institución <span className="text-danger">*</span>
            </label>
            <input
              {...register('destino')}
              placeholder="Ej. Dr. Juan Pérez, Hospital Nacional Francisco Menéndez"
              className={CLASE_INPUT}
            />
            {errors.destino && <p className="mt-1 text-xs text-danger">{errors.destino.message}</p>}
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-semibold text-ink">Especialidad (opcional)</label>
          <input {...register('especialidad_destino')} placeholder="Ej. Otorrinolaringología" className={CLASE_INPUT} />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-ink">
            Motivo de la referencia <span className="text-danger">*</span>
          </label>
          <textarea
            {...register('motivo')}
            rows={3}
            placeholder="Ej. Valoración por faringitis recurrente."
            className={CLASE_AREA}
          />
          {errors.motivo && <p className="mt-1 text-xs text-danger">{errors.motivo.message}</p>}
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-ink">
            {interna ? 'Nota para el médico receptor (opcional)' : 'Información clínica para el especialista'}{' '}
            {!interna && <span className="text-danger">*</span>}
          </label>
          <textarea
            {...register('resumen_clinico')}
            rows={interna ? 3 : 6}
            placeholder={
              interna
                ? 'El médico receptor verá el expediente completo en el documento.'
                : 'Resumen del caso: antecedentes relevantes, hallazgos, tratamiento recibido…'
            }
            className={CLASE_AREA}
          />
          {errors.resumen_clinico && (
            <p className="mt-1 text-xs text-danger">{errors.resumen_clinico.message}</p>
          )}
        </div>
      </form>
    </Modal>
  );
}

export default ReferenciaModal;
