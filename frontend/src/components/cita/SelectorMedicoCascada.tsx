import { useState, useMemo, useRef, useEffect } from 'react';
import Badge from '@/components/ui/Badge';
import { useCatalogoEspecialidades } from '@/hooks/especialidad/useEspecialidades';
import { useMedicos } from '@/hooks/usuario/useUsuarios';
import { getIniciales, normalizar } from '@/lib/utils';
import { mockCatalogoEspecialidades, mockMedicos } from '@/services/mockData';
import type { Usuario } from '@/types/user.types';

interface SelectorMedicoCascadaProps {
  medicoId: string;
  onSelectMedico: (medicoId: string, especialidadId?: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string | null;
}

export function SelectorMedicoCascada({
  medicoId,
  onSelectMedico,
  label = 'Médico Especialista Asignado',
  required = true,
  disabled = false,
  error,
}: SelectorMedicoCascadaProps) {
  const { data: rawMedicos = [] } = useMedicos();
  const { data: rawCatalogo = [] } = useCatalogoEspecialidades();

  const medicos: Usuario[] = useMemo(() => {
    return Array.isArray(rawMedicos) && rawMedicos.length > 0 ? rawMedicos : mockMedicos;
  }, [rawMedicos]);

  const catalogo = useMemo(() => {
    return Array.isArray(rawCatalogo) && rawCatalogo.length > 0
      ? rawCatalogo
      : mockCatalogoEspecialidades;
  }, [rawCatalogo]);

  const [especialidadSeleccionada, setEspecialidadSeleccionada] = useState<string>('TODAS');
  const [busqueda, setBusqueda] = useState('');
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  // Médico actualmente seleccionado
  const medicoSeleccionado = useMemo(() => {
    return medicos.find((m) => m.id === medicoId) ?? null;
  }, [medicos, medicoId]);

  // Sincronizar especialidad si cambia el médico desde las props
  const [prevMedicoId, setPrevMedicoId] = useState(medicoId);
  if (medicoId !== prevMedicoId) {
    setPrevMedicoId(medicoId);
    if (medicoId && especialidadSeleccionada === 'TODAS') {
      const esp = catalogo.find(
        (e) =>
          e.medicos.some((m) => m.id === medicoId) ||
          medicos.find((m) => m.id === medicoId)?.cargo?.toLowerCase() === e.nombre.toLowerCase(),
      );
      if (esp) {
        setEspecialidadSeleccionada(esp.id);
      }
    }
  }

  // Manejar clic fuera para cerrar el dropdown
  useEffect(() => {
    const handleClickAfuera = (event: MouseEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(event.target as Node)) {
        setAbierto(false);
      }
    };
    document.addEventListener('mousedown', handleClickAfuera);
    return () => document.removeEventListener('mousedown', handleClickAfuera);
  }, []);

  // Lista de especialidades únicas para el filtro en cascada
  const especialidades = useMemo(() => {
    return catalogo.map((e) => ({ id: e.id, nombre: e.nombre }));
  }, [catalogo]);

  // Médicos filtrados por la especialidad seleccionada (filtro en cascada)
  const medicosPorEspecialidad = useMemo(() => {
    if (especialidadSeleccionada === 'TODAS') return medicos;

    const esp = catalogo.find((e) => e.id === especialidadSeleccionada);
    if (!esp) return medicos;

    return medicos.filter(
      (m) =>
        esp.medicos.some((em) => em.id === m.id) ||
        m.cargo?.toLowerCase() === esp.nombre.toLowerCase(),
    );
  }, [medicos, especialidadSeleccionada, catalogo]);

  // Médicos resultantes tras aplicar autocompletado/búsqueda
  const medicosFiltrados = useMemo(() => {
    const termino = normalizar(busqueda);
    if (!termino) return medicosPorEspecialidad;

    return medicosPorEspecialidad.filter(
      (m) =>
        normalizar(m.nombreCompleto).includes(termino) ||
        normalizar(m.cargo).includes(termino) ||
        normalizar(m.usuario).includes(termino),
    );
  }, [medicosPorEspecialidad, busqueda]);

  const handleSeleccionarMedico = (m: Usuario) => {
    // Buscar su especialidad
    const esp = catalogo.find(
      (e) =>
        e.medicos.some((item) => item.id === m.id) ||
        e.nombre.toLowerCase() === m.cargo?.toLowerCase(),
    );

    if (esp && especialidadSeleccionada === 'TODAS') {
      setEspecialidadSeleccionada(esp.id);
    }

    onSelectMedico(m.id, esp?.id);
    setAbierto(false);
    setBusqueda('');
  };

