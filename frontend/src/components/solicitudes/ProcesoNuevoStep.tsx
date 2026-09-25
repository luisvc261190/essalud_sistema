import React, { useState } from "react";
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
} from "lucide-react";
import { Card, CardBody, Button, Alert, Badge } from "../ui";
import {
  formatNIT,
  formatExpSGD,
  formatDNI,
  formatDisplayDate,
  validators,
} from "../../utils/formatters";
import { consultasEndpoints } from "../../services/endpoints";
import type { SolicitudResumen } from "../../types";
import "./ProcesoNuevoStep.css";

interface ProcesoNuevoStepProps {
  onNext: (esNuevo: boolean) => void;
  onSeleccionarTramite: (
    solicitudId: number,
    recurso: "reconsideracion" | "apelacion"
  ) => void;
}

type Criterio =
  | "nit"
  | "exp_sgd"
  | "dni_ce"
  | "asegurado_titular";

const CRITERIOS: { value: Criterio; label: string; icon: React.ReactNode }[] = [
  { value: "nit", label: "NIT", icon: <Building size={18} /> },
  { value: "exp_sgd", label: "EXP SGD", icon: <Hash size={18} /> },
  { value: "dni_ce", label: "DNI/C.E.", icon: <IdCard size={18} /> },
  { value: "asegurado_titular", label: "Asegurado Titular", icon: <User size={18} /> },
];

export const ProcesoNuevoStep: React.FC<ProcesoNuevoStepProps> = ({
  onNext,
  onSeleccionarTramite,
}) => {
  const [selected, setSelected] = useState<boolean | null>(null);

  // Estado de búsqueda (flujo NO)
  const [criterio, setCriterio] = useState<Criterio>("nit");
  const [valor, setValor] = useState("");
  const [resultados, setResultados] = useState<SolicitudResumen[]>([]);
  const [busqueTotal, setBusqueTotal] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [busqueError, setBusqueError] = useState("");
  const [seleccionado, setSeleccionado] = useState<SolicitudResumen | null>(null);
  const [recurso, setRecurso] = useState<"reconsideracion" | "apelacion" | null>(null);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (criterio === "nit") setValor(formatNIT(raw));
    else if (criterio === "exp_sgd") setValor(formatExpSGD(raw));
    else if (criterio === "dni_ce") setValor(formatDNI(raw));
    else setValor(raw);
    setSeleccionado(null);
    setRecurso(null);
    setBusqueTotal(false);
  };

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

  const handleBuscar = async () => {
    const error = validarValor();
    if (error) {
      setBusqueError(error);
      return;
    }
    setBusqueError("");
    setBuscando(true);
    setResultados([]);
    setBusqueTotal(false);
    setSeleccionado(null);
    setRecurso(null);

    try {
      const response = await consultasEndpoints.buscar({
        [criterio]: valor.trim(),
        page: 1,
        page_size: 25,
        orden_campo: "fecha_recepcion",
        orden_dir: "desc",
      });
      setResultados(response.items);
      setBusqueTotal(true);
    } catch (err) {
      setBusqueError(
        err instanceof Error ? err.message : "Error al buscar la solicitud"
      );
    } finally {
      setBuscando(false);
    }
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

  return (
    <div className="proceso-nuevo-step">
      <div className="proceso-options">
        <Card
          className={`proceso-option ${selected === true ? "proceso-option-selected" : ""}`}
          hover={selected !== true}
        >
          <CardBody>
            <button
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
                  Seleccione el criterio, ingrese el valor y elija el recurso
                  a registrar
                </p>
              </div>
            </div>
          </div>

          {/* Criterios */}
          <div className="busqueda-criterios">
            {CRITERIOS.map((c) => (
              <button
                key={c.value}
                className={`criterio-btn ${
                  criterio === c.value ? "criterio-btn-active" : ""
                }`}
                onClick={() => {
                  setCriterio(c.value);
                  setValor("");
                  setSeleccionado(null);
                  setRecurso(null);
                  setBusqueTotal(false);
                  setBusqueError("");
                }}
              >
                {c.icon}
                <span>{c.label}</span>
              </button>
            ))}
          </div>

          {/* Input + botón */}
          <div className="busqueda-input-row">
            <div className="busqueda-input">
              <Search size={18} className="busqueda-input-icon" />
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
                onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
              />
            </div>
            <Button
              onClick={handleBuscar}
              loading={buscando}
              icon={<Search size={18} />}
            >
              Buscar
            </Button>
          </div>

          <div className="busqueda-formato">
            {criterio === "nit" &&
              "Formato: XXXX-XXXX-NIT-XXXXXXX (se autocompleta con ceros)"}
            {criterio === "exp_sgd" && "16 dígitos, debe iniciar con 0"}
            {criterio === "dni_ce" && "Entre 5 y 10 caracteres alfanuméricos"}
            {criterio === "asegurado_titular" && "Mínimo 3 caracteres"}
          </div>

          {busqueError && (
            <Alert variant="error" className="busqueda-alert">
              <AlertCircle size={20} />
              {busqueError}
            </Alert>
          )}

          {/* Resultados */}
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
                            <td className="resultado-nit">{s.nit}</td>
                            <td className="resultado-mono">{s.exp_sgd}</td>
                            <td className="resultado-mono">{s.dni_ce}</td>
                            <td>{s.asegurado_titular}</td>
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