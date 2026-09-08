import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import CambiarPasswordModal from '@/components/auth/CambiarPasswordModal';
import useAuth from '@/hooks/auth/useAuth';
import { ROL_LABEL } from '@/lib/constants/roles';
import { cn, getIniciales } from '@/lib/utils';

interface ItemNav {
  to: string;
  label: string;
  icon: string;
  /** Módulos de otros compañeros: visibles pero no navegables */
  placeholder?: boolean;
}

const NAV_ADMIN: ItemNav[] = [
  { to: '/admin/usuarios', label: 'Usuarios', icon: 'ri-group-line' },
  { to: '/admin/especialidades', label: 'Especialidades', icon: 'ri-stethoscope-line' },
  { to: '/admin/asociar-especialidades', label: 'Asociar médicos', icon: 'ri-links-line' },
  { to: '/secretaria/especialidades', label: 'Catálogo (Recepción)', icon: 'ri-book-open-line' },
];

const NAV_PLACEHOLDER: ItemNav[] = [
  { to: '#', label: 'Horarios', icon: 'ri-time-line', placeholder: true },
  { to: '#', label: 'Calendario', icon: 'ri-calendar-line', placeholder: true },
  { to: '#', label: 'Pacientes', icon: 'ri-user-heart-line', placeholder: true },
  { to: '#', label: 'Fila del día', icon: 'ri-list-ordered', placeholder: true },
  { to: '#', label: 'Expediente', icon: 'ri-folder-user-line', placeholder: true },
];

const claseItem = (activo: boolean) =>
  cn(
    'flex items-center gap-3 rounded-field px-3 py-2.5 text-sm font-medium transition-colors',
    activo
      ? 'bg-brand-600 text-white shadow-card'
      : 'text-brand-100 hover:bg-white/10 hover:text-white',
  );

export function Sidebar() {
  const { usuario, cerrarSesion } = useAuth();
  const [modalPassword, setModalPassword] = useState(false);

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col bg-brand-800 px-4 py-5">
      {/* Marca */}
      <div className="flex items-center gap-3 px-2 pb-6">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-field bg-white/10 text-white">
          <i className="ri-hospital-line text-xl" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold leading-tight text-white">Policlínica</p>
          <p className="truncate text-xs text-brand-200">Ahuachapaneca</p>
        </div>
      </div>

      {/* Navegación principal */}
      <nav className="flex flex-col gap-1">
        <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-brand-300">
          Administración
        </p>
        {NAV_ADMIN.map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => claseItem(isActive)}>
            <i className={cn(item.icon, 'text-lg')} />
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}

        <p className="px-3 pb-1 pt-5 text-[10px] font-bold uppercase tracking-wider text-brand-300">
          Próximos módulos
        </p>
        {NAV_PLACEHOLDER.map((item) => (
          <span
            key={item.label}
            title="Módulo a cargo de otro integrante del equipo"
            className="flex cursor-not-allowed items-center gap-3 rounded-field px-3 py-2.5 text-sm font-medium text-brand-400"
          >
            <i className={cn(item.icon, 'text-lg')} />
            <span className="truncate">{item.label}</span>
            <i className="ri-lock-line ml-auto text-xs" />
          </span>
        ))}
      </nav>

      {/* Usuario autenticado — HU-01 */}
      <div className="mt-auto border-t border-white/10 pt-4">
        <div className="flex items-center gap-3 rounded-field px-2 py-2">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-sm font-bold text-white">
            {usuario ? getIniciales(usuario.nombreCompleto) : ''}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{usuario?.nombreCompleto}</p>
            <p className="truncate text-xs text-brand-200">
              {usuario ? `Rol: ${ROL_LABEL[usuario.rol]}` : ''}
            </p>
          </div>
          {/* HU-02 — disponible para los tres roles */}
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

      <CambiarPasswordModal
        isOpen={modalPassword}
        onClose={() => setModalPassword(false)}
      />
    </aside>
  );
}

export default Sidebar;
