import SidebarBase, { type ItemNav } from '@/components/layout/SidebarBase';

const NAV_ADMIN: ItemNav[] = [
  { to: '/admin/usuarios', label: 'Usuarios', icon: 'ri-group-line' },
  { to: '/admin/especialidades', label: 'Especialidades', icon: 'ri-stethoscope-line' },
  { to: '/admin/asociar-especialidades', label: 'Asociar médicos', icon: 'ri-links-line' },
  { to: '/admin/horarios', label: 'Horarios', icon: 'ri-time-line' },
];

export function SidebarAdmin() {
  return <SidebarBase tituloSeccion="Administración" items={NAV_ADMIN} />;
}

export const SidebarAdministrador = SidebarAdmin;

export default SidebarAdmin;
