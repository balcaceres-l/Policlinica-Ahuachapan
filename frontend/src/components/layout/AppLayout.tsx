import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import useAuth from '@/hooks/auth/useAuth';

export function AppLayout() {
  const { usuario } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden bg-canvas dark:bg-[#090E17]">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superior */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-line bg-surface dark:bg-[#0A101D]/70 dark:backdrop-blur-md dark:border-[#1E293B] px-6 transition-colors">
          <div className="flex items-center text-sm font-medium text-ink dark:text-white">
            <span>{usuario?.nombreCompleto}</span>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto p-6 lg:p-8 dark:bg-[#0B111E]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
