import React from "react";
import {
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";

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

/* ============================================================
   RUTAS PROTEGIDAS
============================================================ */

const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  /*
   * Mientras se comprueba la sesión,
   * mostramos una pantalla de carga.
   */
  if (isLoading) {
    return <LoadingScreen message="Cargando sesión..." />;
  }

  /*
   * Si no está autenticado,
   * enviamos al login y guardamos
   * la ruta a la que quería acceder.
   */
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  /*
   * Usuario autenticado:
   * permite acceder a las rutas hijas.
   */
  return <Outlet />;
};


/* ============================================================
   RUTAS PÚBLICAS
============================================================ */

const PublicRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  /*
   * Mientras se comprueba la sesión,
   * no mostramos todavía el Login.
   */
  if (isLoading) {
    return <LoadingScreen message="Cargando sesión..." />;
  }

  /*
   * Si ya está autenticado,
   * no tiene sentido mostrar el Login.
   */
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  /*
   * No autenticado:
   * mostrar Login.
   */
  return <Outlet />;
};


/* ============================================================
   APP
============================================================ */

const App: React.FC = () => {
  return (
    <Routes>

      {/* ======================================================
          RUTAS PÚBLICAS
      ====================================================== */}

      <Route element={<PublicRoute />}>
        <Route
          path="/login"
          element={<Login />}
        />
      </Route>


      {/* ======================================================
          RUTAS PROTEGIDAS
      ====================================================== */}

      <Route element={<ProtectedRoute />}>

        <Route element={<Layout />}>

          {/* Inicio */}
          <Route
            path="/"
            element={
              <Navigate
                to="/dashboard"
                replace
              />
            }
          />

          {/* Dashboard */}
          <Route
            path="/dashboard"
            element={<Dashboard />}
          />

          {/* Nueva solicitud */}
          <Route
            path="/solicitudes/nueva"
            element={<NuevaSolicitud />}
          />

          {/* Detalle solicitud */}
          <Route
            path="/solicitudes/:id"
            element={<DetalleSolicitud />}
          />

          {/* Consultas */}
          <Route
            path="/consultas"
            element={<Consultas />}
          />

          {/* Usuarios */}
          <Route
            path="/usuarios"
            element={<Usuarios />}
          />

          {/* Auditoría */}
          <Route
            path="/auditoria"
            element={<Auditoria />}
          />

          {/* Respaldos */}
          <Route
            path="/backups"
            element={<Respaldos />}
          />

          {/* Reportes */}
          <Route
            path="/reportes"
            element={<Reportes />}
          />

        </Route>

      </Route>


      {/* ======================================================
          RUTA NO ENCONTRADA
      ====================================================== */}

      <Route
        path="*"
        element={
          <Navigate
            to="/dashboard"
            replace
          />
        }
      />

    </Routes>
  );
};

export default App;