import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import useAuth from '@/hooks/auth/useAuth';
import { ROL_LABEL } from '@/lib/constants/roles';

export function AppLayout() {
  const { usuario } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superior */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-line bg-surface px-6">
          <div className="flex items-center text-sm font-medium text-ink">
            <span>{usuario?.nombreCompleto}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              title="Notificaciones (pendiente)"
              className="flex size-9 cursor-not-allowed items-center justify-center rounded-field text-muted opacity-60"
            >
              <i className="ri-notification-3-line text-lg" />
            </button>
            <span className="rounded-full bg-royal-soft px-3 py-1 text-xs font-semibold text-royal">
              {usuario ? `Rol: ${ROL_LABEL[usuario.rol]}` : ''}
            </span>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
