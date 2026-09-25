import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, FileText, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardBody, Button, Alert } from "../components/ui";
import { ProcesoNuevoStep } from "../components/solicitudes/ProcesoNuevoStep";
import { DatosBasicosStep } from "../components/solicitudes/DatosBasicosStep";
import { TipoTramiteStep } from "../components/solicitudes/TipoTramiteStep";
import { DatosSeguroStep } from "../components/solicitudes/DatosSeguroStep";
import { DatosSubsidioStep } from "../components/solicitudes/DatosSubsidioStep";
import { ResolucionStep } from "../components/solicitudes/ResolucionStep";
import { ResumenStep } from "../components/solicitudes/ResumenStep";
import type { SolicitudCreate, TipoTramite, Resolucion } from "../types";
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
  | "resumen";

interface WizardData extends Partial<SolicitudCreate> {
  esProcesoNuevo?: boolean;
}

export const NuevaSolicitud: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<WizardStep>("proceso-nuevo");
  const [wizardData, setWizardData] = useState<WizardData>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

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
      key: "resumen",
      title: "Resumen",
      description: "Revise y confirme la información",
    },
  ];

  const getVisibleSteps = (): typeof steps => {
    const baseSteps = ["proceso-nuevo", "datos-basicos", "tipo-tramite"];
    
    if (wizardData.tipo_tramite === "SEGURO") {
      return steps.filter(step => 
        baseSteps.includes(step.key) || 
        ["datos-seguro", "resolucion", "resumen"].includes(step.key)
      );
    } else if (wizardData.tipo_tramite === "SUBSIDIO") {
      return steps.filter(step => 
        baseSteps.includes(step.key) || 
        ["datos-subsidio", "resolucion", "resumen"].includes(step.key)
      );
    }
    
    return steps.filter(step => baseSteps.includes(step.key));
  };

  const getCurrentStepIndex = (): number => {
    const visibleSteps = getVisibleSteps();
    return visibleSteps.findIndex(step => step.key === currentStep);
  };

  const isStepComplete = (stepKey: WizardStep): boolean => {
    switch (stepKey) {
      case "proceso-nuevo":
        return wizardData.esProcesoNuevo !== undefined;
      case "datos-basicos":
        return !!(wizardData.nit && wizardData.exp_sgd && wizardData.fecha_recepcion);
      case "tipo-tramite":
        return !!wizardData.tipo_tramite;
      case "datos-seguro":
        return wizardData.tipo_tramite === "SEGURO" && !!wizardData.datos_seguro;
      case "datos-subsidio":
        return wizardData.tipo_tramite === "SUBSIDIO" && !!wizardData.datos_subsidio;
      case "resolucion":
        return !!wizardData.resolucion;
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
    setWizardData(prev => ({ ...prev, ...data }));
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

  const handleSubmit = async () => {
    if (!wizardData.resolucion) {
      setError("Debe completar todos los datos de la resolución");
      return;
    }

    try {
      setLoading(true);
      setError("");

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
        ...(wizardData.tipo_tramite === "SEGURO" && { datos_seguro: wizardData.datos_seguro }),
        ...(wizardData.tipo_tramite === "SUBSIDIO" && { datos_subsidio: wizardData.datos_subsidio }),
      };

      const result = await solicitudesEndpoints.crear(solicitudData);
      
      // Redirigir al detalle de la solicitud creada
      navigate(`/solicitudes/${result.id}`, {
        state: { message: "Solicitud creada exitosamente" }
      });
      
    } catch (err) {
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
            onChange={(resolucion: Resolucion) =>
              updateWizardData({ resolucion })
            }
          />
        );

      case "resumen":
        return (
          <ResumenStep
            data={wizardData}
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