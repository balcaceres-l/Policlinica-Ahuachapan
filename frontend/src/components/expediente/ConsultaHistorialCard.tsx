import { useState } from 'react';
import Badge from '@/components/ui/Badge';
import RecetaPreviewModal from '@/components/medico/RecetaPreviewModal';
import { generarHtmlReceta } from '@/lib/recetaPdf';
import { calcularEdad } from '@/lib/utils';
import type { ConsultaHistorial } from '@/types/historial.types';
import type { EstadoCita, TipoCita } from '@/types/cita.types';

interface ConsultaHistorialCardProps {
  consulta: ConsultaHistorial;
  pacienteInfo?: {
    nombre?: string | null;
    numero_expediente?: string | null;
    fecha_nacimiento?: string | null;
    dui?: string | null;
    telefono?: string | null;
  };
}

/** Normaliza la fecha de Laravel o ISO para que sea compatible en todos los navegadores. */
const aFecha = (valor?: string | null): Date | null => {
  if (!valor) return null;
  const normalizado = valor.includes('T') ? valor : valor.replace(' ', 'T');
  const d = new Date(normalizado);
  return isNaN(d.getTime()) ? null : d;
};

const formatearDia = (valor?: string | null): string => {
  const d = aFecha(valor);
  return d ? d.toLocaleDateString('es-SV', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';
};

const formatearHora = (valor?: string | null): string => {
  const d = aFecha(valor);
  return d ? d.toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit', hour12: true }) : '';
};

const ESTADOS_MAP: Record<EstadoCita, { label: string; variant: 'success' | 'royal' | 'warning' | 'info' | 'danger' | 'default' }> = {
  ATENDIDA: { label: 'Atendida', variant: 'success' },
  EN_ATENCION: { label: 'En atención', variant: 'royal' },
  EN_ESPERA: { label: 'En espera', variant: 'warning' },
  AGENDADA: { label: 'Agendada', variant: 'info' },
  CANCELADA: { label: 'Cancelada', variant: 'danger' },
  NO_ASISTIO: { label: 'No asistió', variant: 'danger' },
};

const TIPOS_MAP: Record<TipoCita, { label: string; variant: 'danger' | 'warning' | 'default' }> = {
  EMERGENCIA: { label: 'Emergencia', variant: 'danger' },
  SOBRECUPO: { label: 'Sobrecupo', variant: 'warning' },
  REGULAR: { label: 'Consulta regular', variant: 'default' },
};

const ETIQUETA_SECCION = 'text-xs font-bold uppercase tracking-wide text-muted flex items-center gap-1.5';

/**
 * HU-22 / HU-28 — visualización de una cita o consulta histórica con
 * signos vitales, examen físico, diagnósticos, plan de manejo y recetas.
 */
export function ConsultaHistorialCard({ consulta, pacienteInfo }: ConsultaHistorialCardProps) {
  const [modalReceta, setModalReceta] = useState(false);
  const { diagnosticos, plan_manejo: plan, examen_fisico: examen, signos_vitales: sv } = consulta;

  const tieneSignos = Boolean(
    sv &&
      (sv.presion_sistolica != null ||
        sv.frecuencia_cardiaca != null ||
        sv.temperatura_c != null ||
        sv.peso_kg != null ||
        sv.saturacion_oxigeno != null),
  );

  const estadoInfo = consulta.cita_estado ? ESTADOS_MAP[consulta.cita_estado] : null;
  const tipoInfo = consulta.tipo_cita ? TIPOS_MAP[consulta.tipo_cita] : null;

  return (
    <article className="rounded-card border border-line bg-surface p-5 shadow-card transition-shadow hover:shadow-md">
      {/* Cabecera con fecha, médico y estados */}
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line/60 pb-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <time
              dateTime={aFecha(consulta.fecha_hora_inicio)?.toISOString()}
              className="text-base font-bold text-ink"
            >
              {formatearDia(consulta.fecha_hora_inicio)}
            </time>
            {formatearHora(consulta.fecha_hora_inicio) && (
              <span className="text-xs font-medium text-muted">
                · {formatearHora(consulta.fecha_hora_inicio)}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted">
            <i className="ri-user-star-line mr-1 align-middle text-brand-600" />
            <span className="font-semibold text-ink">{consulta.medicoNombre}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Precio fijado por el médico para facturación / cobro */}
          {(consulta.total != null || consulta.precio != null) && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 shadow-xs"
              title="Precio de la consulta asignado por el médico para facturación / cobro en recepción"
            >
              <i className="ri-money-dollar-circle-line text-sm text-emerald-700" />
              Cobro: ${Number(consulta.total ?? consulta.precio).toFixed(2)} USD
            </span>
          )}

          {consulta.especialidadNombre && (
            <Badge variant="royal">{consulta.especialidadNombre}</Badge>
          )}

          {estadoInfo && (
            <Badge dot variant={estadoInfo.variant}>
              {estadoInfo.label}
            </Badge>
          )}

          {tipoInfo && tipoInfo.variant !== 'default' && (
            <Badge variant={tipoInfo.variant}>{tipoInfo.label}</Badge>
          )}
        </div>
      </header>

      {/* Signos Vitales (si fueron registrados en la cita) */}
      {tieneSignos && sv && (
        <section className="mt-3.5 rounded-field border border-brand-100 bg-brand-50/50 p-3">
          <h4 className="mb-2 flex items-center gap-1.5 text-xs font-bold text-brand-800">
            <i className="ri-heart-pulse-line text-sm text-brand-600" />
            Signos vitales de la atención
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 md:grid-cols-6">
            {sv.presion_sistolica != null && sv.presion_diastolica != null && (
              <div className="rounded border border-line bg-surface p-1.5">
                <span className="block text-[10px] text-muted">Presión Arterial</span>
                <span className="font-semibold text-ink">
                  {sv.presion_sistolica}/{sv.presion_diastolica}{' '}
                  <span className="text-[10px] text-muted">mmHg</span>
                </span>
              </div>
            )}
            {sv.frecuencia_cardiaca != null && (
              <div className="rounded border border-line bg-surface p-1.5">
                <span className="block text-[10px] text-muted">Frec. Cardíaca</span>
                <span className="font-semibold text-ink">
                  {sv.frecuencia_cardiaca} <span className="text-[10px] text-muted">lpm</span>
                </span>
              </div>
            )}
            {sv.frecuencia_respiratoria != null && (
              <div className="rounded border border-line bg-surface p-1.5">
                <span className="block text-[10px] text-muted">Frec. Resp.</span>
                <span className="font-semibold text-ink">
                  {sv.frecuencia_respiratoria} <span className="text-[10px] text-muted">rpm</span>
                </span>
              </div>
            )}
            {sv.temperatura_c != null && (
              <div className="rounded border border-line bg-surface p-1.5">
                <span className="block text-[10px] text-muted">Temperatura</span>
                <span className="font-semibold text-ink">
                  {Number(sv.temperatura_c).toFixed(1)}{' '}
                  <span className="text-[10px] text-muted">°C</span>
                </span>
              </div>
            )}
            {sv.saturacion_oxigeno != null && (
              <div className="rounded border border-line bg-surface p-1.5">
                <span className="block text-[10px] text-muted">SpO₂</span>
                <span className="font-semibold text-ink">{sv.saturacion_oxigeno}%</span>
              </div>
            )}
            {sv.peso_kg != null && (
              <div className="rounded border border-line bg-surface p-1.5">
                <span className="block text-[10px] text-muted">Peso</span>
                <span className="font-semibold text-ink">
                  {Number(sv.peso_kg).toFixed(1)}{' '}
                  <span className="text-[10px] text-muted">kg</span>
                </span>
              </div>
            )}
            {sv.talla_cm != null && (
              <div className="rounded border border-line bg-surface p-1.5">
                <span className="block text-[10px] text-muted">Talla</span>
                <span className="font-semibold text-ink">
                  {sv.talla_cm} <span className="text-[10px] text-muted">cm</span>
                </span>
              </div>
            )}
            {sv.imc != null && (
              <div className="rounded border border-line bg-surface p-1.5">
                <span className="block text-[10px] text-muted">IMC</span>
                <span className="font-semibold text-ink">{Number(sv.imc).toFixed(1)}</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Motivo de consulta */}
      {consulta.motivo_consulta && (
        <p className="mt-3.5 text-sm text-ink">
          <span className="font-semibold text-muted">Motivo: </span>
          {consulta.motivo_consulta}
        </p>
      )}

      {/* Diagnósticos */}
      <section className="mt-4">
        <h3 className={ETIQUETA_SECCION}>
          <i className="ri-file-text-line" />
          Diagnósticos
        </h3>
        {diagnosticos.length === 0 ? (
          <p className="mt-1 text-xs italic text-muted">Sin diagnósticos registrados en esta atención.</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {diagnosticos.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-2 text-sm text-ink">
                {d.codigo_cie10 ? (
                  <Badge variant="royal">{d.codigo_cie10}</Badge>
                ) : (
                  <Badge variant="default">Texto libre</Badge>
                )}
                <span>{d.descripcion}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Plan de manejo */}
      <section className="mt-4">
        <h3 className={ETIQUETA_SECCION}>
          <i className="ri-clipboard-line" />
          Plan de manejo
        </h3>
        {plan ? (
          <p className="mt-1 whitespace-pre-line text-sm text-ink">{plan.indicaciones}</p>
        ) : (
          <p className="mt-1 text-xs italic text-muted">Sin plan de manejo registrado.</p>
        )}
      </section>

      {/* Examen físico: por regiones anatómicas o texto consolidado */}
      {consulta.examenes_fisicos && consulta.examenes_fisicos.length > 0 ? (
        <section className="mt-4">
          <h3 className={ETIQUETA_SECCION}>
            <i className="ri-stethoscope-line" />
            Examen Físico por Regiones
          </h3>
          <div className="mt-2 space-y-2">
            {consulta.examenes_fisicos.map((ef, idx) => (
              <div key={ef.id || idx} className="rounded-field border border-line bg-canvas p-2.5 text-xs">
                <span className="font-bold text-ink">{ef.region_anatomica || 'Hallazgos'}: </span>
                <span className="text-muted">{ef.hallazgos || 'Sin hallazgos patológicos'}</span>
              </div>
            ))}
          </div>
        </section>
      ) : examen ? (
        <details className="mt-4 rounded-field border border-line bg-canvas px-3 py-2">
          <summary className="cursor-pointer text-xs font-semibold text-brand-700">
            <i className="ri-stethoscope-line mr-1 align-middle" />
            Examen físico
          </summary>
          <p className="mt-2 whitespace-pre-line text-xs text-ink">{examen}</p>
        </details>
      ) : null}

      {/* Receta Médica y Medicamentos prescritos */}
      {consulta.receta && consulta.receta.detalles && consulta.receta.detalles.length > 0 && (
        <section className="mt-4 rounded-field border border-emerald-200 bg-emerald-50/40 p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100 pb-2">
            <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-emerald-800">
              <i className="ri-capsule-line text-sm text-emerald-600" />
              Medicamentos Prescritos ({consulta.receta.detalles.length})
            </h3>
            <button
              type="button"
              onClick={() => setModalReceta(true)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-field border border-emerald-300 bg-white px-2.5 py-1 text-xs font-semibold text-emerald-800 shadow-xs transition-colors hover:bg-emerald-50"
              title="Previsualizar e imprimir o exportar receta a PDF"
            >
              <i className="ri-printer-line" />
              Exportar / Imprimir PDF
            </button>
          </div>
          <div className="mt-2.5 space-y-2">
            {consulta.receta.detalles.map((med, idx) => (
              <div key={med.id || idx} className="rounded border border-emerald-100 bg-surface p-2.5 text-xs shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <p className="font-bold text-ink">{med.nombre_medicamento}</p>
                  {med.via_administracion && (
                    <span className="rounded bg-emerald-100/70 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                      {med.via_administracion}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-muted">
                  <span className="font-semibold text-ink">Dosis:</span> {med.dosis || '—'} ·{' '}
                  <span className="font-semibold text-ink">Frecuencia:</span> {med.frecuencia || '—'}
                  {med.duracion && (
                    <span>
                      {' '}
                      · <span className="font-semibold text-ink">Duración:</span> {med.duracion}
                    </span>
                  )}
                </p>
                {med.indicaciones && (
                  <p className="mt-1 text-[11px] italic text-muted">
                    <span className="font-medium text-ink">Indicaciones:</span> {med.indicaciones}
                  </p>
                )}
              </div>
            ))}
          </div>
          {consulta.receta.observaciones_generales && (
            <p className="mt-2 text-xs text-muted">
              <span className="font-semibold text-emerald-900">Observaciones: </span>
              {consulta.receta.observaciones_generales}
            </p>
          )}
        </section>
      )}

      {/* Notas adicionales */}
      {consulta.notas_adicionales && (
        <div className="mt-3 rounded-field border border-amber-200 bg-amber-50/50 p-2.5 text-xs text-amber-900">
          <span className="font-bold">Notas clínicas: </span>
          <span>{consulta.notas_adicionales}</span>
        </div>
      )}

      {/* Tarifa / Precio de la consulta para recepción y cobro */}
      {(consulta.precio != null || consulta.total != null) && (
        <section className="mt-3 rounded-field border border-emerald-200 bg-emerald-50/60 p-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
                <i className="ri-money-dollar-circle-line text-base" />
              </span>
              <div>
                <span className="block font-bold text-emerald-950">
                  Tarifa / Precio fijado por el médico:
                </span>
                <span className="text-[11px] text-emerald-800/80">
                  Importe registrado por {consulta.medicoNombre} para cobro en recepción
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {consulta.precio != null && consulta.total != null && consulta.precio !== consulta.total && (
                <span className="text-xs text-muted line-through">
                  ${Number(consulta.precio).toFixed(2)}
                </span>
              )}
              <span className="rounded-field bg-emerald-600 px-3 py-1 text-sm font-extrabold text-white shadow-xs">
                ${Number(consulta.total ?? consulta.precio).toFixed(2)} USD
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Mensaje de cita sin consulta si aplica */}
      {consulta.cita_estado &&
        consulta.cita_estado !== 'ATENDIDA' &&
        consulta.cita_estado !== 'EN_ATENCION' &&
        !consulta.plan_manejo &&
        diagnosticos.length === 0 && (
          <div className="mt-3 rounded-field border border-line bg-canvas p-2.5 text-xs text-muted italic">
            {consulta.cita_estado === 'CANCELADA'
              ? 'Esta cita fue cancelada antes de la consulta médica.'
              : consulta.cita_estado === 'NO_ASISTIO'
                ? 'El paciente no se presentó a esta cita.'
                : 'Cita agendada / pendiente de atención médica.'}
          </div>
        )}

      {consulta.receta && (
        <RecetaPreviewModal
          isOpen={modalReceta}
          onClose={() => setModalReceta(false)}
          html={generarHtmlReceta({
            medico: {
              nombre: consulta.medicoNombre,
              especialidad: consulta.especialidadNombre ?? undefined,
            },
            paciente: {
              nombre: pacienteInfo?.nombre,
              expediente: pacienteInfo?.numero_expediente,
              edad: pacienteInfo?.fecha_nacimiento ? calcularEdad(pacienteInfo.fecha_nacimiento) : null,
              dui: pacienteInfo?.dui,
              telefono: pacienteInfo?.telefono,
            },
            fecha: consulta.fecha_hora_inicio,
            medicamentos: (consulta.receta.detalles ?? []).map((d) => ({
              nombre_medicamento: d.nombre_medicamento,
              dosis: d.dosis,
              via_administracion: d.via_administracion,
              frecuencia: d.frecuencia,
              duracion: d.duracion,
              indicaciones: d.indicaciones,
            })),
            observaciones_generales: consulta.receta.observaciones_generales,
          })}
          pacienteNombre={pacienteInfo?.nombre}
          numeroExpediente={pacienteInfo?.numero_expediente}
        />
      )}
    </article>
  );
}

export default ConsultaHistorialCard;
