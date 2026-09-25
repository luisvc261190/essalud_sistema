import React, { useState, useEffect } from "react";
import {
  FileBarChart,
  FileSignature,
  Scale,
  Gavel,
  Users,
  Shield,
  Heart,
  Loader2,
  AlertCircle,
  Download,
  BarChart3,
} from "lucide-react";
import { Card, CardBody, Button, Alert, EmptyState } from "../components/ui";
import { PageHeader } from "../components/ui";
import { reportesEndpoints } from "../services/endpoints";
import { getErrorMessage } from "../services/api";
import type { ResumenDashboard, Conteo } from "../types";
import "./Reportes.css";

export const Reportes: React.FC = () => {
  const [data, setData] = useState<ResumenDashboard | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    reportesEndpoints
      .resumen()
      .then(setData)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setCargando(false));
  }, []);

  const maxConteo = (arr: Conteo[]) =>
    Math.max(1, ...arr.map((c) => c.total));

  return (
    <div className="reportes-page">
      <PageHeader
        title="Reportes"
        subtitle="Estadísticas de los actos administrativos registrados"
        icon={<FileBarChart size={24} />}
       
        actions={
          <Button variant="outline" icon={<Download size={18} />} title="Próximamente: exportación de reportes en Excel">
            Exportar Excel
          </Button>
        }
      />

      {error && (
        <Alert variant="error" onClose={() => setError("")}>
          <AlertCircle size={20} />
          {error}
        </Alert>
      )}

      {cargando ? (
        <div className="reportes-cargando">
          <Loader2 size={26} className="spin" />
          <span>Generando reportes...</span>
        </div>
      ) : !data ? (
        <EmptyState
          icon={<BarChart3 size={40} />}
          title="Sin datos"
          description="No hay información disponible para mostrar."
        />
      ) : (
        <>
          {/* Tarjetas KPI */}
          <div className="reportes-kpis">
            <div className="reportes-kpi reportes-kpi-primary">
              <Users size={24} />
              <div>
                <strong>{data.total_solicitudes}</strong>
                <span>Total Solicitudes</span>
              </div>
            </div>
            <div className="reportes-kpi reportes-kpi-warning">
              <FileSignature size={24} />
              <div>
                <strong>{data.total_resoluciones}</strong>
                <span>Resoluciones</span>
              </div>
            </div>
            <div className="reportes-kpi reportes-kpi-success">
              <Scale size={24} />
              <div>
                <strong>{data.total_reconsideraciones}</strong>
                <span>Reconsideraciones</span>
              </div>
            </div>
            <div className="reportes-kpi reportes-kpi-error">
              <Gavel size={24} />
              <div>
                <strong>{data.total_apelaciones}</strong>
                <span>Apelaciones</span>
              </div>
            </div>
          </div>

          <div className="reportes-grid">
            {/* Por tipo de trámite */}
            <Card>
              <CardBody>
                <div className="reportes-title">
                  <div className="reportes-title-icon">
                    <Shield size={18} />
                    <Heart size={18} />
                  </div>
                  <h3>Por Tipo de Trámite</h3>
                </div>
                {data.por_tipo_tramite.length === 0 ? (
                  <p className="reportes-sin-datos">Sin registros</p>
                ) : (
                  <div className="reportes-barras">
                    {data.por_tipo_tramite.map((c) => (
                      <div className="reportes-barra" key={c.grupo}>
                        <div className="reportes-barra-label">
                          <span>{c.grupo}</span>
                          <strong>{c.total}</strong>
                        </div>
                        <div className="reportes-barra-track">
                          <div
                            className={`reportes-barra-fill ${c.grupo === "SEGURO" ? "reportes-barra-fill-primary" : "reportes-barra-fill-secondary"}`}
                            style={{ width: `${(c.total / maxConteo(data.por_tipo_tramite)) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Por año */}
            <Card>
              <CardBody>
                <div className="reportes-title">
                  <div className="reportes-title-icon reportes-title-icon-year">
                    <BarChart3 size={18} />
                  </div>
                  <h3>Por Año de Recepción</h3>
                </div>
                {data.por_anio.length === 0 ? (
                  <p className="reportes-sin-datos">Sin registros</p>
                ) : (
                  <div className="reportes-barras reportes-barras-vertical">
                    {data.por_anio.map((c) => (
                      <div className="reportes-cola" key={c.grupo}>
                        <div className="reportes-cola-label">
                          <span>{c.grupo}</span>
                          <strong>{c.total}</strong>
                        </div>
                        <div className="reportes-cola-bar">
                          <div
                            className="reportes-barra-fill reportes-barra-fill-year"
                            style={{ height: `${(c.total / maxConteo(data.por_anio)) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          {/* Por riesgo */}
          <Card>
            <CardBody>
              <div className="reportes-title">
                <div className="reportes-title-icon reportes-title-icon-risk">
                  <BarChart3 size={18} />
                </div>
                <h3>Por Riesgo / Decisión</h3>
              </div>
              {data.por_riesgo.length === 0 ? (
                <p className="reportes-sin-datos">Sin registros</p>
              ) : (
                <div className="reportes-barras">
                  {data.por_riesgo.map((c) => (
                    <div className="reportes-barra" key={c.grupo}>
                      <div className="reportes-barra-label">
                        <span title={c.grupo}>{c.grupo}</span>
                        <strong>{c.total}</strong>
                      </div>
                      <div className="reportes-barra-track">
                        <div
                          className="reportes-barra-fill reportes-barra-fill-risk"
                          style={{ width: `${(c.total / maxConteo(data.por_riesgo)) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          <div className="reportes-note">
            <Download size={14} />
            <span>
              La exportación a Excel estará disponible próximamente en este módulo.
            </span>
          </div>
        </>
      )}
    </div>
  );
};