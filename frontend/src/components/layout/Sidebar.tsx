import useAuth from '@/hooks/auth/useAuth';
import SidebarAdmin from '@/components/layout/SidebarAdmin';
import SidebarDoctor from '@/components/layout/SidebarDoctor';
import SidebarRecepcionista from '@/components/layout/SidebarRecepcionista';

export { SidebarAdmin, SidebarDoctor, SidebarRecepcionista };
export { SidebarMedico } from '@/components/layout/SidebarDoctor';
export { SidebarAdministrador } from '@/components/layout/SidebarAdmin';

/**
 * Despachador principal del Sidebar según el rol del usuario autenticado.
 * - MEDICO -> SidebarDoctor
 * - RECEPCIONISTA -> SidebarRecepcionista
 * - ADMINISTRADOR (o por defecto) -> SidebarAdmin
 */
export function Sidebar() {
  const { usuario } = useAuth();

  switch (usuario?.rol) {
    case 'MEDICO':
      return <SidebarDoctor />;
    case 'RECEPCIONISTA':
      return <SidebarRecepcionista />;
    case 'ADMINISTRADOR':
      return <SidebarAdmin />;
    default:
      return <SidebarAdmin />;
  }
}

export default Sidebar;
