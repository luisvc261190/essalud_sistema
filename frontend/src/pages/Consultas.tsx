import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
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
  Layers,
  X,
} from "lucide-react";
import { Card, CardBody, Button, Badge, Alert, EmptyState } from "../components/ui";
import { PageHeader } from "../components/ui";
import { Pagination } from "../components/ui";
import {
  MIN_BUSQUEDA,
  MAX_BUSQUEDA,
  PARAMETRO_BUSQUEDA,
  formatDisplayDate,
  normalizarBusqueda,
  resaltar,
  terminoBusqueda,
  type CriterioBusqueda,
} from "../utils/formatters";
import {
  consultasEndpoints,
  type ConsultaOpciones,
  type ConsultaParams,
} from "../services/endpoints";
import { getErrorMessage } from "../services/api";
import { useAuth } from "../context/AuthContext";
import type { SolicitudResumen } from "../types";
import "./Consultas.css";

type OrdenCampo =
  | "nit"
  | "exp_sgd"
  | "fecha_recepcion"
  | "dni_ce"
  | "asegurado_titular"
  | "tipo_tramite";

const CRITERIOS: {
  value: CriterioBusqueda;
  label: string;
  icon: React.ReactNode;
}[] = [
  { value: "todos", label: "Todos los campos", icon: <Layers size={18} /> },
  { value: "nit", label: "NIT", icon: <Building size={18} /> },
  { value: "exp_sgd", label: "EXP SGD", icon: <Hash size={18} /> },
  { value: "dni_ce", label: "DNI/C.E.", icon: <IdCard size={18} /> },
  {
    value: "asegurado_titular",
    label: "Asegurado titular",
    icon: <User size={18} />,
  },
];

const PLACEHOLDERS: Record<CriterioBusqueda, string> = {
  todos: "NIT, EXP SGD, DNI/C.E. o asegurado titular",
  nit: "XXXX-XXXX-NIT-XXXXXXX",
  exp_sgd: "0".repeat(16),
  dni_ce: "Documento de identidad",
  asegurado_titular: "Nombres y apellidos del asegurado",
};

const AYUDA: Record<CriterioBusqueda, string> = {
  todos:
    "Busca a la vez en NIT, EXP SGD, DNI/C.E. y asegurado titular. Los resultados se actualizan mientras escribe.",
  nit: "Formato: XXXX-XXXX-NIT-XXXXXXX. Escriba los dígitos (se completan con ceros a la izquierda, ej. 12 → 0000012) y los resultados se actualizan al instante.",
  exp_sgd: "16 dígitos, siempre inicia en 0. Los resultados se actualizan al instante.",
  dni_ce: "Entre 5 y 10 caracteres alfanuméricos (DNI o Carné de Extranjería).",
  asegurado_titular: "Mínimo 3 caracteres; coincidencia parcial.",
};

const PAGE_SIZE = 10;
/**
 * Espera antes de consultar al backend mientras el usuario escribe.
 *
 * Antes eran 300 ms, que se Sumaban a los ~400 ms de red y se convirtian en
 * mas de un segundo de espera. 120 ms sigue absorbiendo la pulsacion rapida sin
 * añadir demora perceptible, y cada peticion que se lanza antes se cancela.
 */
const DEBOUNCE_MS = 120;
/**
 * Vigencia en cache de una respuesta de busqueda. Al borrar caracteres y
 * volver a escribir lo mismo, el resultado se pinta al instante sin pedirlo
 * otra vez al servidor.
 */
const CACHE_BUSQUEDA_MS = 5_000;

