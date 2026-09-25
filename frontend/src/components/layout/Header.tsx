import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Bell, Menu } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import "./Header.css";

interface HeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

const ROUTE_INFO: { prefix: string; title: string; subtitle: string }[] = [
  { prefix: "/solicitudes/nueva", title: "Nueva Solicitud", subtitle: "Registro de acto administrativo paso a paso" },
  { prefix: "/solicitudes/", title: "Detalle del Trámite", subtitle: "Información completa del acto administrativo" },
  { prefix: "/consultas", title: "Consultas", subtitle: "Búsqueda de actos administrativos" },
  { prefix: "/usuarios", title: "Usuarios", subtitle: "Gestión de usuarios y roles" },
  { prefix: "/auditoria", title: "Auditoría", subtitle: "Trazabilidad de las operaciones" },
  { prefix: "/backups", title: "Respaldos", subtitle: "Copias de seguridad y restauración" },
  { prefix: "/reportes", title: "Reportes", subtitle: "Estadísticas y resumen del sistema" },
];

export const Header: React.FC<HeaderProps> = ({
  sidebarOpen,
  onToggleSidebar,
}) => {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const isDashboard = pathname === "/dashboard";
  const [currentDateTime, setCurrentDateTime] = useState(() => new Date());

  useEffect(() => {
    const updateDateTime = () => setCurrentDateTime(new Date());
    const interval = window.setInterval(updateDateTime, 30_000);

    return () => window.clearInterval(interval);
  }, []);

  const currentDate = currentDateTime.toLocaleDateString("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const currentTime = currentDateTime.toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const info =
    ROUTE_INFO.find((r) => pathname.startsWith(r.prefix)) || ROUTE_INFO[ROUTE_INFO.length - 1];

  return (
    <header className="header">
      <div className="header-left">
        <button
          className="header-menu-btn mobile-only"
          onClick={onToggleSidebar}
          aria-controls="app-sidebar"
          aria-expanded={sidebarOpen}
          aria-label={sidebarOpen ? "Cerrar menú" : "Abrir menú"}
        >
          <Menu size={24} />
        </button>

        <div className="header-breadcrumb">
          {isDashboard ? (
            <>
              <h1>Bienvenido, {user?.nombres || user?.usuario || "Usuario"}</h1>
              <p>Gestión de Actos Administrativos - EsSalud</p>
            </>
          ) : (
            <>
              <h1>{info.title}</h1>
              <p>{info.subtitle}</p>
            </>
          )}
        </div>
      </div>

      <div className="header-center" aria-label="Fecha y hora actual">
        <span className="header-center-date">{currentDate}</span>
        <span className="header-center-separator" aria-hidden="true">·</span>
        <span className="header-center-time">{currentTime}</span>
      </div>

      <div className="header-right">
        {/* Notificaciones */}
        <button className="header-notification" title="Sin notificaciones nuevas" aria-label="Notificaciones">
          <Bell size={20} />
        </button>

        {/* Info del usuario */}
        <div className="header-user">
          <div className="header-user-info">
            <p className="header-user-name">
              {user?.nombres} {user?.apellidos}
            </p>
            <p className="header-user-role">{user?.roles?.[0] || "Usuario"}</p>
          </div>
          <div className="header-user-avatar">
            {user?.nombres?.[0] || user?.usuario?.[0] || "U"}
          </div>
        </div>
      </div>
    </header>
  );
};