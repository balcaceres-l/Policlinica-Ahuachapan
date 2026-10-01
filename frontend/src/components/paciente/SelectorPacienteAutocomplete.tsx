import { useState, useMemo, useRef, useEffect } from 'react';
import Badge from '@/components/ui/Badge';
import { usePacientes } from '@/hooks/paciente/usePacientes';
import { getIniciales, normalizar } from '@/lib/utils';
import { mockPacientes } from '@/services/mockData';
import type { Paciente } from '@/types/paciente.types';

interface SelectorPacienteAutocompleteProps {
  pacienteId: string;
  onSelectPaciente: (pacienteId: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string | null;
}

export function SelectorPacienteAutocomplete({
  pacienteId,
  onSelectPaciente,
  label = 'Paciente',
  required = true,
  disabled = false,
  error,
}: SelectorPacienteAutocompleteProps) {
  const { data: rawPacientes = [] } = usePacientes();
  const pacientes: Paciente[] = useMemo(() => {
    return Array.isArray(rawPacientes) && rawPacientes.length > 0 ? rawPacientes : mockPacientes;
  }, [rawPacientes]);

  const [busqueda, setBusqueda] = useState('');
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  // Paciente seleccionado actualmente
  const pacienteSeleccionado = useMemo(() => {
    return pacientes.find((p) => p.id === pacienteId) ?? null;
  }, [pacientes, pacienteId]);

  // Cerrar dropdown al hacer clic afuera
  useEffect(() => {
    const handleClickAfuera = (event: MouseEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(event.target as Node)) {
        setAbierto(false);
      }
    };
    document.addEventListener('mousedown', handleClickAfuera);
    return () => document.removeEventListener('mousedown', handleClickAfuera);
  }, []);

  // Filtrado de pacientes en tiempo real
  const pacientesFiltrados = useMemo(() => {
    const termino = normalizar(busqueda);
    if (!termino) {
      // Mostrar los primeros 8 si no ha escrito para selección rápida
      return pacientes.slice(0, 8);
    }

    return pacientes
      .filter(
        (p) =>
          normalizar(p.nombre_completo).includes(termino) ||
          normalizar(p.numero_expediente).includes(termino) ||
          normalizar(p.dui).includes(termino) ||
          (p.telefono && normalizar(p.telefono).includes(termino)),
      )
      .slice(0, 10);
  }, [pacientes, busqueda]);

  const handleSeleccionar = (p: Paciente) => {
    onSelectPaciente(p.id);
    setAbierto(false);
    setBusqueda('');
  };

  const handleDesmarcar = () => {
    onSelectPaciente('');
    setBusqueda('');
    setAbierto(true);
  };

  return (
    <div className="space-y-1.5" ref={contenedorRef}>
      <label className="block text-xs font-semibold text-ink">
        {label} {required && <span className="text-danger">*</span>}
      </label>

      {pacienteSeleccionado ? (
        /* Tarjeta de Paciente Seleccionado */
        <div className="flex items-center justify-between rounded-card border border-brand-200 bg-brand-50/50 p-3 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
              {getIniciales(pacienteSeleccionado.nombre_completo)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-ink">
                {pacienteSeleccionado.nombre_completo}
              </p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <span className="inline-flex items-center gap-1 font-semibold text-brand-700 bg-brand-100/70 px-1.5 py-0.5 rounded text-[11px]">
                  <i className="ri-folder-user-line" />
                  {pacienteSeleccionado.numero_expediente}
                </span>
                <span>
                  {pacienteSeleccionado.tipo_documento === 'PASAPORTE' ? 'Pasaporte' : 'DUI'}:{' '}
                  <strong className="text-ink font-medium">{pacienteSeleccionado.dui}</strong>
                </span>
                <Badge
                  variant={pacienteSeleccionado.es_menor_edad ? 'warning' : 'default'}
                  className="text-[10px] py-0.2"
                >
                  {pacienteSeleccionado.es_menor_edad ? 'Menor' : 'Adulto'}
                </Badge>
              </div>
            </div>
          </div>

          {!disabled && (
            <button
              type="button"
              onClick={handleDesmarcar}
              title="Cambiar paciente seleccionado"
              className="flex cursor-pointer items-center gap-1 rounded-field border border-brand-200 bg-surface px-2.5 py-1 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-50 hover:text-brand-900"
            >
              <i className="ri-arrow-left-right-line" />
              <span>Cambiar</span>
            </button>
          )}
        </div>
      ) : (
        /* Buscador con Autocompletado */
        <div className="relative">
          <div className="relative">
            <i className="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-base" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setAbierto(true);
              }}
              onFocus={() => setAbierto(true)}
              disabled={disabled}
              placeholder="Buscar por nombre, expediente o número de documento..."
              className="h-11 w-full rounded-field border border-line bg-surface pl-10 pr-10 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15 disabled:opacity-60"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
              >
                <i className="ri-close-line text-base" />
              </button>
            )}
          </div>

          {/* Menú flotante de resultados */}
          {abierto && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-card border border-line bg-surface p-1 shadow-elevated">
              {pacientesFiltrados.length === 0 ? (
                <div className="p-3 text-center text-xs text-muted">
                  <p className="font-semibold text-ink">Sin pacientes encontrados</p>
                  <p className="mt-0.5">
                    No se encontró ningún expediente con &quot;{busqueda}&quot;.
                  </p>
                </div>
              ) : (
                pacientesFiltrados.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSeleccionar(p)}
                    className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-field p-2.5 text-left transition-colors hover:bg-brand-50/60"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                        {getIniciales(p.nombre_completo)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-ink">{p.nombre_completo}</p>
                        <p className="truncate text-[11px] text-muted">
                          {p.tipo_documento === 'PASAPORTE' ? 'Pasaporte' : 'DUI'}: {p.dui}{' '}
                          {p.telefono ? `· Tel: ${p.telefono}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-700">
                        {p.numero_expediente}
                      </span>
                      <Badge
                        variant={p.es_menor_edad ? 'warning' : 'default'}
                        className="text-[9px] py-0.2"
                      >
                        {p.es_menor_edad ? 'Menor' : 'Adulto'}
                      </Badge>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

export default SelectorPacienteAutocomplete;
