import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleCheck,
  FileText,
  Gavel,
  Scale,
  AlertCircle,
} from "lucide-react";
import { Card, CardHeader, CardBody, Button, Alert } from "../components/ui";
import { ProcesoNuevoStep } from "../components/solicitudes/ProcesoNuevoStep";
import { DatosBasicosStep } from "../components/solicitudes/DatosBasicosStep";
import { TipoTramiteStep } from "../components/solicitudes/TipoTramiteStep";
import { DatosSeguroStep } from "../components/solicitudes/DatosSeguroStep";
import { DatosSubsidioStep } from "../components/solicitudes/DatosSubsidioStep";
import { ResolucionStep } from "../components/solicitudes/ResolucionStep";
import { ReconsideracionStep } from "../components/solicitudes/ReconsideracionStep";
import { ApelacionStep } from "../components/solicitudes/ApelacionStep";
import { ResumenStep } from "../components/solicitudes/ResumenStep";
import type {
  SolicitudCreate,
  TipoTramite,
  Resolucion,
  Reconsideracion,
  Apelacion,
} from "../types";
import { solicitudesEndpoints } from "../services/endpoints";
import { getErrorMessage } from "../services/api";
import "./NuevaSolicitud.css";

type WizardStep =
  | "proceso-nuevo"
  | "datos-basicos"
  | "tipo-tramite"
  | "datos-seguro"
  | "datos-subsidio"
  | "resolucion"
  | "recurso"
  | "reconsideracion"
  | "apelacion"
  | "resumen";

type RecursoElegido = "reconsideracion" | "apelacion" | "ninguno";

/** Opciones del paso de recurso, en el orden en que se muestran. */
const OPCIONES_RECURSO = [
  {
    valor: "reconsideracion",
    titulo: "Reconsideración",
    pasos: "Pasos 23 al 31",
    descripcion:
      "No está de acuerdo con la resolución y pide que sea revisada.",
  },
  {
    valor: "apelacion",
    titulo: "Apelación",
    pasos: "Pasos 32 al 34",
    descripcion:
      "La reconsideración no resolvió su caso y pide la revisión de la instancia superior.",
  },
  {
    valor: "ninguno",
    titulo: "Ningún recurso",
    pasos: null,
    descripcion:
      "La resolución queda registrada sin recurso. Podrá registrarlo después.",
  },
] as const satisfies readonly {
  valor: RecursoElegido;
  titulo: string;
  pasos: string | null;
  descripcion: string;
}[];

const ICONO_RECURSO: Record<RecursoElegido, React.ReactNode> = {
  reconsideracion: <Scale size={22} />,
  apelacion: <Gavel size={22} />,
  ninguno: <CircleCheck size={22} />,
};

interface WizardData extends Partial<SolicitudCreate> {
  esProcesoNuevo?: boolean;
  recursoElegido?: RecursoElegido;
  reconsideracion?: Reconsideracion;
  apelacion?: Apelacion;
}

/** Mensaje de éxito según las partes que se registraron. */
const buildMensajeConfirmacion = (data: WizardData): string => {
  const partes = ["Solicitud y resolución"];
  if (data.reconsideracion) partes.push("reconsideración");
  if (data.apelacion) partes.push("apelación");
  if (!data.resolucion?.fecha_notificacion) partes.push("notificación pendiente");
  return `${partes.join(", ")} registradas exitosamente`;
};

