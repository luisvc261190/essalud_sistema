import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  FileSignature,
  Scale,
  Gavel,
  Shield,
  Heart,
  TrendingUp,
  Calendar,
  Loader2,
  Plus,
  Search,
  AlertCircle,
} from "lucide-react";
import { Card, CardHeader, CardBody, Badge, Alert } from "../components/ui";
import { getErrorMessage } from "../services/api";
import { reportesEndpoints } from "../services/endpoints";
import { useAuth } from "../context/AuthContext";
import type { ResumenDashboard } from "../types";
import "./Dashboard.css";

export const Dashboard: React.FC = () => {
  const { user, tienePermiso } = useAuth();
  const [stats, setStats] = useState<ResumenDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    reportesEndpoints
      .resumen()
      .then(setStats)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <Loader2 size={28} className="loading-spinner" />
        <p>Cargando dashboard...</p>
      </div>
    );
  }

  const porTipo = (tipo: string) =>
    stats?.por_tipo_tramite.find((c) => c.grupo === tipo)?.total || 0;

  return (
    <div className="dashboard">
      {/* Welcome Section */}
      <div className="dashboard-welcome">
        <div className="welcome-content">
          <h1>
            Bienvenido, {user?.nombres || user?.usuario}
          </h1>
          <p>Gestión de Actos Administrativos - EsSalud</p>
          <div className="welcome-date">
            <Calendar size={16} />
            <span>
              {new Date().toLocaleDateString("es-PE", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="error" onClose={() => setError("")}>
          <AlertCircle size={20} />
          {error}
        </Alert>
      )}

      {/* Stats Grid */}
      <div className="dashboard-stats">
        <Card className="stat-card stat-primary" hover>
          <CardBody>
            <div className="stat-content">
              <div className="stat-info">
                <h3>{stats?.total_solicitudes || 0}</h3>
                <p>Total Solicitudes</p>
                <Badge variant="primary" size="sm">
                  <FileText size={12} />
                  Registrados en el sistema
                </Badge>
              </div>
              <div className="stat-icon stat-icon-primary">
                <FileText size={24} />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="stat-card stat-warning" hover>
          <CardBody>
            <div className="stat-content">
              <div className="stat-info">
                <h3>{stats?.total_resoluciones || 0}</h3>
                <p>Resoluciones</p>
                <Badge variant="warning" size="sm">
                  <FileSignature size={12} />
                  Emitidas
                </Badge>
              </div>
              <div className="stat-icon stat-icon-warning">
                <FileSignature size={24} />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="stat-card stat-success" hover>
          <CardBody>
            <div className="stat-content">
              <div className="stat-info">
                <h3>{stats?.total_reconsideraciones || 0}</h3>
                <p>Reconsideraciones</p>
                <Badge variant="success" size="sm">
                  <Scale size={12} />
                  Recursos
                </Badge>
              </div>
              <div className="stat-icon stat-icon-success">
                <Scale size={24} />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="stat-card stat-error" hover>
          <CardBody>
            <div className="stat-content">
              <div className="stat-info">
                <h3>{stats?.total_apelaciones || 0}</h3>
                <p>Apelaciones</p>
                <Badge variant="error" size="sm">
                  <Gavel size={12} />
                  Recursos
                </Badge>
              </div>
              <div className="stat-icon stat-icon-error">
                <Gavel size={24} />
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="dashboard-content">
        {/* Distribución por tipo de trámite */}
        <Card className="dashboard-activity">
          <CardHeader>
            <h3>Distribución por Tipo de Trámite</h3>
          </CardHeader>
          <CardBody>
            <div className="dashboard-tipos">
              <div className="dashboard-tipo">
                <div className="dashboard-tipo-icon dashboard-tipo-seguro">
                  <Shield size={20} />
                </div>
                <div>
                  <strong>SEGURO</strong>
                  <span>{porTipo("SEGURO")} solicitudes</span>
                </div>
              </div>
              <div className="dashboard-tipo">
                <div className="dashboard-tipo-icon dashboard-tipo-subsidio">
                  <Heart size={20} />
                </div>
                <div>
                  <strong>SUBSIDIO</strong>
                  <span>{porTipo("SUBSIDIO")} solicitudes</span>
                </div>
              </div>
            </div>
            <div className="dashboard-tipo-bar">
              <div
                className="dashboard-tipo-bar-seguro"
                style={{ flex: `${porTipo("SEGURO")}` }}
              />
              <div
                className="dashboard-tipo-bar-subsidio"
                style={{ flex: `${Math.max(1, porTipo("SUBSIDIO"))}` }}
              />
            </div>
            {stats?.por_anio && stats.por_anio.length > 0 && (
              <div className="dashboard-anios">
                {stats.por_anio.map((c) => (
                  <div key={c.grupo} className="dashboard-anio">
                    <strong>{c.total}</strong>
                    <span>{c.grupo}</span>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Acciones Rápidas */}
        <Card className="dashboard-actions">
          <CardHeader>
            <h3>Acciones Rápidas</h3>
          </CardHeader>
          <CardBody>
            <div className="quick-actions">
              {tienePermiso("CREAR_SOLICITUD") && (
                <Link to="/solicitudes/nueva" className="quick-action">
                  <Plus size={20} />
                  <span>Nueva Solicitud</span>
                </Link>
              )}

              {tienePermiso("CONSULTAR_SOLICITUDES") && (
                <Link to="/consultas" className="quick-action">
                  <Search size={20} />
                  <span>Buscar Trámites</span>
                </Link>
              )}

              {tienePermiso("EXPORTAR_REPORTES") && (
                <Link to="/reportes" className="quick-action">
                  <TrendingUp size={20} />
                  <span>Ver Reportes</span>
                </Link>
              )}

              {tienePermiso("GESTIONAR_BACKUPS") && (
                <Link to="/backups" className="quick-action">
                  <FileSignature size={20} />
                  <span>Crear Respaldo</span>
                </Link>
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};