export const Consultas: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [criterio, setCriterio] = useState<CriterioBusqueda>("nit");
  const [valor, setValor] = useState("");
  const [cargado, setCargado] = useState(false);

  const [items, setItems] = useState<SolicitudResumen[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [ordenCampo, setOrdenCampo] = useState<OrdenCampo>("fecha_recepcion");
  const [ordenDir, setOrdenDir] = useState<"asc" | "desc">("desc");

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  // Identifica la petición en curso para descartar respuestas que lleguen tarde.
  const peticionActual = useRef(0);
  // Cancela la petición en vuelo: mientras el usuario escribe no hay que
  // esperar a que terminen las anteriores.
  const abortador = useRef<AbortController | null>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  const termino = terminoBusqueda(criterio, valor);
  const hayBusqueda = termino.length > 0;
  /** El usuario ya escribió bastante, pero la búsqueda se dispara de todos modos. */
  const esperandoMinimo =
    valor.trim().length > 0 && !hayBusqueda;

  const consultar = useCallback(
    async (params: ConsultaParams, opciones: ConsultaOpciones = {}) => {
      const id = ++peticionActual.current;
      abortador.current?.abort();
      const control = new AbortController();
      abortador.current = control;
      setCargando(true);
      try {
        const response = await consultasEndpoints.buscar(params, {
          ...opciones,
          signal: control.signal,
        });
        if (id !== peticionActual.current) return; // respuesta obsoleta
        setItems(response.items);
        setTotal(response.total);
        setPage(response.page);
        setCargado(true);
        setError("");
      } catch (err) {
        if (id !== peticionActual.current) return;
        if (axios.isCancel(err)) return; // el usuario siguió escribiendo
        setItems([]);
        setTotal(0);
        setCargado(true);
        setError(getErrorMessage(err));
      } finally {
        if (id === peticionActual.current) setCargando(false);
      }
    },
    []
  );

  // Listado completo cuando no hay término de búsqueda.
  const listarTodos = useCallback(
    (p = 1, opciones: ConsultaOpciones = {}) =>
      consultar(
        {
          page: p,
          page_size: PAGE_SIZE,
          orden_campo: ordenCampo,
          orden_dir: ordenDir,
        },
        opciones
      ),
    [consultar, ordenCampo, ordenDir]
  );

  /**
   * Un unico efecto decide que se muestra. Antes había dos efectos y cada
   * cambio de orden lanzaba dos peticiones (una sin filtro y otra con el),
   * ademas de perder la primera búsqueda escrita durante la carga inicial.
   */
  useEffect(() => {
    if (temporizador.current) clearTimeout(temporizador.current);

    if (!hayBusqueda) {
      listarTodos(1);
      return;
    }

    temporizador.current = setTimeout(() => {
      consultar(
        {
          [PARAMETRO_BUSQUEDA[criterio]]: termino,
          page: 1,
          page_size: PAGE_SIZE,
          orden_campo: ordenCampo,
          orden_dir: ordenDir,
        },
        { cacheTTL: CACHE_BUSQUEDA_MS }
      );
    }, DEBOUNCE_MS);

    return () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, [criterio, termino, hayBusqueda, ordenCampo, ordenDir, consultar, listarTodos]);

  // Si la página se abandona, se cancela lo que estivera en vuelo.
  useEffect(() => () => abortador.current?.abort(), []);

  const irAPagina = (p: number) => {
    if (hayBusqueda) {
      consultar({
        [PARAMETRO_BUSQUEDA[criterio]]: termino,
        page: p,
        page_size: PAGE_SIZE,
        orden_campo: ordenCampo,
        orden_dir: ordenDir,
      });
    } else {
      listarTodos(p);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValor(normalizarBusqueda(criterio, e.target.value));
  };

  const handleCriterioChange = (c: CriterioBusqueda) => {
    setCriterio(c);
    setValor("");
    setError("");
  };

  const limpiarBusqueda = () => {
    setValor("");
    setError("");
  };

  const handleOrdenar = (campo: OrdenCampo) => {
    if (ordenCampo === campo) {
      setOrdenDir(ordenDir === "asc" ? "desc" : "asc");
    } else {
      setOrdenCampo(campo);
      setOrdenDir("asc");
    }
  };

  /** El botón "Buscar" siempre pregunta al servidor, nunca a la caché. */
  const refrescar = () => {
    abortador.current?.abort();
    if (temporizador.current) clearTimeout(temporizador.current);
    if (hayBusqueda) {
      consultar(
        {
          [PARAMETRO_BUSQUEDA[criterio]]: termino,
          page: 1,
          page_size: PAGE_SIZE,
          orden_campo: ordenCampo,
          orden_dir: ordenDir,
        },
        { skipCache: true }
      );
    } else {
      listarTodos(1, { skipCache: true });
    }
  };

  /** Trozos de un texto con la coincidencia resaltada. */
  const renderResaltado = (
    texto: string | null | undefined,
    criterioResalte: CriterioBusqueda
  ) => {
    if (!hayBusqueda) return texto;
    const trozos = resaltar(texto, criterioResalte, termino);
    if (!trozos) return texto;
    return (
      <>
        {trozos.map((t, i) =>
          t.coincide ? (
            <mark key={i} className="consulta-resalte">
              {t.texto}
            </mark>
          ) : (
            <span key={i}>{t.texto}</span>
          )
        )}
      </>
    );
  };

  /** El criterio con el que se resalta cada columna. */
  const columnaDe = (campo: string): CriterioBusqueda => {
    if (criterio !== "todos") return criterio;
    return campo as CriterioBusqueda;
  };

  return (
    <div className="consultas-page">
      <PageHeader
        title="Consultas"
        subtitle="Búsqueda de actos administrativos por NIT, EXP SGD, DNI/C.E. o asegurado titular"
        icon={<Search size={24} />}
      />

      {/* Un solo contenedor: la búsqueda arriba y debajo los resultados que
          controla, separados por un divisor. El buscador nunca se oculta, para
          que se pueda escribir mientras carga la primera tanda. */}
      <Card className="consulta-panel" padding="none">
        <CardBody className="consulta-busqueda">
          <div className="consulta-criterios">
            {CRITERIOS.map((c) => (
              <button
                key={c.value}
                type="button"
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
                placeholder={PLACEHOLDERS[criterio]}
                maxLength={MAX_BUSQUEDA[criterio]}
                autoComplete="off"
                spellCheck={false}
                aria-label="Texto de búsqueda"
              />
              {cargando && (
                <Loader2
                  size={16}
                  className="consulta-input-spin spin"
                  aria-label="Buscando"
                />
              )}
              {valor.length > 0 && !cargando && (
                <button
                  type="button"
                  className="consulta-input-clear"
                  onClick={limpiarBusqueda}
                  aria-label="Limpiar búsqueda"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <Button
              onClick={refrescar}
              loading={cargando}
              disabled={esperandoMinimo}
              icon={<Search size={18} />}
            >
              Buscar
            </Button>
          </div>

          <div className="consulta-formato">
            {AYUDA[criterio]}
            {esperandoMinimo && (
              <span className="consulta-formato-aviso">
                {" "}
                Mínimo {MIN_BUSQUEDA[criterio]} caracteres para este criterio.
              </span>
            )}
          </div>

          {error && (
            <Alert
              variant="error"
              className="consulta-alert"
              onClose={() => setError("")}
            >
              {error}
            </Alert>
          )}
        </CardBody>

        <CardBody className="consulta-resultados">
          {!cargado ? (
            <div className="consulta-cargando">
              <Loader2 size={20} className="spin" />
              Cargando registros…
            </div>
          ) : (
            <>
            <div className="consulta-resultados-header">
              <div>
                <h3>
                  {hayBusqueda ? "Resultados de la búsqueda" : "Todos los registros"}
                </h3>
                <p>
                  {total} {total === 1 ? "registro encontrado" : "registros encontrados"}
                  {cargando && " · actualizando…"}
                </p>
              </div>
              <div className="consulta-acciones">
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Download size={18} />}
                  title="Exportar los resultados en Excel (disponible en Reportes)"
                  disabled={items.length === 0}
                >
                  Exportar
                </Button>

                <div className="consulta-orden">
                  <SlidersHorizontal size={16} />
                  <span>Ordenar por:</span>
                <select
                  value={ordenCampo}
                  onChange={(e) => handleOrdenar(e.target.value as OrdenCampo)}
                  aria-label="Campo de ordenamiento"
                >
                  <option value="fecha_recepcion">Fecha de recepción</option>
                  <option value="nit">NIT</option>
                  <option value="exp_sgd">EXP SGD</option>
                  <option value="dni_ce">DNI/C.E.</option>
                  <option value="asegurado_titular">Asegurado titular</option>
                  <option value="tipo_tramite">Tipo de trámite</option>
                </select>
                <button
                  type="button"
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
            </div>

            {items.length === 0 ? (
              <EmptyState
                icon={<Search size={40} />}
                title={hayBusqueda ? "Sin resultados" : "Sin registros"}
                description={
                  hayBusqueda
                    ? "No se encontraron actos administrativos con los datos ingresados. Continúe escribiendo para ampliar la búsqueda."
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
                          <td className="consulta-nit">
                            {renderResaltado(s.nit, columnaDe("nit"))}
                          </td>
                          <td className="consulta-mono">
                            {renderResaltado(s.exp_sgd, columnaDe("exp_sgd"))}
                          </td>
                          <td>{formatDisplayDate(s.fecha_recepcion)}</td>
                          <td className="consulta-mono">
                            {renderResaltado(s.dni_ce, columnaDe("dni_ce"))}
                          </td>
                          <td>
                            {renderResaltado(
                              s.asegurado_titular,
                              columnaDe("asegurado_titular")
                            )}
                          </td>
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
                              type="button"
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
                    onPageChange={irAPagina}
                  />
                </div>
              </>
            )}
            </>
          )}
        </CardBody>
      </Card>

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
