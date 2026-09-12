import { useState } from 'react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { useGuardarSignosVitales } from '@/hooks/cita/useCitas';
import type { Cita, SignosVitales } from '@/types/cita.types';

interface SignosVitalesModalProps {
  isOpen: boolean;
  onClose: () => void;
  cita: Cita | null;
}

const CLASE_INPUT =
  'h-10 w-full rounded-field border border-line bg-surface px-3 pr-14 text-sm text-ink outline-none ' +
  'transition-colors placeholder:text-muted focus:border-brand-600 focus:ring-4 ' +
  'focus:ring-brand-600/15 disabled:opacity-60';

export function SignosVitalesModal({ isOpen, onClose, cita }: SignosVitalesModalProps) {
  if (!isOpen || !cita) return null;

  return <SignosVitalesModalContent cita={cita} onClose={onClose} />;
}

function SignosVitalesModalContent({ cita, onClose }: { cita: Cita; onClose: () => void }) {
  const previos = cita.signos_vitales;

  const [sistolica, setSistolica] = useState<string>(previos?.presion_sistolica?.toString() ?? '');
  const [diastolica, setDiastolica] = useState<string>(
    previos?.presion_diastolica?.toString() ?? '',
  );
  const [frecCardiaca, setFrecCardiaca] = useState<string>(
    previos?.frecuencia_cardiaca?.toString() ?? '',
  );
  const [frecRespiratoria, setFrecRespiratoria] = useState<string>(
    previos?.frecuencia_respiratoria?.toString() ?? '',
  );
  const [temperatura, setTemperatura] = useState<string>(
    previos?.temperatura_c?.toString() ?? '',
  );
  const [peso, setPeso] = useState<string>(previos?.peso_kg?.toString() ?? '');
  const [talla, setTalla] = useState<string>(previos?.talla_cm?.toString() ?? '');
  const [saturacion, setSaturacion] = useState<string>(
    previos?.saturacion_oxigeno?.toString() ?? '',
  );
  const [observaciones, setObservaciones] = useState<string>(previos?.observaciones ?? '');

  const [error, setError] = useState<string | null>(null);

  const guardarMutation = useGuardarSignosVitales();

  // Cálculo de IMC en tiempo real
  const pesoNum = parseFloat(peso);
  const tallaNum = parseFloat(talla);
  let imcCalculado: number | null = null;
  let imcEtiqueta = '';
  let imcColor = '';

  if (!isNaN(pesoNum) && pesoNum > 0 && !isNaN(tallaNum) && tallaNum > 0) {
    const tallaM = tallaNum / 100;
    imcCalculado = Number((pesoNum / (tallaM * tallaM)).toFixed(1));

    if (imcCalculado < 18.5) {
      imcEtiqueta = 'Bajo peso';
      imcColor = 'bg-amber-100 text-amber-800 border-amber-300';
    } else if (imcCalculado < 25) {
      imcEtiqueta = 'Normal';
      imcColor = 'bg-emerald-100 text-emerald-800 border-emerald-300';
    } else if (imcCalculado < 30) {
      imcEtiqueta = 'Sobrepeso';
      imcColor = 'bg-amber-100 text-amber-800 border-amber-300';
    } else {
      imcEtiqueta = 'Obesidad';
      imcColor = 'bg-rose-100 text-rose-800 border-rose-300';
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Parsear valores
    const datos: SignosVitales = {};

    if (sistolica) {
      const val = parseInt(sistolica, 10);
      if (isNaN(val) || val < 40 || val > 300) {
        setError('La presión sistólica debe ser un valor válido (40 - 300 mmHg).');
        return;
      }
      datos.presion_sistolica = val;
    }

    if (diastolica) {
      const val = parseInt(diastolica, 10);
      if (isNaN(val) || val < 30 || val > 200) {
        setError('La presión diastólica debe ser un valor válido (30 - 200 mmHg).');
        return;
      }
      datos.presion_diastolica = val;
    }

    if (datos.presion_sistolica !== undefined && datos.presion_diastolica !== undefined) {
      if (datos.presion_sistolica <= datos.presion_diastolica) {
        setError('La presión sistólica debe ser mayor que la presión diastólica.');
        return;
      }
    }

    if (frecCardiaca) {
      const val = parseInt(frecCardiaca, 10);
      if (isNaN(val) || val < 30 || val > 250) {
        setError('La frecuencia cardíaca debe ser un valor válido (30 - 250 lpm).');
        return;
      }
      datos.frecuencia_cardiaca = val;
    }

    if (frecRespiratoria) {
      const val = parseInt(frecRespiratoria, 10);
      if (isNaN(val) || val < 8 || val > 80) {
        setError('La frecuencia respiratoria debe ser un valor válido (8 - 80 rpm).');
        return;
      }
      datos.frecuencia_respiratoria = val;
    }

    if (temperatura) {
      const val = parseFloat(temperatura);
      if (isNaN(val) || val < 30 || val > 45) {
        setError('La temperatura debe estar en el rango de 30.0 a 45.0 °C.');
        return;
      }
      datos.temperatura_c = val;
    }

    if (peso) {
      const val = parseFloat(peso);
      if (isNaN(val) || val <= 0 || val > 400) {
        setError('El peso debe ser un número positivo válido en kilogramos.');
        return;
      }
      datos.peso_kg = val;
    }

    if (talla) {
      const val = parseFloat(talla);
      if (isNaN(val) || val <= 0 || val > 260) {
        setError('La talla debe ser un número positivo válido en centímetros.');
        return;
      }
      datos.talla_cm = val;
    }

    if (saturacion) {
      const val = parseInt(saturacion, 10);
      if (isNaN(val) || val < 50 || val > 100) {
        setError('La saturación de oxígeno debe estar entre 50% y 100%.');
        return;
      }
      datos.saturacion_oxigeno = val;
    }

    if (observaciones.trim()) {
      datos.observaciones = observaciones.trim();
    }

    // Verificar que al menos un signo vital fue capturado
    const tieneSignos =
      datos.presion_sistolica !== undefined ||
      datos.presion_diastolica !== undefined ||
      datos.frecuencia_cardiaca !== undefined ||
      datos.frecuencia_respiratoria !== undefined ||
      datos.temperatura_c !== undefined ||
      datos.peso_kg !== undefined ||
      datos.talla_cm !== undefined ||
      datos.saturacion_oxigeno !== undefined;

    if (!tieneSignos) {
      setError('Por favor ingrese al menos una constante o signo vital.');
      return;
    }

    try {
      await guardarMutation.mutateAsync({ id: cita.id, datos });
      toast.success(`Signos vitales registrados con éxito para ${cita.pacienteNombre}`);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar los signos vitales.';
      setError(msg);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Toma de Signos Vitales (Triaje)"
      subtitle={`Paciente: ${cita.pacienteNombre} (${cita.pacienteExpediente}) • Médico: ${cita.medicoNombre}`}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={guardarMutation.isPending}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="form-signos-vitales"
            loading={guardarMutation.isPending}
            icon="ri-heart-pulse-line"
          >
            Guardar Signos Vitales
          </Button>
        </>
      }
    >
      <form id="form-signos-vitales" onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Banner de información del paciente */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-field bg-brand-50/70 p-3 text-xs text-brand-900 border border-brand-100">
          <div className="flex items-center gap-2">
            <i className="ri-user-heart-line text-base text-brand-600" />
            <span className="font-semibold">{cita.pacienteNombre}</span>
            <span className="text-brand-600 font-mono">[{cita.pacienteExpediente}]</span>
          </div>
          <div className="text-muted">
            Hora de cita: <span className="font-semibold text-ink">{cita.hora_inicio}</span>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-field bg-danger-soft px-3 py-2 text-xs text-danger"
          >
            <i className="ri-error-warning-line mt-0.5 shrink-0 text-sm" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Presión Sistólica */}
          <div>
            <label htmlFor="presion_sistolica" className="mb-1 block text-xs font-semibold text-ink">
              Presión Sistólica
            </label>
            <div className="relative">
              <input
                id="presion_sistolica"
                type="number"
                step="1"
                min="40"
                max="300"
                placeholder="120"
                value={sistolica}
                onChange={(e) => setSistolica(e.target.value)}
                className={CLASE_INPUT}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted">
                mmHg
              </span>
            </div>
          </div>

          {/* Presión Diastólica */}
          <div>
            <label htmlFor="presion_diastolica" className="mb-1 block text-xs font-semibold text-ink">
              Presión Diastólica
            </label>
            <div className="relative">
              <input
                id="presion_diastolica"
                type="number"
                step="1"
                min="30"
                max="200"
                placeholder="80"
                value={diastolica}
                onChange={(e) => setDiastolica(e.target.value)}
                className={CLASE_INPUT}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted">
                mmHg
              </span>
            </div>
          </div>

          {/* Frecuencia Cardíaca */}
          <div>
            <label htmlFor="frecuencia_cardiaca" className="mb-1 block text-xs font-semibold text-ink">
              Frecuencia Cardíaca
            </label>
            <div className="relative">
              <input
                id="frecuencia_cardiaca"
                type="number"
                step="1"
                min="30"
                max="250"
                placeholder="75"
                value={frecCardiaca}
                onChange={(e) => setFrecCardiaca(e.target.value)}
                className={CLASE_INPUT}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted">
                lpm
              </span>
            </div>
          </div>

          {/* Frecuencia Respiratoria */}
          <div>
            <label htmlFor="frecuencia_respiratoria" className="mb-1 block text-xs font-semibold text-ink">
              Frecuencia Respiratoria
            </label>
            <div className="relative">
              <input
                id="frecuencia_respiratoria"
                type="number"
                step="1"
                min="8"
                max="80"
                placeholder="18"
                value={frecRespiratoria}
                onChange={(e) => setFrecRespiratoria(e.target.value)}
                className={CLASE_INPUT}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted">
                rpm
              </span>
            </div>
          </div>

          {/* Temperatura en Centígrados */}
          <div>
            <label htmlFor="temperatura_c" className="mb-1 block text-xs font-semibold text-ink">
              Temperatura (Centígrados)
            </label>
            <div className="relative">
              <input
                id="temperatura_c"
                type="number"
                step="0.1"
                min="30"
                max="45"
                placeholder="36.5"
                value={temperatura}
                onChange={(e) => setTemperatura(e.target.value)}
                className={CLASE_INPUT}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-brand-600">
                °C
              </span>
            </div>
          </div>

          {/* Saturación de Oxígeno */}
          <div>
            <label htmlFor="saturacion_oxigeno" className="mb-1 block text-xs font-semibold text-ink">
              Saturación de Oxígeno
            </label>
            <div className="relative">
              <input
                id="saturacion_oxigeno"
                type="number"
                step="1"
                min="50"
                max="100"
                placeholder="98"
                value={saturacion}
                onChange={(e) => setSaturacion(e.target.value)}
                className={CLASE_INPUT}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted">
                % SpO2
              </span>
            </div>
          </div>

          {/* Peso */}
          <div>
            <label htmlFor="peso_kg" className="mb-1 block text-xs font-semibold text-ink">
              Peso (kg)
            </label>
            <div className="relative">
              <input
                id="peso_kg"
                type="number"
                step="0.1"
                min="1"
                max="400"
                placeholder="70.5"
                value={peso}
                onChange={(e) => setPeso(e.target.value)}
                className={CLASE_INPUT}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted">
                kg
              </span>
            </div>
          </div>

          {/* Talla */}
          <div>
            <label htmlFor="talla_cm" className="mb-1 block text-xs font-semibold text-ink">
              Talla (cm)
            </label>
            <div className="relative">
              <input
                id="talla_cm"
                type="number"
                step="0.5"
                min="30"
                max="250"
                placeholder="170"
                value={talla}
                onChange={(e) => setTalla(e.target.value)}
                className={CLASE_INPUT}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted">
                cm
              </span>
            </div>
          </div>
        </div>

        {/* Tarjeta de Cálculo de IMC en Vivo */}
        {imcCalculado !== null && (
          <div className="flex items-center justify-between rounded-field border border-line bg-canvas p-3">
            <div className="flex items-center gap-2">
              <i className="ri-calculator-line text-lg text-muted" />
              <div>
                <p className="text-xs font-medium text-muted">Índice de Masa Corporal (IMC)</p>
                <p className="text-sm font-bold text-ink">
                  {imcCalculado} <span className="text-xs font-normal text-muted">kg/m²</span>
                </p>
              </div>
            </div>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${imcColor}`}
            >
              {imcEtiqueta}
            </span>
          </div>
        )}

        {/* Observaciones adicionales */}
        <div>
          <label htmlFor="observaciones" className="mb-1 block text-xs font-semibold text-ink">
            Observaciones y notas de triaje (opcional)
          </label>
          <textarea
            id="observaciones"
            rows={2}
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Sintomatología de ingreso, alergias reportadas o condiciones relevantes..."
            className="w-full rounded-field border border-line bg-surface p-2.5 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15"
          />
        </div>
      </form>
    </Modal>
  );
}

export default SignosVitalesModal;