  const handleCambiarEspecialidad = (espId: string) => {
    setEspecialidadSeleccionada(espId);

    // Si el médico seleccionado no pertenece a la nueva especialidad, deseleccionarlo
    if (espId !== 'TODAS' && medicoSeleccionado) {
      const esp = catalogo.find((e) => e.id === espId);
      const pertenece = esp
        ? esp.medicos.some((m) => m.id === medicoSeleccionado.id) ||
          medicoSeleccionado.cargo?.toLowerCase() === esp.nombre.toLowerCase()
        : false;

      if (!pertenece) {
        onSelectMedico('');
      }
    }
  };

  const handleDesmarcarMedico = () => {
    onSelectMedico('');
    setBusqueda('');
    setAbierto(true);
  };

  return (
    <div className="space-y-3" ref={contenedorRef}>
      {/* 1. Filtro en Cascada: Especialidad Clínica */}
      <div>
        <label className="mb-1 flex items-center justify-between text-xs font-semibold text-ink">
          <span>
            1. Filtrar por Especialidad <span className="font-normal text-muted">(Cascada)</span>
          </span>
          {especialidadSeleccionada !== 'TODAS' && (
            <button
              type="button"
              onClick={() => handleCambiarEspecialidad('TODAS')}
              className="text-[11px] font-semibold text-brand-600 hover:underline"
            >
              Ver todas
            </button>
          )}
        </label>
        <div className="relative">
          <select
            value={especialidadSeleccionada}
            onChange={(e) => handleCambiarEspecialidad(e.target.value)}
            disabled={disabled}
            className="h-11 w-full rounded-field border border-line bg-surface px-3 text-sm font-medium text-ink outline-none transition-colors focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15 disabled:opacity-60"
          >
            <option value="TODAS">
              ✨ Todas las especialidades ({medicos.length} médicos disponibles)
            </option>
            {especialidades.map((esp) => {
              const medicosEsp = medicos.filter(
                (m) =>
                  catalogo
                    .find((c) => c.id === esp.id)
                    ?.medicos.some((em) => em.id === m.id) ||
                  m.cargo?.toLowerCase() === esp.nombre.toLowerCase(),
              );
              return (
                <option key={esp.id} value={esp.id}>
                  {esp.nombre} ({medicosEsp.length} médico{medicosEsp.length === 1 ? '' : 's'})
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* 2. Autocompletado del Médico Asignado */}
      <div>
        <label className="mb-1 block text-xs font-semibold text-ink">
          2. {label} {required && <span className="text-danger">*</span>}
        </label>

        {medicoSeleccionado ? (
          /* Tarjeta de Médico Seleccionado */
          <div className="flex items-center justify-between rounded-card border border-brand-200 bg-brand-50/50 p-3 shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                {getIniciales(medicoSeleccionado.nombreCompleto)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-ink">
                  {medicoSeleccionado.nombreCompleto}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted">
                  <Badge variant="info" className="py-0.5 text-[10px]">
                    {medicoSeleccionado.cargo || 'Especialista'}
                  </Badge>
                  {medicoSeleccionado.telefono && (
                    <span>Tel: {medicoSeleccionado.telefono}</span>
                  )}
                </div>
              </div>
            </div>

            {!disabled && (
              <button
                type="button"
                onClick={handleDesmarcarMedico}
                title="Cambiar médico seleccionado"
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
                placeholder={
                  especialidadSeleccionada === 'TODAS'
                    ? 'Escribe para buscar médico por nombre...'
                    : `Buscar médico en ${especialidades.find((e) => e.id === especialidadSeleccionada)?.nombre ?? 'especialidad'}...`
                }
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

            {/* Menú flotante de autocompletado */}
            {abierto && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-card border border-line bg-surface p-1 shadow-elevated">
                {medicosFiltrados.length === 0 ? (
                  <div className="p-3 text-center text-xs text-muted">
                    <p className="font-semibold text-ink">Sin médicos coincidentes</p>
                    <p className="mt-0.5">
                      No hay médicos con ese nombre en la especialidad seleccionada.
                    </p>
                  </div>
                ) : (
                  medicosFiltrados.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleSeleccionarMedico(m)}
                      className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-field p-2 text-left transition-colors hover:bg-brand-50/60"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                          {getIniciales(m.nombreCompleto)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-ink">
                            {m.nombreCompleto}
                          </p>
                          <p className="truncate text-[11px] text-muted">
                            {m.cargo} {m.telefono ? `· ${m.telefono}` : ''}
                          </p>
                        </div>
                      </div>
                      <Badge dot variant={m.estado === 'ACTIVO' ? 'success' : 'danger'}>
                        {m.estado === 'ACTIVO' ? 'Disponible' : 'No disponible'}
                      </Badge>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>
    </div>
  );
}

export default SelectorMedicoCascada;
