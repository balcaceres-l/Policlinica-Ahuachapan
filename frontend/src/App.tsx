import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';
import LoginPage from '@/views/auth/LoginPage';
import AsociarEspecialidadesPage from '@/views/admin/AsociarEspecialidadesPage';
import EspecialidadesPage from '@/views/admin/EspecialidadesPage';
import HorariosPage from '@/views/admin/HorariosPage';
import ListaUsuariosPage from '@/views/admin/ListaUsuariosPage';
import CatalogoEspecialidadesPage from '@/views/secretaria/CatalogoEspecialidadesPage';
import BloqueosAgendaPage from '@/views/secretaria/BloqueosAgendaPage';
import CalendarioGlobalPage from '@/views/secretaria/CalendarioGlobalPage';
import CitasRecepcionPage from '@/views/secretaria/CitasRecepcionPage';
import PacientesRecepcionPage from '@/views/secretaria/PacientesRecepcionPage';
import CalendarioPage from '@/views/medico/CalendarioPage';
import CitasPage from '@/views/medico/CitasPage';
import ExpedientePage from '@/views/medico/ExpedientePage';
import LaboratorioClinicoPage from '@/views/medico/LaboratorioClinicoPage';
import PacientesPage from '@/views/medico/PacientesPage';

// Los roles de cada ProtectedRoute deben coincidir con el middleware
// `role:` de backend/routes/api.php.
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Solo administrador — RF-04..RF-09 */}
        <Route element={<ProtectedRoute roles={['ADMINISTRADOR']} />}>
          <Route element={<AppLayout />}>
            <Route path="/admin/usuarios" element={<ListaUsuariosPage />} />
            <Route path="/admin/especialidades" element={<EspecialidadesPage />} />
            <Route path="/admin/asociar-especialidades" element={<AsociarEspecialidadesPage />} />
            {/* HU-34 */}
            <Route path="/admin/horarios" element={<HorariosPage />} />
          </Route>
        </Route>

        {/* Atención Médica (Doctor) */}
        <Route element={<ProtectedRoute roles={['MEDICO']} />}>
          <Route element={<AppLayout />}>
            <Route path="/medico/pacientes" element={<PacientesPage />} />
            <Route path="/medico/citas" element={<CitasPage />} />
            <Route path="/medico/calendario" element={<CalendarioPage />} />
            <Route path="/medico/expediente" element={<ExpedientePage />} />
            <Route path="/medico/laboratorio" element={<LaboratorioClinicoPage />} />
          </Route>
        </Route>

        {/* Recepción y Citas */}
        <Route element={<ProtectedRoute roles={['RECEPCIONISTA']} />}>
          <Route element={<AppLayout />}>
            {/* HU-09 — pantalla de inicio de la recepcionista */}
            <Route path="/secretaria/especialidades" element={<CatalogoEspecialidadesPage />} />
            <Route path="/secretaria/calendario" element={<CalendarioGlobalPage />} />
            <Route path="/secretaria/citas" element={<CitasRecepcionPage />} />
            <Route path="/secretaria/pacientes" element={<PacientesRecepcionPage />} />
            <Route path="/secretaria/bloqueos" element={<BloqueosAgendaPage />} />
          </Route>
        </Route>

        {/* Cualquier otra ruta pasa por el guard, que decide según sesión y rol. */}
        <Route element={<ProtectedRoute />}>
          <Route path="*" element={<Navigate to="/admin/usuarios" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
