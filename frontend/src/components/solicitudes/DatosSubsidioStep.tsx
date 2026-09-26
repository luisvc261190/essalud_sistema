import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Heart, AlertCircle, FileText } from "lucide-react";
import { Select, Input, Card, CardBody } from "../ui";
import type {
  DatosSubsidio,
  RiesgoSubsidio,
  DecisionSubsidio,
} from "../../types";
import "./DatosSubsidioStep.css";

const datosSubsidioSchema = z.object({
  motivo: z.string().min(1, "El motivo es obligatorio").max(100, "El motivo no puede exceder 100 caracteres"),
  riesgo: z.enum([
    "LACTANCIA",
    "ENFERMEDAD",
    "MATERNIDAD",
    "SEPELIO",
    "REINTEGRO",
    "FISCALIZACION POSTERIOR"
  ] as const, {
    message: "Debe seleccionar un riesgo"
  }),
  decision_resolucion: z.enum([
    "BAJA DE OFICIO",
    "DENEGATORIA",
    "IMPROCEDENTE",
    "EN PARTE"
  ] as const, {
    message: "Debe seleccionar una decisión"
  })
});

type DatosSubsidioForm = z.infer<typeof datosSubsidioSchema>;

interface DatosSubsidioStepProps {
  data?: DatosSubsidio;
  onChange: (data: DatosSubsidio) => void;
}

