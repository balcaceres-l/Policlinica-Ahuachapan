import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import CronometroConsulta from '@/components/medico/CronometroConsulta';
import HistorialClinicoCompleto from '@/components/expediente/HistorialClinicoCompleto';
import { useGuardarSignosVitales } from '@/hooks/cita/useCitas';
import {
  consultaKeys,
  useActualizarConsulta,
  useConsulta,
  useFinalizarConsulta,
} from '@/hooks/medico/useConsultas';
import type { GuardarConsultaPayload } from '@/services/medico/consulta.service';


const inputClase =
  'mt-1 w-full rounded-field border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-brand-600 focus:ring-4 focus:ring-brand-600/10 disabled:bg-canvas disabled:text-muted';

const REGIONES_PREDETERMINADAS = [
  'Cabeza y Cuello',
  'Tórax / Cardiopulmonar',
  'Abdomen',
  'Extremidades',
  'Neurológico',
  'Piel y Faneras',
];

const VIAS_ADMINISTRACION = [
  'Oral',
  'Intravenosa',
  'Intramuscular',
  'Subcutánea',
  'Tópica',
  'Oftálmica',
  'Ótica',
  'Nasal',
  'Inhalatoria',
  'Sublingual',
  'Rectal',
  'Otra',
];

interface ExamenFisicoLocal {
  id?: string;
  region_anatomica: string;
  hallazgos: string;
}

interface DetalleRecetaLocal {
  id?: string;
  nombre_medicamento: string;
  dosis: string;
  via_administracion: string;
  frecuencia: string;
  duracion: string;
  indicaciones: string;
}

