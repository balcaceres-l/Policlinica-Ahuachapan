import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import AsociarEspecialidadesPage from '@/views/admin/AsociarEspecialidadesPage';
import EspecialidadesPage from '@/views/admin/EspecialidadesPage';
import ListaUsuariosPage from '@/views/admin/ListaUsuariosPage';
import CatalogoEspecialidadesPage from '@/views/secretaria/CatalogoEspecialidadesPage';

/**
 * Rutas SIN autenticación — el ProtectedRoute real lo implementará
 * el compañero a cargo del módulo de login (HU-01/HU-02).
 */
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/admin/usuarios" replace />} />
          <Route path="/admin/usuarios" element={<ListaUsuariosPage />} />
          <Route path="/admin/especialidades" element={<EspecialidadesPage />} />
          <Route path="/admin/asociar-especialidades" element={<AsociarEspecialidadesPage />} />
          <Route path="/secretaria/especialidades" element={<CatalogoEspecialidadesPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/admin/usuarios" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
