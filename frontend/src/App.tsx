import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';
import LoginPage from '@/views/auth/LoginPage';
import AsociarEspecialidadesPage from '@/views/admin/AsociarEspecialidadesPage';
import EspecialidadesPage from '@/views/admin/EspecialidadesPage';
import ListaUsuariosPage from '@/views/admin/ListaUsuariosPage';
import CatalogoEspecialidadesPage from '@/views/secretaria/CatalogoEspecialidadesPage';

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
          </Route>
        </Route>

        {/* Catálogo de especialidades — RF-10 */}
        <Route element={<ProtectedRoute roles={['ADMINISTRADOR', 'RECEPCIONISTA', 'MEDICO']} />}>
          <Route element={<AppLayout />}>
            <Route path="/secretaria/especialidades" element={<CatalogoEspecialidadesPage />} />
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
