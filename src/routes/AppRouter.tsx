import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../features/auth/LoginPage';
import MainLayout from '../components/layout/MainLayout';
import DashboardPage from '../features/dashboard/DashboardPage';
import CajaVentaPage from '../features/caja/CajaVentaPage';
import VentasPage from '../features/ventas/VentasPage';
import ProductosPage from '../features/productos/ProductosPage';
import PersonasPage from '../features/personas/PersonasPage';
import FacturacionPage from '../features/facturacion/FacturacionPage';
import ReportesPage from '../features/reportes/ReportesPage';
import AuditoriaPage from '../features/auditoria/AuditoriaPage';
import { useAuthStore } from '../store/authStore';
import PrivateRoute from './PrivateRoute';
import CajaVentaLayout from '../components/layout/CajaVentaLayout';
import CuentaCorrientePage from '../features/cuentacorriente/CuentaCorrientePage';
import AdminCajaPage from '../features/caja/AdminCajaPage';

function RoleRouter() {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (user.rol === 'CAJERO') return <Navigate to="/caja" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Rutas ADMIN — con sidebar completo */}
        <Route element={<PrivateRoute><MainLayout /></PrivateRoute>}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/ventas" element={<VentasPage />} />
          <Route path="/productos" element={<ProductosPage />} />
          <Route path="/personas" element={<PersonasPage />} />
          <Route path="/facturacion" element={<FacturacionPage />} />
          <Route path="/cta-corriente" element={<CuentaCorrientePage />} />
          <Route path="/admin-caja" element={<AdminCajaPage />} />
          <Route path="/reportes" element={<ReportesPage />} />
          <Route path="/auditoria" element={<AuditoriaPage />} />
        </Route>

        {/* Rutas CAJERO — sin sidebar, pantalla completa */}
        <Route element={<PrivateRoute><CajaVentaLayout /></PrivateRoute>}>
          <Route path="/caja" element={<CajaVentaPage />} />
        </Route>

        <Route path="/" element={<RoleRouter />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}