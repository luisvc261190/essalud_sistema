import React, { useEffect } from "react";
import { Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { Login } from "./pages/Login";
import { Layout } from "./components/layout/Layout";
import { Dashboard } from "./pages/Dashboard";
import { NuevaSolicitud } from "./pages/NuevaSolicitud";
import { Consultas } from "./pages/Consultas";
import { DetalleSolicitud } from "./pages/DetalleSolicitud";
import { Usuarios } from "./pages/Usuarios";
import { Auditoria } from "./pages/Auditoria";
import { Respaldos } from "./pages/Respaldos";
import { Reportes } from "./pages/Reportes";
import { LoadingScreen } from "./components/ui/LoadingScreen";

const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingScreen message="Cargando sesión..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

const AuthLayout: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      // No-op: ruta pública Login/redirects are handled below
    }
  }, [isAuthenticated, isLoading]);

  return <Outlet />;
};

const App: React.FC = () => {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/solicitudes/nueva" element={<NuevaSolicitud />} />
          <Route path="/solicitudes/:id" element={<DetalleSolicitud />} />
          <Route path="/consultas" element={<Consultas />} />
          <Route path="/usuarios" element={<Usuarios />} />
          <Route path="/auditoria" element={<Auditoria />} />
          <Route path="/backups" element={<Respaldos />} />
          <Route path="/reportes" element={<Reportes />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default App;