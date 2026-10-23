import { useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import CambiarPasswordModal from '@/components/auth/CambiarPasswordModal';
import Switch from '@/components/ui/Switch';
import useAuth from '@/hooks/auth/useAuth';
import useTheme from '@/hooks/useTheme';
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
    return 'flex cursor-not-allowed items-center gap-3 rounded-field px-3 py-2.5 text-sm font-medium text-brand-400 dark:text-slate-500';
  }

  return cn(
    'flex items-center gap-3 rounded-field px-3 py-2.5 text-sm font-medium transition-all duration-150',
    activo
      ? 'bg-brand-600 text-white shadow-card dark:bg-cyan-500/10 dark:text-cyan-400 dark:border dark:border-cyan-500/20 dark:shadow-sm dark:shadow-cyan-950/40'
      : 'text-brand-100 hover:bg-white/10 hover:text-white dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-[#162032] dark:border dark:border-transparent',
  );
};

interface SidebarBaseProps {
  tituloSeccion?: string;
  items: ItemNav[];
  children?: ReactNode;
}

export function SidebarBase({ tituloSeccion, items, children }: SidebarBaseProps) {
  const { usuario, cerrarSesion } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [modalPassword, setModalPassword] = useState(false);

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col bg-brand-800 dark:bg-[#060911] dark:border-r dark:border-[#233148] dark:shadow-xl dark:shadow-black/50 px-4 py-5 select-none transition-colors duration-200">
      {/* Marca institucional */}
      <div className="flex items-center gap-3 px-2 pb-5 border-b border-transparent dark:border-[#1E293B]/60">
        <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1 shadow-sm">
          <img
            src="/images/logo.png"
            alt="Logo Policlínica Ahuachapaneca"
            className="h-full w-full object-contain"
          />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold leading-tight text-white">Policlínica</p>
          <p className="truncate text-xs text-brand-200 dark:text-sky-400 font-medium">Ahuachapaneca</p>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto pr-1 mt-4">
        {tituloSeccion && (
          <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-brand-300 dark:text-slate-500">
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

      {/* Selector de modo oscuro */}
      <div className="mt-auto border-t border-white/10 dark:border-[#1E293B]/70 pt-3 pb-2">
        <div className="flex items-center justify-between rounded-lg px-2 py-1.5 transition-colors hover:bg-white/5 dark:hover:bg-slate-900/40">
          <div className="flex items-center gap-2 text-xs font-semibold text-brand-100 dark:text-slate-300">
            <i className={cn('text-base transition-colors', isDark ? 'ri-moon-clear-fill text-sky-400' : 'ri-sun-line text-amber-300')} />
            <span>Modo oscuro</span>
          </div>
          <Switch
            checked={isDark}
            onChange={toggleTheme}
            aria-label="Alternar modo oscuro"
          />
        </div>
      </div>

      {/* Usuario autenticado */}
      <div className="border-t border-white/10 dark:border-[#1E293B]/70 pt-3">
        <div className="flex items-center justify-between gap-2 rounded-xl px-2 py-2 dark:bg-[#090D16] dark:border dark:border-[#1E293B]/60">
          <div className="min-w-0 flex-1 pr-1">
            <p className="text-sm font-semibold text-white dark:text-slate-200 leading-tight truncate">
              {usuario?.nombreCompleto}
            </p>
            <p className="mt-0.5 truncate text-xs text-brand-200 dark:text-slate-400">
              {usuario ? `Rol: ${ROL_LABEL[usuario.rol]}` : ''}
            </p>
          </div>

          <div className="flex items-center shrink-0 gap-1">
            <button
              type="button"
              onClick={() => setModalPassword(true)}
              title="Cambiar contraseña"
              className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-brand-200 transition-colors hover:bg-white/10 hover:text-white dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-amber-400"
            >
              <i className="ri-key-2-line text-base" />
            </button>
            <button
              type="button"
              onClick={() => void cerrarSesion()}
              title="Cerrar sesión"
              className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-brand-200 transition-colors hover:bg-white/10 hover:text-white dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-rose-400"
            >
              <i className="ri-logout-box-r-line text-base" />
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
