import { useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import CambiarPasswordModal from '@/components/auth/CambiarPasswordModal';
import useAuth from '@/hooks/auth/useAuth';
import { ROL_LABEL } from '@/lib/constants/roles';
import { cn } from '@/lib/utils';

export interface ItemNav {
  to: string;
  label: string;
  icon: string;
  badge?: string;
  placeholder?: boolean;
}

const claseItemNav = (activo: boolean, placeholder = false) => {
  if (placeholder) {
    return 'flex cursor-not-allowed items-center gap-3 rounded-field px-3 py-2.5 text-sm font-medium text-brand-400';
  }

  return cn(
    'flex items-center gap-3 rounded-field px-3 py-2.5 text-sm font-medium transition-colors',
    activo
      ? 'bg-brand-600 text-white shadow-card'
      : 'text-brand-100 hover:bg-white/10 hover:text-white',
  );
};

interface SidebarBaseProps {
  tituloSeccion?: string;
  items: ItemNav[];
  children?: ReactNode;
}

export function SidebarBase({ tituloSeccion, items, children }: SidebarBaseProps) {
  const { usuario, cerrarSesion } = useAuth();
  const [modalPassword, setModalPassword] = useState(false);

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col bg-brand-800 px-4 py-5">
      {/* Marca institucional */}
      <div className="flex items-center gap-3 px-2 pb-6">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-field bg-white/10 text-white">
          <i className="ri-hospital-line text-xl" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold leading-tight text-white">Policlínica</p>
          <p className="truncate text-xs text-brand-200">Ahuachapaneca</p>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto pr-1">
        {tituloSeccion && (
          <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-brand-300">
            {tituloSeccion}
          </p>
        )}

        {items.map((item) =>
          item.placeholder ? (
            <span
              key={item.label}
              title="Módulo en desarrollo"
              className={claseItemNav(false, true)}
            >
              <i className={cn(item.icon, 'text-lg')} />
              <span className="truncate">{item.label}</span>
              <i className="ri-lock-line ml-auto text-xs" />
            </span>
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => claseItemNav(isActive)}
            >
              <i className={cn(item.icon, 'text-lg')} />
              <span className="truncate">{item.label}</span>
              {item.badge && (
                <span className="ml-auto rounded-full bg-white/20 px-2 py-0.5 text-[11px] text-white">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ),
        )}

        {children}
      </nav>

      {/* Usuario autenticado */}
      <div className="mt-auto border-t border-white/10 pt-4">
        <div className="flex items-center justify-between gap-2 rounded-field px-2 py-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white leading-tight break-words">
              {usuario?.nombreCompleto}
            </p>
            <p className="mt-0.5 truncate text-xs text-brand-200">
              {usuario ? `Rol: ${ROL_LABEL[usuario.rol]}` : ''}
            </p>
          </div>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => setModalPassword(true)}
              title="Cambiar contraseña"
              className="flex size-8 cursor-pointer items-center justify-center rounded-field text-brand-200 transition-colors hover:bg-white/10 hover:text-white"
            >
              <i className="ri-key-2-line text-lg" />
            </button>
            <button
              type="button"
              onClick={() => void cerrarSesion()}
              title="Cerrar sesión"
              className="flex size-8 cursor-pointer items-center justify-center rounded-field text-brand-200 transition-colors hover:bg-white/10 hover:text-white"
            >
              <i className="ri-logout-box-r-line text-lg" />
            </button>
          </div>
        </div>
      </div>

      <CambiarPasswordModal
        isOpen={modalPassword}
        onClose={() => setModalPassword(false)}
      />
    </aside>
  );
}

export default SidebarBase;
