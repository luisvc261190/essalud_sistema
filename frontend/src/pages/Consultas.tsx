import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Building,
  Hash,
  IdCard,
  User,
  ArrowRight,
  Download,
  FileText,
  Loader2,
  SlidersHorizontal,
} from "lucide-react";
import { Card, CardBody, Button, Badge, Alert, EmptyState } from "../components/ui";
import { PageHeader } from "../components/ui";
import { Pagination } from "../components/ui";
import {
  formatNIT,
  formatExpSGD,
  formatDNI,
  formatDisplayDate,
  validators,
} from "../utils/formatters";
import { consultasEndpoints, type ConsultaParams } from "../services/endpoints";
import { getErrorMessage } from "../services/api";
import { useAuth } from "../context/AuthContext";
import type { SolicitudResumen } from "../types";
import "./Consultas.css";

type Criterio = "nit" | "exp_sgd" | "dni_ce" | "asegurado_titular";
type OrdenCampo =
  | "nit"
  | "exp_sgd"
  | "fecha_recepcion"
  | "dni_ce"
  | "asegurado_titular"
  | "tipo_tramite";

const CRITERIOS: { value: Criterio; label: string; icon: React.ReactNode }[] = [
  { value: "nit", label: "NIT", icon: <Building size={18} /> },
  { value: "exp_sgd", label: "EXP SGD", icon: <Hash size={18} /> },
  { value: "dni_ce", label: "DNI/C.E.", icon: <IdCard size={18} /> },
  { value: "asegurado_titular", label: "Asegurado titular", icon: <User size={18} /> },
];

const PAGE_SIZE = 10;

