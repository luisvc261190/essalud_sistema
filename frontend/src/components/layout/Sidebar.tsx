import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Search,
  Users,
  Shield,
  Database,
  FileBarChart,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import "./Sidebar.css";

interface SidebarProps {
  collapsed: boolean;
  open: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, open, onToggle }) => {
  const { user, logout, tienePermiso } = useAuth();
  const location = useLocation();

  const menuItems = [
    {
      path: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      permission: null,
    },
    {
      path: "/solicitudes/nueva",
      label: "Nueva Solicitud",
      icon: FileText,
      permission: "CREAR_SOLICITUD",
    },
    {
      path: "/consultas",
      label: "Consultas",
      icon: Search,
      permission: "CONSULTAR_SOLICITUDES",
    },
    {
      path: "/usuarios",
      label: "Usuarios",
      icon: Users,
      permission: ["GESTIONAR_USUARIOS", "CREAR_USUARIOS"],
    },
    {
      path: "/auditoria",
      label: "Auditoría",
      icon: Shield,
      permission: "CONSULTAR_AUDITORIA",
    },
    {
      path: "/backups",
      label: "Respaldos",
      icon: Database,
      permission: "GESTIONAR_BACKUPS",
    },
    {
      path: "/reportes",
      label: "Reportes",
      icon: FileBarChart,
      permission: "EXPORTAR_REPORTES",
    },
  ];

  const filteredMenuItems = menuItems.filter((item) => {
    if (!item.permission) return true;
    const perms = Array.isArray(item.permission) ? item.permission : [item.permission];
    return perms.some((permiso) => tienePermiso(permiso));
  });

  const handleLogout = () => {
    logout();
  };

  return (
    <aside className={`sidebar ${collapsed ? "sidebar-collapsed" : ""} ${open ? "sidebar-open" : ""}`}>
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <img src="/essalud-logo.png" alt="EsSalud" className="sidebar-logo-desktop" />
            <img src="/logo-mobile.png" alt="EsSalud" className="sidebar-logo-mobile" />
          </div>
        </div>
        <button className="sidebar-toggle" onClick={onToggle}>
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <ul className="sidebar-menu">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={`sidebar-link ${isActive ? "sidebar-link-active" : ""}`}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon size={20} className="sidebar-link-icon" />
                  {!collapsed && (
                    <span className="sidebar-link-text">{item.label}</span>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User section */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">
            {user?.nombres?.[0] || user?.usuario?.[0] || "U"}
          </div>
          {!collapsed && (
            <div className="sidebar-user-info">
              <p className="sidebar-user-name">
                {user?.nombres} {user?.apellidos}
              </p>
              <p className="sidebar-user-role">{user?.roles?.[0] || "Usuario"}</p>
            </div>
          )}
        </div>
        
        <button
          className="sidebar-logout"
          onClick={handleLogout}
          title={collapsed ? "Cerrar Sesión" : undefined}
        >
          <LogOut size={20} />
          {!collapsed && <span>Cerrar Sesión</span>}
        </button>
      </div>
    </aside>
  );
};