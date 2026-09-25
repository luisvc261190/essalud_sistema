import React from "react";
import { Shield, Heart, CheckCircle } from "lucide-react";
import { Card, CardBody, Badge } from "../ui";
import type { TipoTramite } from "../../types";
import "./TipoTramiteStep.css";

interface TipoTramiteStepProps {
  selectedTipo?: TipoTramite;
  onChange: (tipo: TipoTramite) => void;
}

export const TipoTramiteStep: React.FC<TipoTramiteStepProps> = ({
  selectedTipo,
  onChange,
}) => {
  const tipoTramiteOptions = [
    {
      value: "SEGURO" as TipoTramite,
      title: "SEGURO",
      description: "Trámites relacionados con seguros de salud y afiliaciones",
      icon: Shield,
      color: "primary",
      features: [
        "Alta de titular",
        "Alta de derechohabiente", 
        "Condición del asegurado",
        "Auditoría y fiscalización",
        "Baja de titular/derechohabiente",
        "Lactancia y enfermedad"
      ],
      processes: [
        "Registro de riesgos específicos",
        "Decisiones de resolución",
        "Motivos opcionales"
      ]
    },
    {
      value: "SUBSIDIO" as TipoTramite,
      title: "SUBSIDIO",
      description: "Trámites de subsidios y beneficios económicos",
      icon: Heart,
      color: "secondary",
      features: [
        "Lactancia",
        "Enfermedad", 
        "Maternidad",
        "Sepelio",
        "Reintegro",
        "Fiscalización posterior"
      ],
      processes: [
        "Motivo obligatorio",
        "Riesgo específico",
        "Decisión de resolución"
      ]
    },
  ];

  return (
    <div className="tipo-tramite-step">
      <div className="step-intro">
        <h3>Tipo de Trámite</h3>
        <p>Seleccione el tipo de trámite que desea registrar</p>
        {selectedTipo && (
          <Badge variant="success" className="selection-badge">
            <CheckCircle size={16} />
            {selectedTipo} seleccionado
          </Badge>
        )}
      </div>

      <div className="tipo-options">
        {tipoTramiteOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedTipo === option.value;

          return (
            <Card
              key={option.value}
              className={`tipo-option ${
                isSelected ? "tipo-option-selected" : ""
              }`}
              hover={!isSelected}
            >
              <CardBody>
                <button
                  className="tipo-option-button"
                  onClick={() => onChange(option.value)}
                >
                  <div className="tipo-header">
                    <div className={`tipo-icon tipo-icon-${option.color}`}>
                      <Icon size={32} />
                    </div>
                    <div className="tipo-title-section">
                      <h4>{option.title}</h4>
                      <p>{option.description}</p>
                    </div>
                    {isSelected && (
                      <div className="selection-indicator">
                        <CheckCircle size={24} />
                      </div>
                    )}
                  </div>

                  <div className="tipo-content">
                    <div className="tipo-section">
                      <h5>Tipos de Riesgo</h5>
                      <ul className="feature-list">
                        {option.features.map((feature, index) => (
                          <li key={index}>
                            <CheckCircle size={14} />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="tipo-section">
                      <h5>Proceso</h5>
                      <ul className="process-list">
                        {option.processes.map((process, index) => (
                          <li key={index}>
                            <span className="process-step">{index + 1}</span>
                            <span>{process}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </button>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {selectedTipo && (
        <Card className="selection-summary">
          <CardBody>
            <div className="summary-header">
              <CheckCircle className="summary-icon" />
              <div>
                <h4>Tipo Seleccionado: {selectedTipo}</h4>
                <p>
                  A continuación deberá completar los datos específicos para 
                  trámites de {selectedTipo.toLowerCase()}
                </p>
              </div>
            </div>
            
            <div className="next-steps">
              <h5>Próximos pasos:</h5>
              <ol>
                <li>Completar datos específicos de {selectedTipo.toLowerCase()}</li>
                <li>Registrar información de la resolución</li>
                <li>Revisar y confirmar toda la información</li>
              </ol>
            </div>
          </CardBody>
        </Card>
      )}

      <div className="tipo-help">
        <div className="help-content">
          <h5>💡 Información importante</h5>
          <div className="help-grid">
            <div className="help-item">
              <strong>SEGURO:</strong>
              <span>
                Para trámites relacionados con afiliaciones, altas, bajas y 
                condiciones de asegurados en el sistema de seguridad social.
              </span>
            </div>
            <div className="help-item">
              <strong>SUBSIDIO:</strong>
              <span>
                Para trámites de beneficios económicos como subsidios por 
                maternidad, lactancia, enfermedad, sepelio y reintegros.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};