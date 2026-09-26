import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, CheckCircle, FileText } from "lucide-react";
import { Select, Input, Card, CardBody } from "../ui";
import type {
  DatosSeguro,
  RiesgoSeguro,
  DecisionSeguro,
} from "../../types";
import "./DatosSeguroStep.css";

const datosSeguroSchema = z.object({
  riesgo: z.enum([
    "ALTA TITULAR",
    "ALTA DERECHOHABIENTE",
    "CONDICION DEL ASEGURADO",
    "AUDITORIA",
    "FISCALIZACION POSTERIOR",
    "BAJA TITULAR",
    "BAJA DERECHOHABIENTE",
    "LACTANCIA",
    "ENFERMEDAD"
  ] as const, {
    message: "Debe seleccionar un riesgo"
  }),
  decision_resolucion: z.enum([
    "BAJA DE OFICIO",
    "RESOLUCION DE MULTA"
  ] as const, {
    message: "Debe seleccionar una decisión"
  }),
  motivo: z.string().max(100, "El motivo no puede exceder 100 caracteres").optional().or(z.literal(""))
});

type DatosSeguroForm = z.infer<typeof datosSeguroSchema>;

interface DatosSeguroStepProps {
  data?: DatosSeguro;
  onChange: (data: DatosSeguro) => void;
}

