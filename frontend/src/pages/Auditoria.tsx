import React, { useState, useEffect, useCallback } from "react";
import {
  Shield,
  Search,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardBody, Button, Badge, Alert, EmptyState, Select } from "../components/ui";
import { PageHeader, Pagination } from "../components/ui";
import { auditoriaEndpoints } from "../services/endpoints";
import { getErrorMessage } from "../services/api";
import type { AuditLog } from "../types";
import "./Auditoria.css";

const PAGE_SIZE = 10;

const ACCION_VARIANT: Record<string, "primary" | "secondary" | "success" | "warning" | "error" | "gray"> = {
  CREAR: "success",
  EDITAR: "primary",
  ELIMINAR: "error",
  CONSULTAR: "secondary",
  LOGIN: "secondary",
  LOGOUT: "gray",
};

const formatoHora = (iso: string) =>
  new Date(iso).toLocaleString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

export const Auditoria: React.FC = () => {
  const [items, setItems] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [usuario, setUsuario] = useState("");
  const [accion, setAccion] = useState("");
  const [entidad, setEntidad] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [aplicandoFiltros, setAplicandoFiltros] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [expandido, setExpandido] = useState<number | null>(null);

  const cargar = useCallback(
    async (p = 1, aplicar = false) => {
      setCargando(true);
      setError("");
      try {
        const response = await auditoriaEndpoints.listar({
          page: p,
          page_size: PAGE_SIZE,
          usuario: usuario.trim() || undefined,
          accion: accion || undefined,
          entidad: entidad.trim() || undefined,
          desde: desde || undefined,
          hasta: hasta || undefined,
        });
        setItems(response.items);
        setTotal(response.total);
        setPage(response.page);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setCargando(false);
        setAplicandoFiltros(false);
        if (aplicar) setExpandido(null);
      }
    },
    [usuario, accion, entidad, desde, hasta]
  );

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const aplicarFiltros = () => {
    setAplicandoFiltros(true);
    cargar(1, true);
  };

  const limpiarFiltros = () => {
    setUsuario("");
    setAccion("");
    setEntidad("");
    setDesde("");
    setHasta("");
    cargar(1, true);
  };

  return (
    <div className="auditoria-page">
      <PageHeader
        title="Auditoría"
        subtitle="Registro de trazabilidad de las operaciones realizadas en el sistema"
        icon={<Shield size={24} />}
       
      />

      {/* Filtros */}
      <Card>
        <CardBody>
          <div className="auditoria-filtros">
            <div className="auditoria-filtro">
              <label>Usuario</label>
              <div className="auditoria-input">
                <Search size={16} className="auditoria-input-icon" />
                <input
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  placeholder="usuario"
                  onKeyDown={(e) => e.key === "Enter" && aplicarFiltros()}
                />
              </div>
            </div>
            <div className="auditoria-filtro">
              <label>Acción</label>
              <Select
                placeholder="Todas"
                options={[
                  { value: "CREAR", label: "CREAR" },
                  { value: "EDITAR", label: "EDITAR" },
                  { value: "ELIMINAR", label: "ELIMINAR" },
                  { value: "CONSULTAR", label: "CONSULTAR" },
                  { value: "LOGIN", label: "LOGIN" },
                  { value: "LOGOUT", label: "LOGOUT" },
                ]}
                value={accion}
                onChange={setAccion}
              />
            </div>
            <div className="auditoria-filtro">
              <label>Entidad</label>
              <input
                value={entidad}
                onChange={(e) => setEntidad(e.target.value)}
                placeholder="solicitudes, users, ..."
                onKeyDown={(e) => e.key === "Enter" && aplicarFiltros()}
              />
            </div>
            <div className="auditoria-filtro">
              <label>Desde</label>
              <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
            </div>
            <div className="auditoria-filtro">
              <label>Hasta</label>
              <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
            </div>
            <div className="auditoria-filtros-acc">
              <Button onClick={aplicarFiltros} loading={aplicandoFiltros} icon={<Search size={16} />}>
                Filtrar
              </Button>
              <Button variant="ghost" onClick={limpiarFiltros} disabled={aplicandoFiltros}>
                Limpiar
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {error && (
        <Alert variant="error" onClose={() => setError("")}>
          <AlertCircle size={20} />
          {error}
        </Alert>
      )}

      {/* Resultados */}
      <Card>
        <CardBody>
          {cargando ? (
            <div className="auditoria-cargando">
              <Loader2 size={26} className="spin" />
              <span>Cargando registros de auditoría...</span>
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={<Shield size={40} />}
              title="Sin registros"
              description="No se encontraron movimientos con los filtros indicados."
            />
          ) : (
            <>
              <div className="auditoria-lista">
                {items.map((log) => {
                  const expand = expandido === log.id;
                  return (
                    <div
                      key={log.id}
                      className={`auditoria-item ${expand ? "auditoria-item-expandido" : ""}`}
                    >
                      <button
                        className="auditoria-item-header"
                        onClick={() => setExpandido(expand ? null : log.id)}
                      >
                        <Badge variant={ACCION_VARIANT[log.accion] || "gray"} size="sm">
                          {log.accion}
                        </Badge>
                        <span className="auditoria-entidad">{log.entidad}</span>
                        <span className="auditoria-registro">#{log.registro_id ?? "—"}</span>
                        <span className="auditoria-usuario">{log.usuario || "sistema"}</span>
                        <span className="auditoria-hora">{formatoHora(log.created_at)}</span>
                        {expand ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                      {expand && (
                        <div className="auditoria-detalle">
                          <div className="auditoria-detalle-info">
                            <span>
                              <strong>IP:</strong> {log.ip || "—"}
                            </span>
                            <span>
                              <strong>Registro ID:</strong> {log.registro_id ?? "—"}
                            </span>
                          </div>
                          <div className="auditoria-detalle-columnas">
                            {(log.informacion_anterior || log.informacion_nueva) && (
                              <pre className="auditoria-json">
                                {JSON.stringify(
                                  { anterior: log.informacion_anterior, nueva: log.informacion_nueva },
                                  null,
                                  2
                                )}
                              </pre>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="auditoria-pagination">
                <Pagination
                  page={page}
                  pageSize={PAGE_SIZE}
                  total={total}
                  onPageChange={setPage}
                />
              </div>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
};