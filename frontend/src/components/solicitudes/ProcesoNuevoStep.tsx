import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import {
  Search,
  Plus,
  FileText,
  Users,
  Building,
  Hash,
  IdCard,
  User,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Layers,
  X,
} from "lucide-react";
import { Card, CardBody, Button, Alert, Badge } from "../ui";
import {
  MIN_BUSQUEDA,
  MAX_BUSQUEDA,
  PARAMETRO_BUSQUEDA,
  formatDisplayDate,
  normalizarBusqueda,
  resaltar,
  terminoBusqueda,
  type CriterioBusqueda,
} from "../../utils/formatters";
import {
  consultasEndpoints,
  type ConsultaOpciones,
} from "../../services/endpoints";
import { getErrorMessage } from "../../services/api";
import type { SolicitudResumen } from "../../types";
import "./ProcesoNuevoStep.css";

interface ProcesoNuevoStepProps {
  onNext: (esNuevo: boolean) => void;
  onSeleccionarTramite: (
    solicitudId: number,
    recurso: "reconsideracion" | "apelacion"
  ) => void;
}

const CRITERIOS: {
  value: CriterioBusqueda;
  label: string;
  icon: React.ReactNode;
}[] = [
  { value: "todos", label: "Todos", icon: <Layers size={18} /> },
  { value: "nit", label: "NIT", icon: <Building size={18} /> },
  { value: "exp_sgd", label: "EXP SGD", icon: <Hash size={18} /> },
  { value: "dni_ce", label: "DNI/C.E.", icon: <IdCard size={18} /> },
  {
    value: "asegurado_titular",
    label: "Asegurado Titular",
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
  todos: "Busca a la vez en los cuatro campos. Los resultados se actualizan mientras escribe.",
  nit: "Escriba los dígitos del NIT; se completan con ceros a la izquierda (12 → 0000012).",
  exp_sgd: "16 dígitos, siempre inicia en 0.",
  dni_ce: "Entre 5 y 10 caracteres alfanuméricos.",
  asegurado_titular: "Mínimo 3 caracteres; coincidencia parcial.",
};

/**
 * Espera antes de consultar al backend mientras el usuario escribe.
 *
 * Antes eran 300 ms, que se Sumaban a los ~400 ms de red y se convirtian en
 * mas de un segundo de espera. 120 ms sigue absorbiendo la pulsacion rapida sin
 * añadir demora perceptible, y cada peticion que se lanza antes se cancela.
 */
const DEBOUNCE_MS = 120;
/** Al borrar y retipar, el resultado sale de la caché sin volver a pedirlo. */
const CACHE_BUSQUEDA_MS = 5_000;
const MAX_RESULTADOS = 25;

export const ProcesoNuevoStep: React.FC<ProcesoNuevoStepProps> = ({
  onNext,
  onSeleccionarTramite,
}) => {
  const [selected, setSelected] = useState<boolean | null>(null);

  // Estado de búsqueda (flujo NO)
  const [criterio, setCriterio] = useState<CriterioBusqueda>("nit");
  const [valor, setValor] = useState("");
  const [resultados, setResultados] = useState<SolicitudResumen[]>([]);
  const [busqueTotal, setBusqueTotal] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [busqueError, setBusqueError] = useState("");
  const [seleccionado, setSeleccionado] = useState<SolicitudResumen | null>(null);
  const [recurso, setRecurso] = useState<"reconsideracion" | "apelacion" | null>(null);

  // Descarta respuestas que llegan después de una escritura más reciente.
  const peticionActual = useRef(0);
  // Cancela la petición en vuelo: mientras el usuario escribe no hay que
  // esperar a que terminen las anteriores.
  const abortador = useRef<AbortController | null>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const termino = terminoBusqueda(criterio, valor);
  const hayBusqueda = termino.length > 0;
  const esperandoMinimo = valor.trim().length > 0 && !hayBusqueda;

  const handleSelection = (esNuevo: boolean) => {
    setSelected(esNuevo);
    if (esNuevo) {
      setSeleccionado(null);
      setRecurso(null);
    }
  };

  const handleContinue = () => {
    if (selected === true) {
      onNext(true);
    }
  };

  const buscar = useCallback(
    async (opciones: ConsultaOpciones = {}) => {
      if (!termino) return;
      const id = ++peticionActual.current;
      abortador.current?.abort();
      const control = new AbortController();
      abortador.current = control;
      setBuscando(true);
      try {
        const response = await consultasEndpoints.buscar(
          {
            [PARAMETRO_BUSQUEDA[criterio]]: termino,
            page: 1,
            page_size: MAX_RESULTADOS,
            orden_campo: "fecha_recepcion",
            orden_dir: "desc",
          },
          { ...opciones, signal: control.signal }
        );
        if (id !== peticionActual.current) return;
        setResultados(response.items);
        setBusqueTotal(true);
        setBusqueError("");
      } catch (err) {
        if (id !== peticionActual.current) return;
        if (axios.isCancel(err)) return; // el usuario siguió escribiendo
        setResultados([]);
        setBusqueTotal(false);
        setBusqueError(getErrorMessage(err));
      } finally {
        if (id === peticionActual.current) setBuscando(false);
      }
    },
    [criterio, termino]
  );

  // Búsqueda en tiempo real: se relanza a los DEBOUNCE_MS de dejar de escribir.
  useEffect(() => {
    if (selected !== false) return;
    if (temporizador.current) clearTimeout(temporizador.current);
    if (!hayBusqueda) return;

    temporizador.current = setTimeout(
      () => buscar({ cacheTTL: CACHE_BUSQUEDA_MS }),
      DEBOUNCE_MS
    );

    return () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, [selected, hayBusqueda, buscar]);

  // Si el paso se abandona, se cancela lo que estuviera en vuelo.
  useEffect(() => () => abortador.current?.abort(), []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const siguiente = normalizarBusqueda(criterio, e.target.value);
    setValor(siguiente);
    setSeleccionado(null);
    setRecurso(null);
    // Si el texto ya no alcanza para discriminar, se retiran los resultados
    // anteriores en el manejador y no dentro del efecto.
    if (terminoBusqueda(criterio, siguiente) === "") {
      cancelarBusqueda();
    }
  };

  /** Descarta los resultados en curso y limpia la lista. */
  const cancelarBusqueda = () => {
    peticionActual.current++;
    abortador.current?.abort();
    if (temporizador.current) clearTimeout(temporizador.current);
    setResultados([]);
    setBusqueTotal(false);
    setBuscando(false);
  };

  const handleCriterioChange = (c: CriterioBusqueda) => {
    setCriterio(c);
    setValor("");
    cancelarBusqueda();
    setBusqueError("");
    setSeleccionado(null);
    setRecurso(null);
    inputRef.current?.focus();
  };

  const handleSeleccionarFila = (solicitud: SolicitudResumen) => {
    setSeleccionado(solicitud);
    setRecurso(null);
  };

  const puedeContinuar = !!seleccionado && !!recurso;

  const handleContinuarBusqueda = () => {
    if (seleccionado && recurso) {
      onSeleccionarTramite(seleccionado.id, recurso);
    }
  };

  /** Trozos de un texto con la coincidencia resaltada. */
  const renderResaltado = (
    texto: string | null | undefined,
    columna: CriterioBusqueda
  ) => {
    if (!hayBusqueda) return texto;
    const useCriterio = criterio === "todos" ? columna : criterio;
    const trozos = resaltar(texto, useCriterio, termino);
    if (!trozos) return texto;
    return (
      <>
        {trozos.map((t, i) =>
          t.coincide ? (
            <mark key={i} className="resultado-resalte">
              {t.texto}
            </mark>
          ) : (
            <span key={i}>{t.texto}</span>
          )
        )}
      </>
    );
  };

  return (
    <div className="proceso-nuevo-step">
      <div className="proceso-options">
        <Card
          className={`proceso-option ${selected === true ? "proceso-option-selected" : ""}`}
          hover={selected !== true}
        >
          <CardBody>
            <button
              type="button"
              className="proceso-option-button"
              onClick={() => handleSelection(true)}
            >
              <div className="proceso-option-icon proceso-option-icon-new">
                <Plus size={32} />
              </div>
              <div className="proceso-option-content">
                <h4>SÍ - Proceso Nuevo</h4>
                <p>Crear un nuevo acto administrativo desde cero</p>
                <ul className="proceso-features">
                  <li>
                    <FileText size={16} />
                    <span>Registro completo de solicitud</span>
                  </li>
                  <li>
                    <Users size={16} />
                    <span>Datos del asegurado titular</span>
                  </li>
                  <li>
                    <FileText size={16} />
                    <span>Resolución y recursos</span>
                  </li>
                </ul>
              </div>
            </button>
          </CardBody>
        </Card>

        <Card
          className={`proceso-option ${selected === false ? "proceso-option-selected" : ""}`}
          hover={selected !== false}
        >
          <CardBody>
            <button
              type="button"
              className="proceso-option-button"
              onClick={() => handleSelection(false)}
            >
              <div className="proceso-option-icon proceso-option-icon-search">
                <Search size={32} />
              </div>
              <div className="proceso-option-content">
                <h4>NO - Buscar Existente</h4>
                <p>Buscar y continuar con un trámite existente</p>
                <ul className="proceso-features">
                  <li>
                    <Search size={16} />
                    <span>Búsqueda por NIT, EXP SGD, DNI/C.E.</span>
                  </li>
                  <li>
                    <FileText size={16} />
                    <span>Recursos de reconsideración</span>
                  </li>
                  <li>
                    <FileText size={16} />
                    <span>Recursos de apelación</span>
                  </li>
                </ul>
              </div>
            </button>
          </CardBody>
        </Card>
      </div>

      {selected === true && (
        <div className="proceso-continue">
          <Button
            onClick={handleContinue}
            size="lg"
            className="continue-button"
          >
            Crear Nuevo Proceso
          </Button>
        </div>
      )}

      {selected === false && (
        <div className="busqueda-panel animate-fade-in">
          <div className="busqueda-panel-header">
            <div className="busqueda-title">
              <Search size={22} />
              <div>
                <h4>Buscar Trámite Existente</h4>
                <p>
                  Los resultados aparecen mientras escribe. Seleccione la fila
                  coincidente y el recurso que desea registrar.
                </p>
              </div>
            </div>
          </div>

          {/* Criterios */}
          <div className="busqueda-criterios">
            {CRITERIOS.map((c) => (
              <button
                key={c.value}
                type="button"
                className={`criterio-btn ${
                  criterio === c.value ? "criterio-btn-active" : ""
                }`}
                onClick={() => handleCriterioChange(c.value)}
              >
                {c.icon}
                <span>{c.label}</span>
              </button>
            ))}
          </div>

          {/* Input: la búsqueda es en tiempo real, el botón solo la acelera */}
          <div className="busqueda-input-row">
            <div className="busqueda-input">
              <Search size={18} className="busqueda-input-icon" />
              <input
                ref={inputRef}
                type="text"
                value={valor}
                onChange={handleInputChange}
                placeholder={PLACEHOLDERS[criterio]}
                maxLength={MAX_BUSQUEDA[criterio]}
                autoComplete="off"
                spellCheck={false}
                aria-label="Texto de búsqueda"
              />
              {buscando && (
                <Loader2
                  size={16}
                  className="busqueda-input-spin spin"
                  aria-label="Buscando"
                />
              )}
              {valor.length > 0 && !buscando && (
                <button
                  type="button"
                  className="busqueda-input-clear"
                  onClick={() => {
                    setValor("");
                    cancelarBusqueda();
                    setSeleccionado(null);
                    setRecurso(null);
                  }}
                  aria-label="Limpiar búsqueda"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <Button
              onClick={() => buscar({ skipCache: true })}
              loading={buscando}
              disabled={!hayBusqueda}
              icon={<Search size={18} />}
            >
              Buscar
            </Button>
          </div>

          <div className="busqueda-formato">
            {AYUDA[criterio]}
            {esperandoMinimo && (
              <span className="consulta-formato-aviso">
                {" "}
                Mínimo {MIN_BUSQUEDA[criterio]} caracteres para este criterio.
              </span>
            )}
          </div>

          {busqueError && (
            <Alert variant="error" className="busqueda-alert">
              <AlertCircle size={20} />
              {busqueError}
            </Alert>
          )}

          {/* Resultados */}
          {hayBusqueda && !busqueTotal && !buscando && (
            <div className="busqueda-resultados">
              <div className="resultados-vacio">
                <Search size={32} />
                <p>Escriba al menos {MIN_BUSQUEDA[criterio]} caracteres para buscar</p>
              </div>
            </div>
          )}

          {busqueTotal && !buscando && (
            <div className="busqueda-resultados">
              <div className="resultados-header">
                <h5>Resultados ({resultados.length})</h5>
                {resultados.length > 0 && (
                  <Badge variant="primary" size="sm">
                    Seleccione una fila
                  </Badge>
                )}
              </div>

              {resultados.length === 0 ? (
                <div className="resultados-vacio">
                  <AlertCircle size={32} />
                  <p>No se encontraron solicitudes con los datos ingresados</p>
                </div>
              ) : (
                <>
                  <div className="tabla-resultados-wrap">
                    <table className="tabla-resultados">
                      <thead>
                        <tr>
                          <th>NIT</th>
                          <th>EXP SGD</th>
                          <th>DNI/C.E.</th>
                          <th>Asegurado Titular</th>
                          <th>Tipo</th>
                          <th>Recepción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resultados.map((s) => (
                          <tr
                            key={s.id}
                            className={`resultado-fila ${
                              seleccionado?.id === s.id ? "resultado-fila-seleccionada" : ""
                            }`}
                            onClick={() => handleSeleccionarFila(s)}
                          >
                            <td className="resultado-nit">
                              {renderResaltado(s.nit, "nit")}
                            </td>
                            <td className="resultado-mono">
                              {renderResaltado(s.exp_sgd, "exp_sgd")}
                            </td>
                            <td className="resultado-mono">
                              {renderResaltado(s.dni_ce, "dni_ce")}
                            </td>
                            <td>
                              {renderResaltado(
                                s.asegurado_titular,
                                "asegurado_titular"
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
                            <td>{formatDisplayDate(s.fecha_recepcion)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {seleccionado && (
                    <div className="recurso-panel">
                      <div className="recurso-seleccionado">
                        <CheckCircle2 size={18} />
                        <span>
                          <strong>Seleccionado:</strong>{" "}
                          {seleccionado.asegurado_titular} · NIT{" "}
                          {seleccionado.nit}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSeleccionado(null)}
                          className="recurso-limpiar"
                          aria-label="Quitar selección"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="pregunta-recurso">
                        <h5>
                          ¿Qué recurso administrativo desea registrar para este
                          trámite?
                        </h5>
                        <div className="recurso-opciones">
                          <button
                            type="button"
                            className={`recurso-option ${
                              recurso === "reconsideracion" ? "recurso-option-active" : ""
                            }`}
                            onClick={() => setRecurso("reconsideracion")}
                          >
                            <div className="recurso-option-header">
                              <FileText size={20} />
                              <strong>Recurso de Reconsideración</strong>
                            </div>
                            <p>
                              Para impugnar la resolución emitida (paso 23 al
                              31)
                            </p>
                          </button>
                          <button
                            type="button"
                            className={`recurso-option ${
                              recurso === "apelacion" ? "recurso-option-active" : ""
                            }`}
                            onClick={() => setRecurso("apelacion")}
                          >
                            <div className="recurso-option-header">
                              <FileText size={20} />
                              <strong>Recurso de Apelación</strong>
                            </div>
                            <p>
                              Para apelar ante la instancia superior (paso 32 al
                              34)
                            </p>
                          </button>
                        </div>
                      </div>

                      <div className="recurso-continuar">
                        <Button
                          onClick={handleContinuarBusqueda}
                          disabled={!puedeContinuar}
                          icon={<ArrowRight size={18} />}
                          iconPosition="right"
                        >
                          Continuar con{" "}
                          {recurso === "reconsideracion"
                            ? "Reconsideración"
                            : recurso === "apelacion"
                            ? "Apelación"
                            : "el trámite"}
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {buscando && (
            <div className="busqueda-loading">
              <Loader2 size={22} className="spin" />
              <span>Buscando solicitudes...</span>
            </div>
          )}
        </div>
      )}

      <div className="proceso-help">
        <div className="help-card">
          <h5>💡 Información importante</h5>
          <ul>
            <li>
              <strong>Proceso Nuevo:</strong> Para registrar un acto
              administrativo completamente nuevo
            </li>
            <li>
              <strong>Buscar Existente:</strong> Para continuar con trámites que
              requieren recursos de reconsideración o apelación
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