export const DatosSeguroStep: React.FC<DatosSeguroStepProps> = ({ data, onChange }) => {
  const {
    register,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<DatosSeguroForm>({
    resolver: zodResolver(datosSeguroSchema),
    defaultValues: {
      riesgo: data?.riesgo || "",
      decision_resolucion: data?.decision_resolucion || "",
      motivo: data?.motivo || "",
    } as Partial<DatosSeguroForm>,
    mode: "onChange",
  });

  const watchedValues = watch();

  // Observar cambios y propagarlos
  React.useEffect(() => {
    if (isValid && watchedValues.riesgo && watchedValues.decision_resolucion) {
      onChange({
        riesgo: watchedValues.riesgo as RiesgoSeguro,
        decision_resolucion: watchedValues.decision_resolucion as DecisionSeguro,
        motivo: watchedValues.motivo || null
      });
    }
  }, [watchedValues, isValid, onChange]);

  const riesgoOptions = [
    { value: "ALTA TITULAR", label: "Alta Titular" },
    { value: "ALTA DERECHOHABIENTE", label: "Alta Derechohabiente" },
    { value: "CONDICION DEL ASEGURADO", label: "Condición del Asegurado" },
    { value: "AUDITORIA", label: "Auditoría" },
    { value: "FISCALIZACION POSTERIOR", label: "Fiscalización Posterior" },
    { value: "BAJA TITULAR", label: "Baja Titular" },
    { value: "BAJA DERECHOHABIENTE", label: "Baja Derechohabiente" },
    { value: "LACTANCIA", label: "Lactancia" },
    { value: "ENFERMEDAD", label: "Enfermedad" },
  ];

  const decisionOptions = [
    { value: "BAJA DE OFICIO", label: "Baja de Oficio" },
    { value: "RESOLUCION DE MULTA", label: "Resolución de Multa" },
  ];

  const getRiesgoInfo = (riesgo: string) => {
    const info: Record<string, { type: "alta" | "baja" | "auditoria" | "salud"; description: string }> = {
      "ALTA TITULAR": {
        type: "alta",
        description: "Registro de nuevo asegurado titular en el sistema"
      },
      "ALTA DERECHOHABIENTE": {
        type: "alta", 
        description: "Registro de derechohabiente (cónyuge, hijos, etc.)"
      },
      "CONDICION DEL ASEGURADO": {
        type: "auditoria",
        description: "Verificación o modificación de condición de asegurado"
      },
      "AUDITORIA": {
        type: "auditoria",
        description: "Proceso de auditoría de afiliaciones o beneficios"
      },
      "FISCALIZACION POSTERIOR": {
        type: "auditoria",
        description: "Fiscalización posterior a procesos administrativos"
      },
      "BAJA TITULAR": {
        type: "baja",
        description: "Desafiliación del asegurado titular"
      },
      "BAJA DERECHOHABIENTE": {
        type: "baja",
        description: "Desafiliación de derechohabiente"
      },
      "LACTANCIA": {
        type: "salud",
        description: "Trámites relacionados con período de lactancia"
      },
      "ENFERMEDAD": {
        type: "salud", 
        description: "Trámites por condiciones de salud o enfermedad"
      }
    };
    return info[riesgo];
  };

  return (
    <div className="datos-seguro-step">
      <div className="step-intro">
      </div>

      <form className="datos-seguro-form">
        <div className="form-sections">
          {/* Riesgo del Seguro */}
          <Card className="form-section">
            <CardBody>
              <div className="section-header">
                <AlertCircle className="section-icon" />
                <h4>Riesgo del Seguro</h4>
              </div>
              
              <Select
                label="Tipo de Riesgo"
                options={riesgoOptions}
                placeholder="Seleccione el tipo de riesgo"
                helperText="Solo se permiten los valores especificados"
                fullWidth
                error={errors.riesgo?.message}
                value={watchedValues.riesgo}
                onChange={(value) => setValue("riesgo", value as RiesgoSeguro)}
              />

              {watchedValues.riesgo && (
                <div className="riesgo-info">
                  <div className={`riesgo-badge riesgo-${getRiesgoInfo(watchedValues.riesgo)?.type}`}>
                    <CheckCircle size={16} />
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
                <FileText className="section-icon" />
                <h4>Decisión de Resolución</h4>
              </div>
              
              <Select
                label="Tipo de Decisión"
                options={decisionOptions}
                placeholder="Seleccione la decisión"
                helperText="Decisión administrativa correspondiente"
                fullWidth
                error={errors.decision_resolucion?.message}
                value={watchedValues.decision_resolucion}
                onChange={(value) => setValue("decision_resolucion", value as DecisionSeguro)}
              />

              {watchedValues.decision_resolucion && (
                <div className="decision-info">
                  <div className="decision-explanation">
                    <strong>
                      {watchedValues.decision_resolucion === "BAJA DE OFICIO" ? 
                        "Baja de Oficio:" : "Resolución de Multa:"}
                    </strong>
                    <span>
                      {watchedValues.decision_resolucion === "BAJA DE OFICIO" ?
                        "Desafiliación administrativa por incumplimiento o irregularidades" :
                        "Imposición de sanción económica por infracciones normativas"}
                    </span>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Motivo (Opcional) */}
          <Card className="form-section form-section-full">
            <CardBody>
              <div className="section-header">
                <FileText className="section-icon" />
                <h4>Motivo (Opcional)</h4>
              </div>
              
              <Input
                label="Detalle del Motivo"
                placeholder="Ingrese el motivo o justificación (opcional)"
                helperText="Máximo 100 caracteres alfanuméricos"
                fullWidth
                maxLength={100}
                error={errors.motivo?.message}
                {...register("motivo")}
              />

              <div className="character-count">
                <span>{(watchedValues.motivo || "").length}/100 caracteres</span>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Resumen de Selección */}
        {isValid && watchedValues.riesgo && watchedValues.decision_resolucion && (
          <Card className="selection-summary">
            <CardBody>
              <div className="summary-header">
                <CheckCircle className="summary-icon" />
                <h4>Datos de Seguro Completados</h4>
              </div>
              
              <div className="summary-grid">
                <div className="summary-item">
                  <strong>Riesgo:</strong>
                  <span>{riesgoOptions.find(r => r.value === watchedValues.riesgo)?.label}</span>
                </div>
                <div className="summary-item">
                  <strong>Decisión:</strong>
                  <span>{decisionOptions.find(d => d.value === watchedValues.decision_resolucion)?.label}</span>
                </div>
                {watchedValues.motivo && (
                  <div className="summary-item summary-item-full">
                    <strong>Motivo:</strong>
                    <span>{watchedValues.motivo}</span>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        )}

        {/* Información de Ayuda */}
        <Card className="help-section">
          <CardBody>
            <h5>💡 Información sobre trámites de SEGURO</h5>
            <div className="help-content">
              <div className="help-categories">
                <div className="help-category">
                  <h6>ALTAS</h6>
                  <p>Para registrar nuevos asegurados titulares o derechohabientes</p>
                </div>
                <div className="help-category">
                  <h6>BAJAS</h6>
                  <p>Para desafiliar asegurados por diversos motivos administrativos</p>
                </div>
                <div className="help-category">
                  <h6>AUDITORÍA</h6>
                  <p>Procesos de verificación y fiscalización de afiliaciones</p>
                </div>
                <div className="help-category">
                  <h6>SALUD</h6>
                  <p>Trámites específicos por lactancia o condiciones de enfermedad</p>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </form>
    </div>
  );
};