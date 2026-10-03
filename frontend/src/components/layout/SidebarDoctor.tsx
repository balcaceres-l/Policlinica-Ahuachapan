import SidebarBase, { type ItemNav } from "@/components/layout/SidebarBase";

const NAV_DOCTOR: ItemNav[] = [
  {
    to: "/medico/sala-espera",
    label: "Lista de espera",
    icon: "ri-user-received-2-line",
  },
  { to: "/medico/citas", label: "Citas", icon: "ri-calendar-check-line" },
  { to: "/medico/calendario", label: "Calendario", icon: "ri-calendar-line" },
  {
    to: "/medico/expediente",
    label: "Expediente",
    icon: "ri-folder-user-line",
  },
  {
    to: "/medico/laboratorio",
    label: "Laboratorio clínico",
    icon: "ri-flask-line",
  },
];

export function SidebarDoctor() {
  return <SidebarBase tituloSeccion="Atención Médica" items={NAV_DOCTOR} />;
}

export const SidebarMedico = SidebarDoctor;

export default SidebarDoctor;