export default function ConsultaPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: consulta, isLoading, isError, error } = useConsulta(id);
  const actualizarMutation = useActualizarConsulta();
  const finalizarMutation = useFinalizarConsulta();
  const guardarSignosMutation = useGuardarSignosVitales();

  // Estados de formulario clínico
  const [motivoConsulta, setMotivoConsulta] = useState('');
  const [notasAdicionales, setNotasAdicionales] = useState('');
  const [precio, setPrecio] = useState<number | ''>('');
  const [total, setTotal] = useState<number | ''>('');
  const [segundosTranscurridos, setSegundosTranscurridos] = useState<number>(0);
  const segundosRef = useRef<number>(0);
  const [enPausa, setEnPausa] = useState<boolean>(false);

  // Exámenes físicos
  const [examenesFisicos, setExamenesFisicos] = useState<ExamenFisicoLocal[]>([]);

  // Plan de manejo
  const [planDescripcion, setPlanDescripcion] = useState('');
  const [planIndicaciones, setPlanIndicaciones] = useState('');

  // Receta médica
  const [recetaObservaciones, setRecetaObservaciones] = useState('');
  const [recetaDetalles, setRecetaDetalles] = useState<DetalleRecetaLocal[]>([]);

  // Signos vitales (Triaje clínico)
  const [signosForm, setSignosForm] = useState({
    presion_sistolica: '',
    presion_diastolica: '',
    frecuencia_cardiaca: '',
    frecuencia_respiratoria: '',
    temperatura_c: '',
    peso_kg: '',
    talla_cm: '',
    saturacion_oxigeno: '',
    observaciones: '',
  });

  // Modales y confirmación
  const [modalFinalizarAbierto, setModalFinalizarAbierto] = useState(false);
  const [guardandoFinalizar, setGuardandoFinalizar] = useState(false);
  const [guardandoSignos, setGuardandoSignos] = useState(false);

  // Inicializar o sincronizar el estado cuando cargue la consulta
  useEffect(() => {
    if (!consulta) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMotivoConsulta(consulta.motivo_consulta ?? '');
    setNotasAdicionales(consulta.notas_adicionales ?? '');
    setPrecio(consulta.precio !== null && consulta.precio !== undefined ? consulta.precio : '');
    setTotal(consulta.total !== null && consulta.total !== undefined ? consulta.total : '');
    const segs = consulta.segundos_transcurridos ?? 0;
    segundosRef.current = segs;
    setSegundosTranscurridos(segs);
    setEnPausa(consulta.en_pausa ?? false);

    if (consulta.examenes_fisicos && consulta.examenes_fisicos.length > 0) {
      setExamenesFisicos(
        consulta.examenes_fisicos.map((ef) => ({
          id: ef.id,
          region_anatomica: ef.region_anatomica ?? '',
          hallazgos: ef.hallazgos ?? '',
        })),
      );
    } else {
      setExamenesFisicos([{ region_anatomica: 'Examen General', hallazgos: '' }]);
    }

    setPlanDescripcion(consulta.plan_manejo?.descripcion ?? '');
    setPlanIndicaciones(consulta.plan_manejo?.indicaciones ?? '');

    setRecetaObservaciones(consulta.receta?.observaciones_generales ?? '');
    if (consulta.receta?.detalles && consulta.receta.detalles.length > 0) {
      setRecetaDetalles(
        consulta.receta.detalles.map((d) => ({
          id: d.id,
          nombre_medicamento: d.nombre_medicamento,
          dosis: d.dosis,
          via_administracion: d.via_administracion ?? 'Oral',
          frecuencia: d.frecuencia,
          duracion: d.duracion ?? '',
          indicaciones: d.indicaciones ?? '',
        })),
      );
    } else {
      setRecetaDetalles([]);
    }

    if (consulta.signos_vitales) {
      setSignosForm({
        presion_sistolica:
          consulta.signos_vitales.presion_sistolica !== null &&
          consulta.signos_vitales.presion_sistolica !== undefined
            ? String(consulta.signos_vitales.presion_sistolica)
            : '',
        presion_diastolica:
          consulta.signos_vitales.presion_diastolica !== null &&
          consulta.signos_vitales.presion_diastolica !== undefined
            ? String(consulta.signos_vitales.presion_diastolica)
            : '',
        frecuencia_cardiaca:
          consulta.signos_vitales.frecuencia_cardiaca !== null &&
          consulta.signos_vitales.frecuencia_cardiaca !== undefined
            ? String(consulta.signos_vitales.frecuencia_cardiaca)
            : '',
        frecuencia_respiratoria:
          consulta.signos_vitales.frecuencia_respiratoria !== null &&
          consulta.signos_vitales.frecuencia_respiratoria !== undefined
            ? String(consulta.signos_vitales.frecuencia_respiratoria)
            : '',
        temperatura_c:
          consulta.signos_vitales.temperatura_c !== null &&
          consulta.signos_vitales.temperatura_c !== undefined
            ? String(consulta.signos_vitales.temperatura_c)
            : '',
        peso_kg:
          consulta.signos_vitales.peso_kg !== null &&
          consulta.signos_vitales.peso_kg !== undefined
            ? String(consulta.signos_vitales.peso_kg)
            : '',
        talla_cm:
          consulta.signos_vitales.talla_cm !== null &&
          consulta.signos_vitales.talla_cm !== undefined
            ? String(consulta.signos_vitales.talla_cm)
            : '',
        saturacion_oxigeno:
          consulta.signos_vitales.saturacion_oxigeno !== null &&
          consulta.signos_vitales.saturacion_oxigeno !== undefined
            ? String(consulta.signos_vitales.saturacion_oxigeno)
            : '',
        observaciones: consulta.signos_vitales.observaciones ?? '',
      });
    }
  }, [consulta]);

  if (isLoading) {
    return <LoadingSpinner label="Cargando datos de la consulta..." className="py-24" />;
  }

  if (isError || !consulta) {
    return (
      <div className="mx-auto max-w-xl rounded-card border border-danger/20 bg-danger-soft p-6 text-center">
        <i className="ri-error-warning-line text-3xl text-danger mb-2 block" />
        <h2 className="text-lg font-bold text-ink">Consulta no encontrada</h2>
        <p className="mt-1 text-sm text-muted">
          {error instanceof Error
            ? error.message
            : 'No se pudo acceder a la consulta especificada.'}
        </p>
        <Link
          to="/medico/sala-espera"
          className="mt-4 inline-flex items-center gap-2 rounded-field bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <i className="ri-arrow-left-line" />
          Volver a la lista de espera
        </Link>
      </div>
    );
  }

  const activa = consulta.abierta;
  const inicioMs = useMemo(
    () => (consulta.fecha_hora_inicio ? Date.parse(consulta.fecha_hora_inicio) : 0),
    [consulta.fecha_hora_inicio],
  );
  const finMs = consulta.fecha_hora_fin ? Date.parse(consulta.fecha_hora_fin) : undefined;

  // Cálculo dinámico de IMC
  const pesoNum = Number(signosForm.peso_kg);
  const tallaNum = Number(signosForm.talla_cm) / 100;
  const imcCalculado =
    pesoNum > 0 && tallaNum > 0 ? (pesoNum / (tallaNum * tallaNum)).toFixed(1) : null;

  const imcClasificacion = (imc: number) => {
    if (imc < 18.5) return { texto: 'Bajo peso', estilo: 'text-amber-700 bg-amber-50' };
    if (imc < 25) return { texto: 'Normal', estilo: 'text-emerald-700 bg-emerald-50' };
    if (imc < 30) return { texto: 'Sobrepeso', estilo: 'text-orange-700 bg-orange-50' };
    return { texto: 'Obesidad', estilo: 'text-red-700 bg-red-50' };
  };

  // Manejo de Exámenes Físicos
  const agregarExamen = (region = '') => {
    setExamenesFisicos((prev) => [...prev, { region_anatomica: region, hallazgos: '' }]);
  };

  const actualizarExamen = (
    index: number,
    campo: keyof ExamenFisicoLocal,
    valor: string,
  ) => {
    setExamenesFisicos((prev) => {
      const copia = [...prev];
      copia[index] = { ...copia[index], [campo]: valor };
      return copia;
    });
  };

  const eliminarExamen = (index: number) => {
    setExamenesFisicos((prev) => prev.filter((_, i) => i !== index));
  };

  // Manejo de Receta Médica
  const agregarMedicamento = () => {
    setRecetaDetalles((prev) => [
      ...prev,
      {
        nombre_medicamento: '',
        dosis: '',
        via_administracion: 'Oral',
        frecuencia: '',
        duracion: '',
        indicaciones: '',
      },
    ]);
  };

  const actualizarMedicamento = (
    index: number,
    campo: keyof DetalleRecetaLocal,
    valor: string,
  ) => {
    setRecetaDetalles((prev) => {
      const copia = [...prev];
      copia[index] = { ...copia[index], [campo]: valor };
      return copia;
    });
  };

  const eliminarMedicamento = (index: number) => {
    setRecetaDetalles((prev) => prev.filter((_, i) => i !== index));
  };

  // Guardar signos vitales desde la consulta
  const handleGuardarSignos = async () => {
    setGuardandoSignos(true);
    try {
      await guardarSignosMutation.mutateAsync({
        id: consulta.cita_id,
        datos: {
          presion_sistolica: signosForm.presion_sistolica
            ? Number(signosForm.presion_sistolica)
            : null,
          presion_diastolica: signosForm.presion_diastolica
            ? Number(signosForm.presion_diastolica)
            : null,
          frecuencia_cardiaca: signosForm.frecuencia_cardiaca
            ? Number(signosForm.frecuencia_cardiaca)
            : null,
          frecuencia_respiratoria: signosForm.frecuencia_respiratoria
            ? Number(signosForm.frecuencia_respiratoria)
            : null,
          temperatura_c: signosForm.temperatura_c
            ? Number(signosForm.temperatura_c)
            : null,
          peso_kg: signosForm.peso_kg ? Number(signosForm.peso_kg) : null,
          talla_cm: signosForm.talla_cm ? Number(signosForm.talla_cm) : null,
          saturacion_oxigeno: signosForm.saturacion_oxigeno
            ? Number(signosForm.saturacion_oxigeno)
            : null,
          observaciones: signosForm.observaciones.trim() || null,
        },
      });
      await queryClient.invalidateQueries({ queryKey: consultaKeys.detalle(id) });
      toast.success('Signos vitales guardados correctamente');
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : 'Error al guardar signos vitales',
      );
    } finally {
      setGuardandoSignos(false);
    }
  };

  // Construir payload limpio para guardar/actualizar
  const construirPayload = (opciones?: {
    en_pausa?: boolean;
    segundos_transcurridos?: number;
  }): GuardarConsultaPayload => {
    const efLimpios = examenesFisicos.filter(
      (ef) => ef.region_anatomica.trim() !== '' || ef.hallazgos.trim() !== '',
    );

    const recetaLimpia = recetaDetalles
      .filter((d) => d.nombre_medicamento.trim() !== '')
      .map((d) => ({
        nombre_medicamento: d.nombre_medicamento.trim(),
        dosis: d.dosis.trim() || '1 dosis',
        via_administracion: d.via_administracion || 'Oral',
        frecuencia: d.frecuencia.trim() || 'Según indicación médica',
        duracion: d.duracion.trim() || null,
        indicaciones: d.indicaciones.trim() || null,
      }));

    const tienePlan = planDescripcion.trim() !== '' || planIndicaciones.trim() !== '';
    const tieneReceta = recetaLimpia.length > 0 || recetaObservaciones.trim() !== '';

    const segs =
      opciones?.segundos_transcurridos !== undefined
        ? Math.round(opciones.segundos_transcurridos)
        : Math.round(segundosRef.current);

    return {
      motivo_consulta: motivoConsulta.trim() || null,
      notas_adicionales: notasAdicionales.trim() || null,
      precio: precio !== '' ? Number(precio) : null,
      total: total !== '' ? Number(total) : (precio !== '' ? Number(precio) : null),
      segundos_transcurridos: segs,
      en_pausa: opciones?.en_pausa !== undefined ? opciones.en_pausa : enPausa,
      examenes_fisicos: efLimpios.length > 0 ? efLimpios : undefined,
      plan_manejo: tienePlan
        ? {
            descripcion: planDescripcion.trim() || null,
            indicaciones: planIndicaciones.trim() || null,
          }
        : null,
      receta: tieneReceta
        ? {
            observaciones_generales: recetaObservaciones.trim() || null,
            detalles: recetaLimpia,
          }
        : null,
    };
  };

  // Guardar borrador / progreso sin salir
  const handleGuardarProgreso = async () => {
    try {
      const payload = construirPayload();
      await actualizarMutation.mutateAsync({ id, payload });
      toast.success('Progreso de la consulta guardado');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      toast.error(
        axiosErr?.response?.data?.message ||
          (err instanceof Error ? err.message : 'Error al guardar el progreso'),
      );
    }
  };

  // Pausar y Salir a la lista de espera
  const handleGuardarYSalir = async () => {
    try {
      const segsActuales = Math.round(segundosRef.current);
      setSegundosTranscurridos(segsActuales);
      setEnPausa(true);
      const payload = construirPayload({
        en_pausa: true,
        segundos_transcurridos: segsActuales,
      });
      await actualizarMutation.mutateAsync({ id, payload });
      toast.success(
        'Consulta guardada y pausada. Puedes retomarla en cualquier momento desde la sala de espera.',
      );
      navigate('/medico/sala-espera');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      toast.error(
        axiosErr?.response?.data?.message ||
          (err instanceof Error ? err.message : 'Error al guardar la consulta'),
      );
    }
  };

  // Alternar pausa del cronómetro
  const handleTogglePausa = async () => {
    const nuevaPausa = !enPausa;
    const segsActuales = Math.round(segundosRef.current);
    setSegundosTranscurridos(segsActuales);
    setEnPausa(nuevaPausa);
    try {
      const payload = construirPayload({
        en_pausa: nuevaPausa,
        segundos_transcurridos: segsActuales,
      });
      await actualizarMutation.mutateAsync({ id, payload });
      if (nuevaPausa) {
        toast('Consulta pausada. El cronómetro se ha detenido.', { icon: '⏸️' });
      } else {
        toast('Consulta reanudada. El cronómetro sigue avanzando.', { icon: '▶️' });
      }
    } catch {
      setEnPausa(!nuevaPausa);
    }
  };

  // Confirmar y finalizar la consulta
  const handleConfirmarFinalizar = async () => {
    if (guardandoFinalizar) return;
    setGuardandoFinalizar(true);

    try {
      const segsActuales = Math.round(segundosRef.current);

      // 1. Guardar todos los datos clínicos actuales
      const payload = construirPayload({
        en_pausa: false,
        segundos_transcurridos: segsActuales,
      });
      await actualizarMutation.mutateAsync({ id, payload });

      // 2. Finalizar la consulta y cambiar la cita a ATENDIDA
      await finalizarMutation.mutateAsync({
        id,
        payload: {
          notas_adicionales: notasAdicionales.trim() || null,
          precio: precio !== '' ? Number(precio) : null,
          total: total !== '' ? Number(total) : (precio !== '' ? Number(precio) : null),
          segundos_transcurridos: segsActuales,
        },
      });

      toast.success('Consulta finalizada con éxito. Paciente marcado como ATENDIDO.');
      setModalFinalizarAbierto(false);
      navigate('/medico/sala-espera');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { message?: string } } };
      // Si el backend responde 422 indicando que ya fue cerrada, es un caso de éxito
      if (
        axiosErr?.response?.status === 422 &&
        axiosErr?.response?.data?.message?.includes('cerrada')
      ) {
        toast.success('Consulta finalizada con éxito.');
        setModalFinalizarAbierto(false);
        navigate('/medico/sala-espera');
        return;
      }

      toast.error(
        axiosErr?.response?.data?.message ||
          (err instanceof Error ? err.message : 'Error al finalizar la consulta'),
      );
    } finally {
      setGuardandoFinalizar(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-16">
      {/* Barra de navegación superior */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <Link
          to="/medico/sala-espera"
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-900 transition-colors"
        >
          <i className="ri-arrow-left-line" />
          Volver a sala de espera
        </Link>

        <div className="flex items-center gap-2">
          {activa ? (
            enPausa ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
                <i className="ri-pause-circle-line" />
                Consulta en Pausa
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 animate-pulse">
                <span className="size-2 rounded-full bg-blue-600" />
                Consulta Activa
              </span>
            )
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
              <i className="ri-checkbox-circle-line" />
              Consulta Finalizada
            </span>
          )}
        </div>
      </div>

      {/* Encabezado con datos del paciente */}
      <header className="flex flex-wrap items-start justify-between gap-4 rounded-card border border-line bg-surface p-5 shadow-card">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-brand-600">
            Atención Médica · {consulta.especialidadNombre ?? 'Consulta General'}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-ink">
            {consulta.paciente?.nombre ?? 'Paciente sin nombre'}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Expediente: <span className="font-mono font-semibold text-ink">{consulta.paciente?.expediente ?? 'S/N'}</span>
            {' · '}
            Médico tratante: <span className="font-medium text-ink">{consulta.medicoNombre ?? 'Dr.'}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {consulta.paciente?.id && (
            <Link
              to={`/medico/expediente/${consulta.paciente.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-field border border-line bg-surface px-4 py-2 text-xs font-semibold text-brand-700 shadow-sm transition-colors hover:bg-brand-50"
            >
              <i className="ri-history-line text-sm" />
              Ver Expediente Clínico
              <i className="ri-external-link-line text-xs" />
            </Link>
          )}

          {activa && (
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                icon="ri-pause-circle-line"
                size="sm"
                loading={actualizarMutation.isPending}
                onClick={handleGuardarYSalir}
                title="Guarda los datos, detiene el cronómetro y regresa a la sala de espera"
              >
                Pausar y Salir
              </Button>

              <Button
                variant="secondary"
                icon="ri-save-line"
                size="sm"
                loading={actualizarMutation.isPending}
                onClick={handleGuardarProgreso}
              >
                Guardar Progreso
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Aviso si la consulta está en pausa */}
      {activa && enPausa && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-amber-200 text-amber-900 text-lg">
              <i className="ri-pause-fill" />
            </span>
            <div>
              <p className="font-bold">Esta consulta se encuentra pausada.</p>
              <p className="text-xs text-amber-800 mt-0.5">
                El cronómetro está detenido en {Math.floor(segundosTranscurridos / 60)} min {segundosTranscurridos % 60} seg. Los datos ingresados están guardados.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            icon="ri-play-fill"
            onClick={handleTogglePausa}
          >
            Reanudar Tiempo
          </Button>
        </div>
      )}

      {/* Alerta si la consulta ya está finalizada */}
      {!activa && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-card border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
        >
          <i className="ri-information-line text-xl text-emerald-700 shrink-0" />
          <div>
            <p className="font-semibold">Esta consulta médica fue finalizada y archivada.</p>
            <p className="text-xs text-emerald-800 mt-0.5">
              Fecha de cierre: {consulta.fecha_hora_fin ? new Date(consulta.fecha_hora_fin).toLocaleString() : 'Completada'}. La información se muestra en modo de solo lectura.
            </p>
          </div>
        </div>
      )}

      {/* Grilla principal */}
      <div className="grid items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        {/* Columna lateral izquierda */}
        <aside className="space-y-5">
          {/* Cronómetro de atención */}
          <CronometroConsulta
            inicio={inicioMs}
            fin={finMs}
            activo={activa}
            segundosIniciales={segundosTranscurridos}
            enPausa={enPausa}
            onPausaToggle={activa ? handleTogglePausa : undefined}
            onTick={(segs) => {
              segundosRef.current = segs;
            }}
          />

          {/* Triaje y Signos Vitales */}
          <section className="rounded-card border border-line bg-surface p-5 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-ink flex items-center gap-2">
                <i className="ri-heart-pulse-line text-brand-600" />
                Signos Vitales (Triaje)
              </h2>
              {activa && (
                <Button
                  size="sm"
                  variant="secondary"
                  loading={guardandoSignos}
                  onClick={handleGuardarSignos}
                >
                  Guardar
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <label className="block font-medium text-muted">
                Presión Sistólica (mmHg)
                <input
                  type="number"
                  min="50"
                  max="300"
                  disabled={!activa}
                  className={inputClase}
                  placeholder="120"
                  value={signosForm.presion_sistolica}
                  onChange={(e) =>
                    setSignosForm({ ...signosForm, presion_sistolica: e.target.value })
                  }
                />
              </label>

              <label className="block font-medium text-muted">
                Presión Diastólica (mmHg)
                <input
                  type="number"
                  min="30"
                  max="200"
                  disabled={!activa}
                  className={inputClase}
                  placeholder="80"
                  value={signosForm.presion_diastolica}
                  onChange={(e) =>
                    setSignosForm({ ...signosForm, presion_diastolica: e.target.value })
                  }
                />
              </label>

              <label className="block font-medium text-muted">
                Frec. Cardíaca (lpm)
                <input
                  type="number"
                  min="20"
                  max="250"
                  disabled={!activa}
                  className={inputClase}
                  placeholder="75"
                  value={signosForm.frecuencia_cardiaca}
                  onChange={(e) =>
                    setSignosForm({ ...signosForm, frecuencia_cardiaca: e.target.value })
                  }
                />
              </label>

              <label className="block font-medium text-muted">
                Frec. Respiratoria (rpm)
                <input
                  type="number"
                  min="5"
                  max="80"
                  disabled={!activa}
                  className={inputClase}
                  placeholder="18"
                  value={signosForm.frecuencia_respiratoria}
                  onChange={(e) =>
                    setSignosForm({ ...signosForm, frecuencia_respiratoria: e.target.value })
                  }
                />
              </label>

              <label className="block font-medium text-muted">
                Temperatura (°C)
                <input
                  type="number"
                  step="0.1"
                  min="30"
                  max="45"
                  disabled={!activa}
                  className={inputClase}
                  placeholder="36.5"
                  value={signosForm.temperatura_c}
                  onChange={(e) =>
                    setSignosForm({ ...signosForm, temperatura_c: e.target.value })
                  }
                />
              </label>

              <label className="block font-medium text-muted">
                Saturación SpO₂ (%)
                <input
                  type="number"
                  min="50"
                  max="100"
                  disabled={!activa}
                  className={inputClase}
                  placeholder="98"
                  value={signosForm.saturacion_oxigeno}
                  onChange={(e) =>
                    setSignosForm({ ...signosForm, saturacion_oxigeno: e.target.value })
                  }
                />
              </label>

              <label className="block font-medium text-muted">
                Peso (kg)
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="400"
                  disabled={!activa}
                  className={inputClase}
                  placeholder="70.0"
                  value={signosForm.peso_kg}
                  onChange={(e) =>
                    setSignosForm({ ...signosForm, peso_kg: e.target.value })
                  }
                />
              </label>

              <label className="block font-medium text-muted">
                Talla / Estatura (cm)
                <input
                  type="number"
                  step="0.5"
                  min="20"
                  max="250"
                  disabled={!activa}
                  className={inputClase}
                  placeholder="170"
                  value={signosForm.talla_cm}
                  onChange={(e) =>
                    setSignosForm({ ...signosForm, talla_cm: e.target.value })
                  }
                />
              </label>
            </div>

            {/* Tarjeta de IMC automático */}
            <div className="rounded-field border border-line bg-canvas p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-ink">Índice Masa Corporal:</span>
                {imcCalculado ? (
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-brand-700">{imcCalculado}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        imcClasificacion(Number(imcCalculado)).estilo
                      }`}
                    >
                      {imcClasificacion(Number(imcCalculado)).texto}
                    </span>
                  </div>
                ) : (
                  <span className="text-muted italic">Ingresa peso y talla</span>
                )}
              </div>
            </div>

            {/* Observaciones triaje */}
            <div>
              <label className="block text-xs font-medium text-muted">
                Observaciones del triaje
                <textarea
                  rows={2}
                  disabled={!activa}
                  className={inputClase}
                  placeholder="Notas de triaje o signos de alerta..."
                  value={signosForm.observaciones}
                  onChange={(e) =>
                    setSignosForm({ ...signosForm, observaciones: e.target.value })
                  }
                />
              </label>
            </div>
          </section>

          {/* Honorarios y Cobro */}
          <section className="rounded-card border border-line bg-surface p-5 shadow-card space-y-4">
            <h2 className="text-sm font-bold text-ink flex items-center gap-2">
              <i className="ri-money-dollar-circle-line text-emerald-600" />
              Honorarios y Cobro
            </h2>

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-ink">
                Precio de Consulta ($ USD)
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  disabled={!activa}
                  className={inputClase}
                  placeholder="Ej. 25.00"
                  value={precio}
                  onChange={(e) => {
                    const val = e.target.value === '' ? '' : Number(e.target.value);
                    setPrecio(val);
                    if (total === '' || total === precio) {
                      setTotal(val);
                    }
                  }}
                />
              </label>

              <label className="block text-xs font-semibold text-ink">
                Total a Cobrar ($ USD)
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  disabled={!activa}
                  className={inputClase}
                  placeholder="Ej. 25.00"
                  value={total}
                  onChange={(e) =>
                    setTotal(e.target.value === '' ? '' : Number(e.target.value))
                  }
                />
              </label>
            </div>
          </section>
        </aside>

        {/* Columna principal derecha: Expediente Clínico de la Consulta */}
        <main className="space-y-6">
          {/* HU-28 — historial clínico completo embebido en la consulta */}
          {consulta.paciente?.id && (
            <HistorialClinicoCompleto pacienteId={consulta.paciente.id} />
          )}

          {/* SECCIÓN 1: Motivo de Consulta y Anamnesis */}
          <section className="rounded-card border border-line bg-surface p-6 shadow-card space-y-4">
            <div className="flex items-center gap-2 border-b border-line pb-3">
              <span className="flex size-7 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                1
              </span>
              <h2 className="text-base font-bold text-ink">
                Motivo de Consulta y Anamnesis
              </h2>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-semibold text-ink">
                Motivo principal de consulta
                <input
                  type="text"
                  disabled={!activa}
                  className={inputClase}
                  placeholder="Ej. Fiebre de 3 días de evolución, tos seca y cefalea..."
                  value={motivoConsulta}
                  onChange={(e) => setMotivoConsulta(e.target.value)}
                />
              </label>

              <label className="block text-sm font-semibold text-ink">
                Anamnesis / Historia de la enfermedad actual y antecedentes
                <textarea
                  rows={4}
                  disabled={!activa}
                  className={inputClase}
                  placeholder="Detallar inicio, evolución de síntomas, antecedentes patológicos relevantes, alergias..."
                  value={notasAdicionales}
                  onChange={(e) => setNotasAdicionales(e.target.value)}
                />
              </label>
            </div>
          </section>

          {/* SECCIÓN 2: Examen Físico */}
          <section className="rounded-card border border-line bg-surface p-6 shadow-card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                  2
                </span>
                <div>
                  <h2 className="text-base font-bold text-ink">Examen Físico</h2>
                  <p className="text-xs text-muted">
                    Registro de hallazgos por región anatómica
                  </p>
                </div>
              </div>

              {activa && (
                <Button
                  size="sm"
                  variant="secondary"
                  icon="ri-add-line"
                  onClick={() => agregarExamen()}
                >
                  Agregar Región
                </Button>
              )}
            </div>

            {/* Accesos rápidos para agregar regiones */}
            {activa && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-muted font-medium">Regiones sugeridas:</span>
                {REGIONES_PREDETERMINADAS.map((reg) => (
                  <button
                    key={reg}
                    type="button"
                    className="rounded-full border border-line bg-canvas px-3 py-1 font-semibold text-muted hover:border-brand-600 hover:bg-brand-50 hover:text-brand-700 transition-colors"
                    onClick={() => agregarExamen(reg)}
                  >
                    + {reg}
                  </button>
                ))}
              </div>
            )}

            {/* Lista de regiones de examen físico */}
            <div className="space-y-3">
              {examenesFisicos.length === 0 ? (
                <p className="rounded-field border border-dashed border-line p-4 text-center text-xs text-muted italic">
                  No se han registrado hallazgos en el examen físico.
                </p>
              ) : (
                examenesFisicos.map((ef, idx) => (
                  <div
                    key={idx}
                    className="relative rounded-card border border-line bg-canvas p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <label className="text-xs font-bold text-ink block">
                          Región Anatómica
                          <input
                            type="text"
                            disabled={!activa}
                            className={inputClase}
                            placeholder="Ej. Cabeza y cuello, Abdomen, Tórax..."
                            value={ef.region_anatomica}
                            onChange={(e) =>
                              actualizarExamen(idx, 'region_anatomica', e.target.value)
                            }
                          />
                        </label>
                      </div>

                      {activa && (
                        <button
                          type="button"
                          className="mt-5 rounded-field p-2 text-muted hover:bg-danger-soft hover:text-danger transition-colors"
                          title="Eliminar región"
                          onClick={() => eliminarExamen(idx)}
                        >
                          <i className="ri-delete-bin-line text-base" />
                        </button>
                      )}
                    </div>

                    <label className="text-xs font-bold text-ink block">
                      Hallazgos Clínicos
                      <textarea
                        rows={2}
                        disabled={!activa}
                        className={inputClase}
                        placeholder="Ej. Blando, depresible, no doloroso a la palpación profunda, sin visceromegalias..."
                        value={ef.hallazgos}
                        onChange={(e) =>
                          actualizarExamen(idx, 'hallazgos', e.target.value)
                        }
                      />
                    </label>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* SECCIÓN 3: Plan de Manejo e Indicaciones */}
          <section className="rounded-card border border-line bg-surface p-6 shadow-card space-y-4">
            <div className="flex items-center gap-2 border-b border-line pb-3">
              <span className="flex size-7 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                3
              </span>
              <div>
                <h2 className="text-base font-bold text-ink">Plan de Manejo</h2>
                <p className="text-xs text-muted">
                  Diagnóstico presuntivo o definitivo e indicaciones no farmacológicas
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-semibold text-ink">
                Diagnóstico y Plan Clínico
                <textarea
                  rows={3}
                  disabled={!activa}
                  className={inputClase}
                  placeholder="Diagnóstico clínico, conducta a seguir, solicitud de exámenes de laboratorio o imágenes..."
                  value={planDescripcion}
                  onChange={(e) => setPlanDescripcion(e.target.value)}
                />
              </label>

              <label className="block text-sm font-semibold text-ink">
                Indicaciones y Recomendaciones Generales
                <textarea
                  rows={3}
                  disabled={!activa}
                  className={inputClase}
                  placeholder="Recomendaciones de estilo de vida, dieta, reposo, signos de alarma, fecha de control..."
                  value={planIndicaciones}
                  onChange={(e) => setPlanIndicaciones(e.target.value)}
                />
              </label>
            </div>
          </section>

          {/* SECCIÓN 4: Receta Médica */}
          <section className="rounded-card border border-line bg-surface p-6 shadow-card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                  4
                </span>
                <div>
                  <h2 className="text-base font-bold text-ink">Receta Médica</h2>
                  <p className="text-xs text-muted">
                    Prescripción de medicamentos con dosis, vía y posología
                  </p>
                </div>
              </div>

              {activa && (
                <Button
                  size="sm"
                  icon="ri-medicine-bottle-line"
                  onClick={agregarMedicamento}
                >
                  Agregar Medicamento
                </Button>
              )}
            </div>

            {/* Observaciones generales de la receta */}
            <div>
              <label className="block text-xs font-bold text-ink">
                Observaciones Generales de la Receta
                <input
                  type="text"
                  disabled={!activa}
                  className={inputClase}
                  placeholder="Ej. Tomar medicamentos con abundante agua. No suspender tratamiento..."
                  value={recetaObservaciones}
                  onChange={(e) => setRecetaObservaciones(e.target.value)}
                />
              </label>
            </div>

            {/* Lista dinámica de medicamentos */}
            <div className="space-y-4">
              {recetaDetalles.length === 0 ? (
                <div className="rounded-field border border-dashed border-line p-6 text-center text-sm text-muted">
                  <i className="ri-medicine-bottle-line text-2xl mb-1 text-muted/60 block" />
                  No se han prescrito medicamentos para esta consulta.
                  {activa && (
                    <div className="mt-3">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={agregarMedicamento}
                      >
                        Prescribir primer medicamento
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                recetaDetalles.map((med, idx) => (
                  <div
                    key={idx}
                    className="relative rounded-card border border-line bg-canvas p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-line/60 pb-2">
                      <span className="text-xs font-bold text-brand-700">
                        Medicamento #{idx + 1}
                      </span>
                      {activa && (
                        <button
                          type="button"
                          className="rounded-field px-2 py-1 text-xs text-danger hover:bg-danger-soft transition-colors"
                          onClick={() => eliminarMedicamento(idx)}
                        >
                          <i className="ri-delete-bin-line mr-1 align-middle" />
                          Quitar
                        </button>
                      )}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-ink">
                          Nombre del Medicamento *
                          <input
                            type="text"
                            disabled={!activa}
                            className={inputClase}
                            placeholder="Ej. Amoxicilina + Ácido Clavulánico 875/125 mg"
                            value={med.nombre_medicamento}
                            onChange={(e) =>
                              actualizarMedicamento(
                                idx,
                                'nombre_medicamento',
                                e.target.value,
                              )
                            }
                          />
                        </label>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-ink">
                          Dosis *
                          <input
                            type="text"
                            disabled={!activa}
                            className={inputClase}
                            placeholder="Ej. 1 tableta"
                            value={med.dosis}
                            onChange={(e) =>
                              actualizarMedicamento(idx, 'dosis', e.target.value)
                            }
                          />
                        </label>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <label className="block text-xs font-bold text-ink">
                          Vía de Administración
                          <select
                            disabled={!activa}
                            className={inputClase}
                            value={med.via_administracion}
                            onChange={(e) =>
                              actualizarMedicamento(
                                idx,
                                'via_administracion',
                                e.target.value,
                              )
                            }
                          >
                            {VIAS_ADMINISTRACION.map((via) => (
                              <option key={via} value={via}>
                                {via}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-ink">
                          Frecuencia *
                          <input
                            type="text"
                            disabled={!activa}
                            className={inputClase}
                            placeholder="Ej. Cada 8 horas"
                            value={med.frecuencia}
                            onChange={(e) =>
                              actualizarMedicamento(idx, 'frecuencia', e.target.value)
                            }
                          />
                        </label>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-ink">
                          Duración
                          <input
                            type="text"
                            disabled={!activa}
                            className={inputClase}
                            placeholder="Ej. Por 7 días"
                            value={med.duracion}
                            onChange={(e) =>
                              actualizarMedicamento(idx, 'duracion', e.target.value)
                            }
                          />
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-ink">
                        Indicaciones Especiales
                        <input
                          type="text"
                          disabled={!activa}
                          className={inputClase}
                          placeholder="Ej. Tomar después del almuerzo y cena. No tomar con lácteos."
                          value={med.indicaciones}
                          onChange={(e) =>
                            actualizarMedicamento(idx, 'indicaciones', e.target.value)
                          }
                        />
                      </label>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Acciones finales */}
          {activa && (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-line bg-surface p-5 shadow-card">
              <div>
                <p className="text-sm font-bold text-ink">¿Completaste la atención?</p>
                <p className="text-xs text-muted">
                  Puedes guardar el borrador o finalizar la consulta para archivarla en el historial.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="secondary"
                  icon="ri-pause-circle-line"
                  loading={actualizarMutation.isPending}
                  onClick={handleGuardarYSalir}
                  title="Guarda los datos actuales, detiene el cronómetro y regresa a la sala de espera"
                >
                  Pausar y Salir
                </Button>

                <Button
                  variant="secondary"
                  icon="ri-save-line"
                  loading={actualizarMutation.isPending}
                  onClick={handleGuardarProgreso}
                >
                  Guardar Progreso
                </Button>

                <Button
                  icon="ri-check-double-line"
                  loading={finalizarMutation.isPending}
                  onClick={() => setModalFinalizarAbierto(true)}
                >
                  Finalizar Consulta
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modal de confirmación para finalizar consulta */}
      <Modal
        isOpen={modalFinalizarAbierto}
        onClose={() => setModalFinalizarAbierto(false)}
        title="Finalizar Atención Médica"
        subtitle={`Consulta de ${consulta.paciente?.nombre}`}
        size="md"
        footer={
          <>
            <Button
              variant="secondary"
              disabled={guardandoFinalizar || finalizarMutation.isPending || actualizarMutation.isPending}
              onClick={() => setModalFinalizarAbierto(false)}
            >
              Continuar Editando
            </Button>
            <Button
              icon="ri-check-line"
              loading={guardandoFinalizar || finalizarMutation.isPending || actualizarMutation.isPending}
              disabled={guardandoFinalizar || finalizarMutation.isPending || actualizarMutation.isPending}
              onClick={handleConfirmarFinalizar}
            >
              Confirmar y Finalizar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-ink">
            Al finalizar la consulta médica:
          </p>

          <ul className="list-disc pl-5 text-xs text-muted space-y-1.5">
            <li>El cronómetro de atención se detendrá.</li>
            <li>La cita cambiará su estado a <strong className="text-emerald-700">ATENDIDA</strong>.</li>
            <li>Los datos clínicos, examen físico, plan y receta médica quedarán registrados permanentemente en el expediente del paciente.</li>
          </ul>

          <div className="rounded-card border border-line bg-canvas p-4 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-muted">Total de medicamentos recetados:</span>
              <span className="font-bold text-ink">{recetaDetalles.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Total a facturar:</span>
              <span className="font-bold text-emerald-700">
                ${total !== '' ? Number(total).toFixed(2) : (precio !== '' ? Number(precio).toFixed(2) : '0.00')} USD
              </span>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