export const NuevaSolicitud: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<WizardStep>("proceso-nuevo");
  const [wizardData, setWizardData] = useState<WizardData>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const opcionesRef = useRef<(HTMLButtonElement | null)[]>([]);

  /**
   * Navegación con flechas del grupo de opciones, como espera un radiogroup:
   * mover el foco elige la opción y la marca, sin necesitar el ratón.
   */
  const manejarTecladoRecurso = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    indice: number
  ) => {
    const ultimo = OPCIONES_RECURSO.length - 1;
    let destino: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      destino = indice === ultimo ? 0 : indice + 1;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      destino = indice === 0 ? ultimo : indice - 1;
    } else if (e.key === "Home") {
      destino = 0;
    } else if (e.key === "End") {
      destino = ultimo;
    }
    if (destino === null) return;

    e.preventDefault();
    handleRecursoChange(OPCIONES_RECURSO[destino].valor);
    opcionesRef.current[destino]?.focus();
  };

  const steps: { key: WizardStep; title: string; description: string }[] = [
    {
      key: "proceso-nuevo",
      title: "Proceso Nuevo",
      description: "¿Es un proceso nuevo o desea buscar uno existente?",
    },
    {
      key: "datos-basicos",
      title: "Datos Básicos",
      description: "Información principal del acto administrativo",
    },
    {
      key: "tipo-tramite",
      title: "Tipo de Trámite",
      description: "Seleccione SEGURO o SUBSIDIO",
    },
    {
      key: "datos-seguro",
      title: "Datos del Seguro",
      description: "Información específica para trámites de seguro",
    },
    {
      key: "datos-subsidio",
      title: "Datos del Subsidio",
      description: "Información específica para trámites de subsidio",
    },
    {
      key: "resolucion",
      title: "Resolución",
      description: "Datos de la resolución y notificación",
    },
    {
      key: "recurso",
      title: "Recurso",
      description: "Elija el recurso que desea registrar",
    },
    {
      key: "reconsideracion",
      title: "Reconsideración",
      description: "Recurso de reconsideración (pasos 23-31)",
    },
    {
      key: "apelacion",
      title: "Apelación",
      description: "Recurso de apelación (pasos 32-34)",
    },
    {
      key: "resumen",
      title: "Resumen",
      description: "Revise y confirme la información",
    },
  ];

  const getVisibleSteps = (): typeof steps => {
    const baseSteps = ["proceso-nuevo", "datos-basicos", "tipo-tramite"];
    const cierreSteps = ["resolucion", "recurso", "resumen"];

    // Tras la resolución se pregunta qué recurso se registra. Solo se muestra
    // el formulario del recurso elegido, y ambos son posibles sin que el
    // otro tenga que existir antes.
    if (wizardData.recursoElegido === "reconsideracion") {
      return steps.filter((step) =>
        [...baseSteps, ...cierreSteps, "reconsideracion"].includes(step.key)
      );
    }
    if (wizardData.recursoElegido === "apelacion") {
      return steps.filter((step) =>
        [...baseSteps, ...cierreSteps, "apelacion"].includes(step.key)
      );
    }
    if (wizardData.resolucion) {
      return steps.filter((step) => [...baseSteps, ...cierreSteps].includes(step.key));
    }
    if (wizardData.tipo_tramite === "SEGURO") {
      return steps.filter(
        (step) =>
          baseSteps.includes(step.key) ||
          ["datos-seguro", "resolucion", "resumen"].includes(step.key)
      );
    }
    if (wizardData.tipo_tramite === "SUBSIDIO") {
      return steps.filter(
        (step) =>
          baseSteps.includes(step.key) ||
          ["datos-subsidio", "resolucion", "resumen"].includes(step.key)
      );
    }

    return steps.filter((step) => baseSteps.includes(step.key));
  };

  const getCurrentStepIndex = (): number => {
    const visibleSteps = getVisibleSteps();
    return visibleSteps.findIndex((step) => step.key === currentStep);
  };

  const isStepComplete = (stepKey: WizardStep): boolean => {
    switch (stepKey) {
      case "proceso-nuevo":
        return wizardData.esProcesoNuevo !== undefined;
      case "datos-basicos":
        return !!(
          wizardData.nit &&
          wizardData.exp_sgd &&
          wizardData.fecha_recepcion
        );
      case "tipo-tramite":
        return !!wizardData.tipo_tramite;
      case "datos-seguro":
        return wizardData.tipo_tramite === "SEGURO" && !!wizardData.datos_seguro;
      case "datos-subsidio":
        return wizardData.tipo_tramite === "SUBSIDIO" && !!wizardData.datos_subsidio;
      case "resolucion":
        return !!wizardData.resolucion;
      case "recurso":
        return wizardData.recursoElegido !== undefined;
      case "reconsideracion":
        return !!wizardData.reconsideracion;
      case "apelacion":
        return !!wizardData.apelacion;
      case "resumen":
        return true;
      default:
        return false;
    }
  };

  const canGoNext = (): boolean => {
    return isStepComplete(currentStep);
  };

  const canGoPrevious = (): boolean => {
    return getCurrentStepIndex() > 0;
  };

  const goNext = () => {
    if (!canGoNext()) return;

    const visibleSteps = getVisibleSteps();
    const currentIndex = getCurrentStepIndex();

    if (currentIndex < visibleSteps.length - 1) {
      setCurrentStep(visibleSteps[currentIndex + 1].key);
    }
  };

  const goPrevious = () => {
    if (!canGoPrevious()) return;

    const visibleSteps = getVisibleSteps();
    const currentIndex = getCurrentStepIndex();

    if (currentIndex > 0) {
      setCurrentStep(visibleSteps[currentIndex - 1].key);
    }
  };

  const handleBack = () => goPrevious();

  const updateWizardData = (data: Partial<WizardData>) => {
    setWizardData((prev) => ({ ...prev, ...data }));
    setError("");
  };

  const handleProcesoNuevo = (esNuevo: boolean) => {
    if (!esNuevo) {
      // El paso 1 muestra la búsqueda, selección y recursos dentro del wizard
      updateWizardData({ esProcesoNuevo: false });
      return;
    }

    updateWizardData({ esProcesoNuevo: true });
    setCurrentStep("datos-basicos");
  };

  const handleSeleccionarTramite = (
    solicitudId: number,
    recurso: "reconsideracion" | "apelacion"
  ) => {
    navigate(`/solicitudes/${solicitudId}?recurso=${recurso}`);
  };

  const handleTipoTramiteChange = (tipo: TipoTramite) => {
    updateWizardData({ tipo_tramite: tipo });

    // Navegar automáticamente al siguiente paso según el tipo
    if (tipo === "SEGURO") {
      setCurrentStep("datos-seguro");
    } else if (tipo === "SUBSIDIO") {
      setCurrentStep("datos-subsidio");
    }
  };

  /**
   * Al elegir el recurso se descarta el formulario del otro, para que el
   * guardado nunca intente enviar un recurso que el usuario no eligió.
   */
  const handleRecursoChange = (recurso: RecursoElegido) => {
    updateWizardData({
      recursoElegido: recurso,
      reconsideracion: recurso === "reconsideracion" ? wizardData.reconsideracion : undefined,
      apelacion: recurso === "apelacion" ? wizardData.apelacion : undefined,
    });

    if (recurso === "reconsideracion") {
      setCurrentStep("reconsideracion");
    } else if (recurso === "apelacion") {
      setCurrentStep("apelacion");
    } else {
      setCurrentStep("resumen");
    }
  };

  /**
   * Guarda el expediente completo. Los recursos se registran después de crear
   * la solicitud, porque el backend exige que la resolución y la
   * reconsideración existan antes que el recurso siguiente.
   */
  const handleSubmit = async () => {
    if (!wizardData.resolucion) {
      setError("Debe completar todos los datos de la resolución");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const solicitudData: SolicitudCreate = {
        nit: wizardData.nit!,
        exp_sgd: wizardData.exp_sgd!,
        fecha_recepcion: wizardData.fecha_recepcion!,
        ruc: wizardData.ruc!,
        entidad_empleadora: wizardData.entidad_empleadora!,
        dni_ce: wizardData.dni_ce!,
        asegurado_titular: wizardData.asegurado_titular!,
        tipo_tramite: wizardData.tipo_tramite!,
        resolucion: wizardData.resolucion,
        // Solo incluir el campo correspondiente al tipo de trámite
        ...(wizardData.tipo_tramite === "SEGURO" && {
          datos_seguro: wizardData.datos_seguro,
        }),
        ...(wizardData.tipo_tramite === "SUBSIDIO" && {
          datos_subsidio: wizardData.datos_subsidio,
        }),
      };

      const creada = await solicitudesEndpoints.crear(solicitudData);

      if (wizardData.reconsideracion) {
        await solicitudesEndpoints.crearReconsideracion(
          creada.id,
          wizardData.reconsideracion
        );
      }

      if (wizardData.apelacion) {
        await solicitudesEndpoints.crearApelacion(creada.id, wizardData.apelacion);
      }

      navigate(`/solicitudes/${creada.id}`, {
        state: {
          message: buildMensajeConfirmacion(wizardData),
        },
      });    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case "proceso-nuevo":
        return (
          <ProcesoNuevoStep
            onNext={handleProcesoNuevo}
            onSeleccionarTramite={handleSeleccionarTramite}
          />
        );

      case "datos-basicos":
        return (
          <DatosBasicosStep
            data={wizardData}
            onChange={updateWizardData}
          />
        );

      case "tipo-tramite":
        return (
          <TipoTramiteStep
            selectedTipo={wizardData.tipo_tramite}
            onChange={handleTipoTramiteChange}
          />
        );

      case "datos-seguro":
        return (
          <DatosSeguroStep
            data={wizardData.datos_seguro ?? undefined}
            onChange={(datos_seguro) => updateWizardData({ datos_seguro })}
          />
        );

      case "datos-subsidio":
        return (
          <DatosSubsidioStep
            data={wizardData.datos_subsidio ?? undefined}
            onChange={(datos_subsidio) => updateWizardData({ datos_subsidio })}
          />
        );

      case "resolucion":
        return (
          <ResolucionStep
            data={wizardData.resolucion ?? undefined}
            notificacionOpcional
            onChange={(resolucion: Resolucion) =>
              updateWizardData({ resolucion })
            }
          />
        );

      case "recurso":
        return (
          <Card className="recurso-card">
            <CardBody>
              <div
                className="recurso-opciones"
                role="radiogroup"
                aria-label="Qué recurso desea registrar"
              >
                {OPCIONES_RECURSO.map((opcion, indice) => {
                  const activa = wizardData.recursoElegido === opcion.valor;
                  return (
                    <button
                      key={opcion.valor}
                      type="button"
                      role="radio"
                      tabIndex={activa || (!wizardData.recursoElegido && indice === 0) ? 0 : -1}
                      aria-checked={activa}
                      ref={(nodo) => {
                        opcionesRef.current[indice] = nodo;
                      }}
                      className={`recurso-opcion${activa ? " recurso-opcion-activa" : ""}`}
                      onClick={() => handleRecursoChange(opcion.valor)}
                      onKeyDown={(e) => manejarTecladoRecurso(e, indice)}
                    >
                      <span className="recurso-opcion-icon" aria-hidden="true">
                        {ICONO_RECURSO[opcion.valor]}
                      </span>

                      <span className="recurso-opcion-texto">
                        <span className="recurso-opcion-titulo">
                          {opcion.titulo}
                        </span>
                        <span className="recurso-opcion-descripcion">
                          {opcion.descripcion}
                        </span>
                      </span>

                      {opcion.pasos ? (
                        <span className="recurso-opcion-pasos">
                          {opcion.pasos}
                        </span>
                      ) : null}

                      <span
                        className="recurso-opcion-check"
                        aria-hidden="true"
                      >
                        {activa ? <Check size={14} /> : null}
                      </span>
                    </button>
                  );
                })}
              </div>

              <p className="recurso-nota">
                Solo puede registrar un recurso por ahora. Si elige reconsideración
                o apelación, el formulario correspondiente se añadirá a los pasos
                siguientes.
              </p>
            </CardBody>
          </Card>
        );

      case "reconsideracion":
        return (
          <ReconsideracionStep
            data={wizardData.reconsideracion ?? undefined}
            notificacionObligatoria={false}
            onChange={(reconsideracion: Reconsideracion) =>
              updateWizardData({ reconsideracion })
            }
          />
        );

      case "apelacion":
        return (
          <ApelacionStep
            data={wizardData.apelacion ?? undefined}
            onChange={(apelacion: Apelacion) =>
              updateWizardData({ apelacion })
            }
          />
        );

      case "resumen":
        return (
          <ResumenStep
            data={wizardData}
            reconsideracion={wizardData.reconsideracion}
            apelacion={wizardData.apelacion}
            onSubmit={handleSubmit}
            onBack={() => handleBack()}
            loading={loading}
          />
        );

      default:
        return null;
    }
  };

  const visibleSteps = getVisibleSteps();
  const currentStepIndex = getCurrentStepIndex();
  const currentStepData = visibleSteps[currentStepIndex];

  /**
   * Los recursos son opcionales: el cliente puede grabar solo la resolución, o
   * la resolución más la reconsideración, sin llenar la notificación.
   */
  const pasoOpcionalActual =
    currentStep === "reconsideracion" || currentStep === "apelacion";

  const textoOmitir =
    currentStep === "apelacion"
      ? "Omitir apelación"
      : "Omitir reconsideración";

  const omitirPasoOpcional = () => {
    if (currentStep === "apelacion") {
      updateWizardData({ apelacion: undefined });
    } else {
      updateWizardData({ reconsideracion: undefined });
    }
    const pasos = getVisibleSteps();
    const indice = pasos.findIndex((paso) => paso.key === currentStep);
    if (indice < pasos.length - 1) {
      setCurrentStep(pasos[indice + 1].key);
    }
  };

  return (
    <div className="nueva-solicitud">
      <div className="nueva-solicitud-header">
        <div className="header-content">
          <div className="header-title">
            <FileText className="header-icon" />
            <div>
              <h1>Nueva Solicitud</h1>
              <p>Registro de Acto Administrativo</p>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            icon={<ArrowLeft size={20} />}
          >
            Volver al Dashboard
          </Button>
        </div>
      </div>

      {/* Progress Steps */}
      <Card className="steps-progress">
        <CardBody>
          <div className="steps-container">
            {visibleSteps.map((step, index) => (
              <div
                key={step.key}
                className={`step-item ${
                  index === currentStepIndex ? "step-active" : ""
                } ${index < currentStepIndex ? "step-completed" : ""}`}
              >
                <div className="step-circle">
                  {index < currentStepIndex ? (
                    <Check size={16} />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <div className="step-content">
                  <span className="step-title">{step.title}</span>
                  <span className="step-description">{step.description}</span>
                </div>
                {index < visibleSteps.length - 1 && (
                  <div className={`step-connector ${index < currentStepIndex ? "step-connector-completed" : ""}`} />
                )}
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Step Content */}
      <Card className="step-content-card">
        <CardHeader>
          <div className="step-header">
            <h2>{currentStepData?.title}</h2>
            <p>{currentStepData?.description}</p>
          </div>
        </CardHeader>
        <CardBody>
          {error && (
            <Alert variant="error" className="step-error">
              <AlertCircle size={20} />
              {error}
            </Alert>
          )}
          
          {renderStepContent()}

          {/* Navigation Buttons */}
          {currentStep !== "proceso-nuevo" && currentStep !== "resumen" && (
            <div className="step-navigation">
              <Button
                variant="outline"
                onClick={goPrevious}
                disabled={!canGoPrevious()}
                icon={<ArrowLeft size={20} />}
              >
                Anterior
              </Button>

              {pasoOpcionalActual && (
                <Button
                  variant="ghost"
                  onClick={omitirPasoOpcional}
                  className="step-skip"
                >
                  {textoOmitir}
                </Button>
              )}

              <Button
                onClick={goNext}
                disabled={!canGoNext()}
                icon={<ArrowRight size={20} />}
                iconPosition="right"
              >
                Siguiente
              </Button>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};