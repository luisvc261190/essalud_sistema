import React from "react";
import { useLocation } from "react-router-dom";
import { Bell, Menu } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import "./Header.css";

interface HeaderProps {
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
  { prefix: "/dashboard", title: "Dashboard", subtitle: "Bienvenido al sistema de gestión de actos administrativos" },
];

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { user } = useAuth();
  const { pathname } = useLocation();

  const info =
    ROUTE_INFO.find((r) => pathname.startsWith(r.prefix)) || ROUTE_INFO[ROUTE_INFO.length - 1];

  return (
    <header className="header">
      <div className="header-left">
        <button
          className="header-menu-btn mobile-only"
          onClick={onToggleSidebar}
          aria-label="Abrir menú"
        >
          <Menu size={24} />
        </button>

        <div className="header-breadcrumb">
          <h1>{info.title}</h1>
          <p>{info.subtitle}</p>
        </div>
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