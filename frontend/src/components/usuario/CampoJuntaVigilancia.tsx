import type { UseFormRegisterReturn } from 'react-hook-form';
import type { RolUsuario } from '@/types/user.types';

type CampoJunta = 'jvpm' | 'jvpe';

interface CampoJuntaVigilanciaProps {
  rol: RolUsuario;
  /** Prefijo de los `id`, para que los dos modales no choquen. */
  idPrefijo: string;
  registrar: (campo: CampoJunta) => UseFormRegisterReturn;
  mensajeError: (campo: CampoJunta) => string | undefined;
  disabled: boolean;
  className: string;
}

const CAMPO_POR_ROL: Record<Exclude<RolUsuario, 'ADMINISTRADOR'>, { nombre: CampoJunta; etiqueta: string; ayuda: string }> = {
  MEDICO: {
    nombre: 'jvpm',
    etiqueta: 'N.º JVPM',
    ayuda: 'Junta de Vigilancia de la Profesión Médica. Aparece en la receta.',
  },
  RECEPCIONISTA: {
    nombre: 'jvpe',
    etiqueta: 'N.º JVPE',
    ayuda: 'Junta de Vigilancia de la Profesión de Enfermería.',
  },
};

/** Número de junta de vigilancia del profesional, según el rol elegido. */
export function CampoJuntaVigilancia({
  rol,
  idPrefijo,
  registrar,
  mensajeError,
  disabled,
  className,
}: CampoJuntaVigilanciaProps) {
  if (rol === 'ADMINISTRADOR') return null;

  const campo = CAMPO_POR_ROL[rol];
  const error = mensajeError(campo.nombre);

  return (
    <div className="mb-4">
      <label htmlFor={`${idPrefijo}_${campo.nombre}`} className="mb-1.5 block text-sm font-medium text-ink">
        {campo.etiqueta} <span className="font-normal text-muted">(opcional)</span>
      </label>
      <input
        id={`${idPrefijo}_${campo.nombre}`}
        type="text"
        disabled={disabled}
        aria-invalid={Boolean(error)}
        className={className}
        maxLength={20}
        {...registrar(campo.nombre)}
      />
      {error ? (
        <p className="mt-1.5 text-xs text-danger">{error}</p>
      ) : (
        <p className="mt-1.5 text-xs text-muted">{campo.ayuda}</p>
      )}
    </div>
  );
}

export default CampoJuntaVigilancia;