export const Consultas: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [criterio, setCriterio] = useState<Criterio>("nit");
  const [valor, setValor] = useState("");
  const [cargado, setCargado] = useState(false);

  const [items, setItems] = useState<SolicitudResumen[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [ordenCampo, setOrdenCampo] = useState<OrdenCampo>("fecha_recepcion");
  const [ordenDir, setOrdenDir] = useState<"asc" | "desc">("desc");

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [busquedaActiva, setBusquedaActiva] = useState(false);

  // Cargar todos los registros al inicio
  const cargarTodos = useCallback(
    async (p = 1) => {
      setCargando(true);
      setError("");

      const params: ConsultaParams = {
        page: p,
        page_size: PAGE_SIZE,
        orden_campo: ordenCampo,
        orden_dir: ordenDir,
      };

      try {
        const response = await consultasEndpoints.buscar(params);
        setItems(response.items);
        setTotal(response.total);
        setPage(response.page);
        setCargado(true);
        setBusquedaActiva(false); // No es una búsqueda específica
      } catch (err) {
        setItems([]);
        setTotal(0);
        setCargado(true);
        setError(getErrorMessage(err));
      } finally {
        setCargando(false);
      }
    },
    [ordenCampo, ordenDir]
  );

  const validarValor = (): string | null => {
    const v = valor.trim();
    if (!v) return "Ingrese un valor de búsqueda";
    if (criterio === "nit" && !validators.nit(v))
      return "El NIT debe tener el formato XXXX-XXXX-NIT-XXXXXXX";
    if (criterio === "exp_sgd" && !validators.expSGD(v))
      return "El EXP SGD debe tener 16 dígitos e iniciar con 0";
    if (criterio === "dni_ce" && !validators.dniCE(v))
      return "El DNI/C.E. debe tener entre 5 y 10 caracteres alfanuméricos";
    if (criterio === "asegurado_titular" && v.length < 3)
      return "Ingrese al menos 3 caracteres";
    return null;
  };

  const ejecutarBusqueda = useCallback(
    async (p = 1) => {
      const validacion = validarValor();
      if (validacion) {
        setError(validacion);
        setCargado(false);
        return;
      }

      setCargando(true);
      setError("");
      setBusquedaActiva(true);

      const params: ConsultaParams = {
        [criterio]: valor.trim(),
        page: p,
        page_size: PAGE_SIZE,
        orden_campo: ordenCampo,
        orden_dir: ordenDir,
      };

      try {
        const response = await consultasEndpoints.buscar(params);
        setItems(response.items);
        setTotal(response.total);
        setPage(response.page);
        setCargado(true);
      } catch (err) {
        setItems([]);
        setTotal(0);
        setCargado(true);
        setError(getErrorMessage(err));
      } finally {
        setCargando(false);
      }
    },
    [criterio, valor, ordenCampo, ordenDir]
  );

  useEffect(() => {
    if (!cargado) return;
    if (busquedaActiva) {
      ejecutarBusqueda(page);
    } else {
      cargarTodos(page);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordenCampo, ordenDir]);

  // Cargar todos al inicio
  useEffect(() => {
    cargarTodos(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (criterio === "nit") setValor(formatNIT(raw));
    else if (criterio === "exp_sgd") setValor(formatExpSGD(raw));
    else if (criterio === "dni_ce") setValor(formatDNI(raw));
    else setValor(raw);
  };

  const handleCriterioChange = (c: Criterio) => {
    setCriterio(c);
    setValor("");
    setError("");
    // Solo limpiar resultados si hay búsqueda activa
    if (busquedaActiva) {
      setItems([]);
      setTotal(0);
      setCargado(false);
      setBusquedaActiva(false);
    }
  };

  const handleOrdenar = (campo: OrdenCampo) => {
    if (ordenCampo === campo) {
      setOrdenDir(ordenDir === "asc" ? "desc" : "asc");
    } else {
      setOrdenCampo(campo);
      setOrdenDir("asc");
    }
  };

  return (
    <div className="consultas-page">
      <PageHeader
        title="Consultas"
        subtitle="Búsqueda de actos administrativos por NIT, EXP SGD, DNI/C.E. o asegurado titular"
        icon={<Search size={24} />}
       
        actions={
          <Button
            variant="outline"
            icon={<Download size={18} />}
            title="Exportar los resultados en Excel (disponible en Reportes)"
            disabled={items.length === 0}
          >
            Exportar
          </Button>
        }
      />

      {/* Panel de búsqueda */}
      <Card className="consulta-busqueda-card">
        <CardBody>
          <div className="consulta-criterios">
            {CRITERIOS.map((c) => (
              <button
                key={c.value}
                className={`consulta-criterio ${
                  criterio === c.value ? "consulta-criterio-active" : ""
                }`}
                onClick={() => handleCriterioChange(c.value)}
              >
                {c.icon}
                <span>{c.label}</span>
              </button>
            ))}
          </div>

          <div className="consulta-input-row">
            <div className="consulta-input">
              <Search size={18} className="consulta-input-icon" />
              <input
                type="text"
                value={valor}
                onChange={handleInputChange}
                placeholder={
                  criterio === "nit"
                    ? "XXXX-XXXX-NIT-XXXXXXX"
                    : criterio === "exp_sgd"
                    ? "0" + "0".repeat(15)
                    : criterio === "dni_ce"
                    ? "Documento de identidad"
                    : "Nombres y apellidos del asegurado"
                }
                onKeyDown={(e) => e.key === "Enter" && ejecutarBusqueda(1)}
              />
            </div>
            <Button
              onClick={() => ejecutarBusqueda(1)}
              loading={cargando}
              icon={<Search size={18} />}
            >
              Buscar
            </Button>
          </div>

          <div className="consulta-formato">
            {criterio === "nit" &&
              "Formato: XXXX-XXXX-NIT-XXXXXXX (se autocompleta con ceros a la izquierda, ej. 12 → 00000012)"}
            {criterio === "exp_sgd" &&
              "16 dígitos, debe iniciar con 0 y se completan con ceros"}
            {criterio === "dni_ce" &&
              "Entre 5 y 10 caracteres alfanuméricos (DNI o Carné de Extranjería)"}
            {criterio === "asegurado_titular" &&
              "Mínimo 3 caracteres; búsqueda por coincidencia parcial"}
          </div>

          {error && (
            <Alert variant="error" className="consulta-alert" onClose={() => setError("")}>
              {error}
            </Alert>
          )}
        </CardBody>
      </Card>

      {/* Resultados */}
      {cargado && !cargando && (
        <Card className="consulta-resultados">
          <CardBody>
            <div className="consulta-resultados-header">
              <div>
                <h3>{busquedaActiva ? "Resultados de la búsqueda" : "Todos los registros"}</h3>
                <p>
                  {total} {total === 1 ? "registro encontrado" : "registros encontrados"}
                </p>
              </div>
              <div className="consulta-orden">
                <SlidersHorizontal size={16} />
                <span>Ordenar por:</span>
                <select
                  value={ordenCampo}
                  onChange={(e) => handleOrdenar(e.target.value as OrdenCampo)}
                >
                  <option value="fecha_recepcion">Fecha de recepción</option>
                  <option value="nit">NIT</option>
                  <option value="exp_sgd">EXP SGD</option>
                  <option value="dni_ce">DNI/C.E.</option>
                  <option value="asegurado_titular">Asegurado titular</option>
                  <option value="tipo_tramite">Tipo de trámite</option>
                </select>
                <button
                  className="consulta-dir-btn"
                  onClick={() =>
                    setOrdenDir(ordenDir === "asc" ? "desc" : "asc")
                  }
                  title={ordenDir === "asc" ? "Ascendente" : "Descendente"}
                >
                  {ordenDir === "asc" ? "↑" : "↓"}
                </button>
              </div>
            </div>

            {items.length === 0 ? (
              <EmptyState
                icon={<Search size={40} />}
                title={busquedaActiva ? "Sin resultados" : "Sin registros"}
                description={
                  busquedaActiva
                    ? "No se encontraron actos administrativos con los datos ingresados. Verifique el formato y vuelva a intentar."
                    : "No hay actos administrativos registrados en el sistema."
                }
              />
            ) : (
              <>
                <div className="consulta-table-wrap">
                  <table className="consulta-table">
                    <thead>
                      <tr>
                        <th onClick={() => handleOrdenar("nit")}>NIT</th>
                        <th onClick={() => handleOrdenar("exp_sgd")}>EXP SGD</th>
                        <th onClick={() => handleOrdenar("fecha_recepcion")}>
                          F. Recepción
                        </th>
                        <th onClick={() => handleOrdenar("dni_ce")}>DNI/C.E.</th>
                        <th onClick={() => handleOrdenar("asegurado_titular")}>
                          Asegurado Titular
                        </th>
                        <th onClick={() => handleOrdenar("tipo_tramite")}>Tipo</th>
                        <th>Resolución</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((s) => (
                        <tr
                          key={s.id}
                          className="consulta-fila"
                          onClick={() => navigate(`/solicitudes/${s.id}`)}
                          title="Ver detalle del trámite"
                        >
                          <td className="consulta-nit">{s.nit}</td>
                          <td className="consulta-mono">{s.exp_sgd}</td>
                          <td>{formatDisplayDate(s.fecha_recepcion)}</td>
                          <td className="consulta-mono">{s.dni_ce}</td>
                          <td>{s.asegurado_titular}</td>
                          <td>
                            <Badge
                              variant={s.tipo_tramite === "SEGURO" ? "primary" : "secondary"}
                              size="sm"
                            >
                              {s.tipo_tramite}
                            </Badge>
                          </td>
                          <td className="consulta-mono">
                            {s.resolucion
                              ? `${s.resolucion.numero_resolucion}-${s.resolucion.anio}`
                              : "—"}
                          </td>
                          <td>
                            <button
                              className="consulta-row-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/solicitudes/${s.id}`);
                              }}
                              aria-label="Ver detalle"
                            >
                              <ArrowRight size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="consulta-pagination">
                  <Pagination
                    page={page}
                    pageSize={PAGE_SIZE}
                    total={total}
                    onPageChange={(p) => {
                      setPage(p);
                      if (busquedaActiva) {
                        ejecutarBusqueda(p);
                      } else {
                        cargarTodos(p);
                      }
                    }}
                  />
                </div>
              </>
            )}
          </CardBody>
        </Card>
      )}

      {cargando && (
        <div className="consulta-cargando">
          <Loader2 size={26} className="spin" />
          <span>Buscando actos administrativos...</span>
        </div>
      )}

      {cargado && (
        <div className="consulta-footer">
          <FileText size={14} />
          <span>
            Usuario: {user?.usuario} · Acceso con permisos de{" "}
            <strong>CONSULTAR_SOLICITUDES</strong>
          </span>
        </div>
      )}
    </div>
  );
};