export const DatosSubsidioStep: React.FC<DatosSubsidioStepProps> = ({ data, onChange }) => {
  const {
    register,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<DatosSubsidioForm>({
    resolver: zodResolver(datosSubsidioSchema),
    defaultValues: {
      motivo: data?.motivo || "",
      riesgo: data?.riesgo || "",
      decision_resolucion: data?.decision_resolucion || "",
    } as Partial<DatosSubsidioForm>,
    mode: "onChange",
  });

  const watchedValues = watch();

  // Observar cambios y propagarlos
  React.useEffect(() => {
    if (isValid && watchedValues.motivo && watchedValues.riesgo && watchedValues.decision_resolucion) {
      onChange({
        motivo: watchedValues.motivo,
        riesgo: watchedValues.riesgo as RiesgoSubsidio,
        decision_resolucion: watchedValues.decision_resolucion as DecisionSubsidio
      });
    }
  }, [watchedValues, isValid, onChange]);

  const riesgoOptions = [
    { value: "LACTANCIA", label: "Lactancia" },
    { value: "ENFERMEDAD", label: "Enfermedad" },
    { value: "MATERNIDAD", label: "Maternidad" },
    { value: "SEPELIO", label: "Sepelio" },
    { value: "REINTEGRO", label: "Reintegro" },
    { value: "FISCALIZACION POSTERIOR", label: "Fiscalización Posterior" },
  ];

  const decisionOptions = [
    { value: "BAJA DE OFICIO", label: "Baja de Oficio" },
    { value: "DENEGATORIA", label: "Denegatoria" },
    { value: "IMPROCEDENTE", label: "Improcedente" },
    { value: "EN PARTE", label: "En Parte" },
  ];

  const getRiesgoInfo = (riesgo: string) => {
    const info: Record<string, { type: "salud" | "beneficio" | "auditoria" | "funeral"; description: string; icon: string }> = {
      "LACTANCIA": {
        type: "salud",
        description: "Subsidio por período de lactancia materna",
        icon: "🤱"
      },
      "ENFERMEDAD": {
        type: "salud", 
        description: "Subsidio por incapacidad temporal por enfermedad",
        icon: "🏥"
      },
      "MATERNIDAD": {
        type: "salud",
        description: "Subsidio por descanso pre y post natal",
        icon: "👶"
      },
      "SEPELIO": {
        type: "funeral",
        description: "Subsidio por gastos de sepelio del asegurado",
        icon: "⚱️"
      },
      "REINTEGRO": {
        type: "beneficio",
        description: "Reintegro de pagos indebidos o recuperación de beneficios",
        icon: "💰"
      },
      "FISCALIZACION POSTERIOR": {
        type: "auditoria",
        description: "Fiscalización posterior a procesos de subsidios",
        icon: "📋"
      }
    };
    return info[riesgo];
  };

  const getDecisionInfo = (decision: string) => {
    const info: Record<string, { type: "negative" | "partial" | "procedural"; description: string }> = {
      "BAJA DE OFICIO": {
        type: "negative",
        description: "Cancelación administrativa del subsidio por incumplimiento"
      },
      "DENEGATORIA": {
        type: "negative",
        description: "Rechazo total de la solicitud de subsidio"
      },
      "IMPROCEDENTE": {
        type: "procedural",
        description: "Solicitud no cumple con requisitos procedimentales"
      },
      "EN PARTE": {
        type: "partial",
        description: "Aprobación parcial del monto o período solicitado"
      }
    };
    return info[decision];
  };

  return (
    <div className="datos-subsidio-step">


      <form className="datos-subsidio-form">
        <div className="form-sections">
          {/* Riesgo del Subsidio */}
          <Card className="form-section">
            <CardBody>
              <div className="section-header">
                <Heart className="section-icon" />
                <h4>Riesgo del Subsidio</h4>
              </div>
              
              <Select
                label="Tipo de Riesgo"
                options={riesgoOptions}
                placeholder="Seleccione el tipo de riesgo"
                helperText="Tipo específico de subsidio solicitado"
                fullWidth
                error={errors.riesgo?.message}
                value={watchedValues.riesgo}
                onChange={(value) => setValue("riesgo", value as RiesgoSubsidio)}
                required
              />

              {watchedValues.riesgo && (
                <div className="riesgo-info">
                  <div className={`riesgo-badge riesgo-${getRiesgoInfo(watchedValues.riesgo)?.type}`}>
                    <span className="riesgo-icon">{getRiesgoInfo(watchedValues.riesgo)?.icon}</span>
                    <span>{getRiesgoInfo(watchedValues.riesgo)?.type.toUpperCase()}</span>
                  </div>
                  <p className="riesgo-description">
                    {getRiesgoInfo(watchedValues.riesgo)?.description}
                  </p>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Decisión de Resolución */}
          <Card className="form-section">
            <CardBody>
              <div className="section-header">
                <AlertCircle className="section-icon" />
                <h4>Decisión de Resolución</h4>
              </div>
              
              <Select
                label="Tipo de Decisión"
                options={decisionOptions}
                placeholder="Seleccione la decisión"
                helperText="Decisión administrativa sobre el subsidio"
                fullWidth
                error={errors.decision_resolucion?.message}
                value={watchedValues.decision_resolucion}
                onChange={(value) => setValue("decision_resolucion", value as DecisionSubsidio)}
                required
              />

              {watchedValues.decision_resolucion && (
                <div className="decision-info">
                  <div className={`decision-badge decision-${getDecisionInfo(watchedValues.decision_resolucion)?.type}`}>
                    <AlertCircle size={14} />
                    <span>{getDecisionInfo(watchedValues.decision_resolucion)?.type.toUpperCase()}</span>
                  </div>
                  <div className="decision-explanation">
                    <strong>{watchedValues.decision_resolucion}:</strong>
                    <span>{getDecisionInfo(watchedValues.decision_resolucion)?.description}</span>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Motivo (Obligatorio para subsidios). Va al final: se escribe después
              de haber definido el riesgo y la decisión, que es lo que el motivo
              justifica. */}
          <Card className="form-section form-section-full">
            <CardBody>
              <div className="section-header">
                <FileText className="section-icon" />
                <h4>Motivo del Subsidio (Obligatorio)</h4>
              </div>
              
              <Input
                label="Detalle del Motivo"
                placeholder="Ingrese el motivo del subsidio"
                helperText="Máximo 100 caracteres alfanuméricos (obligatorio)"
                fullWidth
                maxLength={100}
                error={errors.motivo?.message}
                {...register("motivo")}
                required
              />

              <div className="character-count">
                <span 
                  className={watchedValues.motivo && watchedValues.motivo.length > 80 ? "warning" : ""}
                >
                  {(watchedValues.motivo || "").length}/100 caracteres
                </span>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Resumen de Selección */}
        {isValid && watchedValues.motivo && watchedValues.riesgo && watchedValues.decision_resolucion && (
          <Card className="selection-summary">
            <CardBody>
              <div className="summary-header">
                <Heart className="summary-icon" size={18} />
                <h4>Resumen del Subsidio</h4>
              </div>
              
              <div className="summary-grid">
                <div className="summary-item">
                  <strong>Tipo de Riesgo:</strong>
                  <span>{riesgoOptions.find(r => r.value === watchedValues.riesgo)?.label}</span>
                </div>
                <div className="summary-item">
                  <strong>Decisión:</strong>
                  <span>{decisionOptions.find(d => d.value === watchedValues.decision_resolucion)?.label}</span>
                </div>
                <div className="summary-item summary-item-full">
                  <strong>Motivo:</strong>
                  <span>{watchedValues.motivo}</span>
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Información de Ayuda */}
        <Card className="help-section">
          <CardBody>
            <h5>💡 Información sobre trámites de SUBSIDIO</h5>
            <div className="help-content">
              <div className="help-categories">
                <div className="help-category">
                  <h6>🤱 MATERNIDAD Y LACTANCIA</h6>
                  <p>Subsidios por descanso maternal, pre y post natal, y período de lactancia</p>
                </div>
                <div className="help-category">
                  <h6>🏥 ENFERMEDAD</h6>
                  <p>Subsidios por incapacidad temporal debido a enfermedad común</p>
                </div>
                <div className="help-category">
                  <h6>⚱️ SEPELIO</h6>
                  <p>Subsidio para gastos de sepelio del asegurado titular</p>
                </div>
                <div className="help-category">
                  <h6>💰 REINTEGRO</h6>
                  <p>Recuperación de montos pagados indebidamente o devoluciones</p>
                </div>
              </div>
              
              <div className="important-note">
                <AlertCircle size={20} />
                <div>
                  <strong>Importante:</strong>
                  <span>Para subsidios, el motivo es OBLIGATORIO y debe describir claramente la justificación del beneficio solicitado.</span>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </form>
    </div>
  );
};