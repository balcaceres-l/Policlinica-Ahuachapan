import SidebarBase, { type ItemNav } from '@/components/layout/SidebarBase';

const NAV_RECEPCIONISTA: ItemNav[] = [
  { to: '/secretaria/calendario', label: 'Calendario global', icon: 'ri-calendar-line' },
  { to: '/secretaria/citas', label: 'Citas y agendamiento', icon: 'ri-calendar-check-line' },
  { to: '/secretaria/pacientes', label: 'Pacientes', icon: 'ri-user-heart-line' },
  { to: '/secretaria/especialidades', label: 'Catálogo de especialidades', icon: 'ri-book-open-line' },
  { to: '/secretaria/bloqueos', label: 'Bloqueos de agenda', icon: 'ri-calendar-close-line' },
];

export function SidebarRecepcionista() {
  return <SidebarBase tituloSeccion="Recepción y Citas" items={NAV_RECEPCIONISTA} />;
}

export default SidebarRecepcionista;
