import Badge from '@/components/ui/Badge';
import BuscadorCie11 from '@/components/medico/BuscadorCie11';
import { nuevoDiagnosticoLocal, type DiagnosticoLocal } from '@/lib/diagnostico';
import type { EntidadSeleccionadaEct } from '@/types/cie11.types';

const SIN_CODIGO = { codigo_cie11: null, uri_foundation: null, uri_linearizacion: null, textosOms: undefined };

interface DiagnosticosConsultaProps {
  diagnosticos: DiagnosticoLocal[];
  onChange: (diagnosticos: DiagnosticoLocal[]) => void;
  disabled: boolean;
  inputClassName: string;
}

/**
 * HU-20 / HU-44 — diagnósticos de la consulta. Al escribir, la OMS sugiere
 * diagnósticos de la CIE-11 en español; al elegir uno se guarda con su código.
 * Si no hay sugerencia que sirva (o no hay conexión), lo escrito se guarda como
 * texto libre.
 */
export function DiagnosticosConsulta({ diagnosticos, onChange, disabled, inputClassName }: DiagnosticosConsultaProps) {
  const actualizar = (clave: string, cambios: Partial<DiagnosticoLocal>) => {
    onChange(diagnosticos.map((dx) => (dx.clave === clave ? { ...dx, ...cambios } : dx)));
  };

  const escribir = (dx: DiagnosticoLocal, texto: string) => {
    const conservaCodigo = dx.codigo_cie11 !== null && (dx.textosOms ?? []).includes(texto);
    actualizar(dx.clave, conservaCodigo ? { descripcion: texto } : { descripcion: texto, ...SIN_CODIGO });
  };

  const seleccionar = (dx: DiagnosticoLocal, entidad: EntidadSeleccionadaEct) => {
    const nombre = entidad.title || entidad.selectedText || dx.descripcion;
    actualizar(dx.clave, {
      descripcion: nombre,
      codigo_cie11: entidad.code,
      uri_foundation: entidad.foundationUri ?? null,
      uri_linearizacion: entidad.linearizationUri ?? null,
      textosOms: [nombre, entidad.selectedText ?? ''].filter(Boolean),
    });
  };

  if (diagnosticos.length === 0 && disabled) {
    return <p className="text-sm italic text-muted">Sin diagnósticos registrados en esta consulta.</p>;
  }

  return (
    <div className="space-y-3">
      {diagnosticos.map((dx) => (
        <div key={dx.clave} className="rounded-field border border-line bg-canvas/40 p-3">
          <div className="flex items-start gap-2">
            <label className="min-w-0 flex-1 text-xs font-semibold text-muted">
              Diagnóstico
              <BuscadorCie11
                valor={dx.descripcion}
                onEscribir={(texto) => escribir(dx, texto)}
                onSeleccionar={(entidad) => seleccionar(dx, entidad)}
                disabled={disabled}
                className={inputClassName}
              />
            </label>

            {!disabled && (
              <button
                type="button"
                onClick={() => onChange(diagnosticos.filter((d) => d.clave !== dx.clave))}
                aria-label="Quitar diagnóstico"
                className="mt-6 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-field text-muted transition-colors hover:bg-danger-soft hover:text-danger"
              >
                <i className="ri-delete-bin-line" />
              </button>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {dx.codigo_cie11 ? (
              <>
                <Badge variant="royal" className="font-mono">
                  CIE-11 {dx.codigo_cie11}
                </Badge>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => actualizar(dx.clave, SIN_CODIGO)}
                    className="cursor-pointer text-xs font-semibold text-muted underline-offset-2 hover:text-danger hover:underline"
                  >
                    Quitar código
                  </button>
                )}
              </>
            ) : (
              <Badge variant="default">Texto libre, sin código</Badge>
            )}
          </div>
        </div>
      ))}

      {!disabled && (
        <>
          <button
            type="button"
            onClick={() => onChange([...diagnosticos, nuevoDiagnosticoLocal()])}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-field border border-dashed border-line px-3 py-2 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-50"
          >
            <i className="ri-add-line" />
            Agregar diagnóstico
          </button>
          <p className="text-xs text-muted">
            <i className="ri-shield-check-line mr-1" />
            Lo que escribes aquí se consulta en la OMS: no escribas el nombre ni datos del paciente.
          </p>
        </>
      )}
    </div>
  );
}

export default DiagnosticosConsulta;
