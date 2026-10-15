import { useState } from 'react';
import Badge from '@/components/ui/Badge';
import BuscarCie10Modal from '@/components/medico/BuscarCie10Modal';

export interface DiagnosticoLocal {
  descripcion: string;
  /** null mientras sea texto libre. */
  codigo_cie10: string | null;
}

interface DiagnosticosConsultaProps {
  diagnosticos: DiagnosticoLocal[];
  onChange: (diagnosticos: DiagnosticoLocal[]) => void;
  disabled: boolean;
  inputClassName: string;
}

/**
 * HU-20 / HU-44 — diagnósticos de la consulta. El médico escribe los síntomas
 * o el diagnóstico y, si quiere, le asigna el código CIE-10 con el buscador;
 * sin código queda como texto libre.
 */
export function DiagnosticosConsulta({
  diagnosticos,
  onChange,
  disabled,
  inputClassName,
}: DiagnosticosConsultaProps) {
  const [filaBuscando, setFilaBuscando] = useState<number | null>(null);

  const actualizar = (indice: number, cambios: Partial<DiagnosticoLocal>) => {
    onChange(diagnosticos.map((dx, i) => (i === indice ? { ...dx, ...cambios } : dx)));
  };

  if (diagnosticos.length === 0 && disabled) {
    return <p className="text-sm italic text-muted">Sin diagnósticos registrados en esta consulta.</p>;
  }

  return (
    <div className="space-y-3">
      {diagnosticos.map((dx, indice) => (
        <div key={indice} className="rounded-field border border-line bg-canvas/40 p-3">
          <div className="flex items-end gap-2">
            <label className="min-w-0 flex-1 text-xs font-semibold text-muted">
              Síntomas o diagnóstico
              <input
                type="text"
                disabled={disabled}
                maxLength={500}
                className={inputClassName}
                placeholder="Ej. dolor de garganta y fiebre de 3 días"
                value={dx.descripcion}
                onChange={(e) => actualizar(indice, { descripcion: e.target.value })}
              />
            </label>

            {!disabled && (
              <button
                type="button"
                onClick={() => onChange(diagnosticos.filter((_, i) => i !== indice))}
                aria-label="Quitar diagnóstico"
                className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-field text-muted transition-colors hover:bg-danger-soft hover:text-danger"
              >
                <i className="ri-delete-bin-line" />
              </button>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {dx.codigo_cie10 ? (
              <>
                <span className="text-xs font-semibold text-muted">Código CIE-10:</span>
                <Badge variant="royal" className="font-mono">
                  {dx.codigo_cie10}
                </Badge>
              </>
            ) : (
              <Badge variant="default">Texto libre, sin código</Badge>
            )}

            {!disabled && (
              <>
                <button
                  type="button"
                  onClick={() => setFilaBuscando(indice)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-field border border-brand-200 bg-brand-50 px-2.5 py-1.5 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-100"
                >
                  <i className="ri-search-line" />
                  {dx.codigo_cie10 ? 'Cambiar código' : 'Buscar código CIE-10'}
                </button>
                {dx.codigo_cie10 && (
                  <button
                    type="button"
                    onClick={() => actualizar(indice, { codigo_cie10: null })}
                    className="cursor-pointer text-xs font-semibold text-muted underline-offset-2 hover:text-danger hover:underline"
                  >
                    Quitar código
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      ))}

      {!disabled && (
        <button
          type="button"
          onClick={() => onChange([...diagnosticos, { descripcion: '', codigo_cie10: null }])}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-field border border-dashed border-line px-3 py-2 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-50"
        >
          <i className="ri-add-line" />
          Agregar diagnóstico
        </button>
      )}

      {filaBuscando !== null && diagnosticos[filaBuscando] && (
        <BuscarCie10Modal
          textoInicial={diagnosticos[filaBuscando].descripcion}
          onClose={() => setFilaBuscando(null)}
          onSeleccionar={(fila) => {
            const actual = diagnosticos[filaBuscando];
            actualizar(filaBuscando, {
              codigo_cie10: fila.codigo,
              // Solo se completa si el médico no había escrito nada.
              descripcion: actual.descripcion.trim() || fila.descripcion,
            });
            setFilaBuscando(null);
          }}
        />
      )}
    </div>
  );
}

export default DiagnosticosConsulta;
