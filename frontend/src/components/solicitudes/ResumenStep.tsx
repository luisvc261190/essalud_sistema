import React from "react";
import {
  Building2,
  FileText,
  Calendar,
  CheckCircle,
  Shield,
  Heart,
  Send,
  ArrowLeft,
  Scale,
  Gavel,
} from "lucide-react";
import { Card, CardBody, Badge } from "../ui";
import { Button } from "../ui";
import { formatDisplayDate } from "../../utils/formatters";
import type { Apelacion, Reconsideracion, SolicitudCreate } from "../../types";
import "./ResumenStep.css";

interface ResumenStepProps {
  data: Partial<SolicitudCreate>;
  reconsideracion?: Reconsideracion;
  apelacion?: Apelacion;
  onSubmit: () => void;
  onBack?: () => void;
  loading?: boolean;
}

const capitalize = (value: string) =>
  value.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());

const RIESGO_LABELS: Record<string, string> = {
  "ALTA TITULAR": "Alta de Titular",
  "ALTA DERECHOHABIENTE": "Alta de Derechohabiente",
  "CONDICION DEL ASEGURADO": "Condición del Asegurado",
  AUDITORIA: "Auditoría",
  "FISCALIZACION POSTERIOR": "Fiscalización Posterior",
  "BAJA TITULAR": "Baja de Titular",
  "BAJA DERECHOHABIENTE": "Baja de Derechohabiente",
  LACTANCIA: "Lactancia",
  ENFERMEDAD: "Enfermedad",
  MATERNIDAD: "Maternidad",
  SEPELIO: "Sepelio",
  REINTEGRO: "Reintegro",
};

const DECISION_LABELS: Record<string, string> = {
  "BAJA DE OFICIO": "Baja de Oficio",
  "RESOLUCION DE MULTA": "Resolución de Multa",
  DENEGATORIA: "Denegatoria",
  IMPROCEDENTE: "Improcedente",
  "EN PARTE": "En Parte",
};

export const ResumenStep: React.FC<ResumenStepProps> = ({
  data,
  reconsideracion,
  apelacion,
  onSubmit,
  onBack,
  loading = false,
}) => {
  const esSeguro = data.tipo_tramite === "SEGURO";

  // La notificación es opcional: puede quedar pendiente sin bloquear el registro.
  const notificacionCompleta = !!data.resolucion?.fecha_notificacion;

  return (
    <div className="resumen-step">
      <div className="step-intro">

        <Badge variant="success" className="ready-badge">
          <CheckCircle size={16} />
          Listo para registrar
        </Badge>
      </div>

      <div className="resumen-sections">
        {/* Datos del trámite */}
        <Card className="resumen-section">
          <CardBody>
            <div className="resumen-section-header">
              <FileText className="resumen-section-icon" />
              <h4>Datos del Trámite</h4>
            </div>
            <div className="resumen-grid">
              <div className="resumen-item">
                <span>NIT</span>
                <strong>{data.nit}</strong>
              </div>
              <div className="resumen-item">
                <span>EXP SGD</span>
                <strong>{data.exp_sgd}</strong>
              </div>
              <div className="resumen-item">
                <span>Fecha de Recepción</span>
                <strong>{formatDisplayDate(data.fecha_recepcion || "")}</strong>
              </div>
              <div className="resumen-item">
                <span>RUC</span>
                <strong>{data.ruc}</strong>
              </div>
              <div className="resumen-item resumen-item-full">
                <span>Entidad Empleadora</span>
                <strong>{data.entidad_empleadora}</strong>
              </div>
              <div className="resumen-item">
                <span>DNI/C.E.</span>
                <strong>{data.dni_ce}</strong>
              </div>
              <div className="resumen-item resumen-item-full">
                <span>Asegurado Titular</span>
                <strong>{data.asegurado_titular}</strong>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Tipo de trámite */}
        <Card className={`resumen-section ${esSeguro ? "resumen-seguro" : "resumen-subsidio"}`}>
          <CardBody>
            <div className="resumen-section-header">
              <Building2 className="resumen-section-icon" />
              <h4>Tipo de Trámite: {data.tipo_tramite}</h4>
            </div>
            <div className="resumen-grid">
              <div className="resumen-item">
                <span>RIESGO</span>
                <strong>
                  {esSeguro
                    ? RIESGO_LABELS[data.datos_seguro?.riesgo || ""] ||
                      data.datos_seguro?.riesgo
                    : RIESGO_LABELS[data.datos_subsidio?.riesgo || ""] ||
                      data.datos_subsidio?.riesgo}
                </strong>
              </div>
              <div className="resumen-item">
                <span>DECISIÓN DE RESOLUCIÓN</span>
                <strong>
                  {esSeguro
                    ? DECISION_LABELS[data.datos_seguro?.decision_resolucion || ""] ||
                      data.datos_seguro?.decision_resolucion
                    : DECISION_LABELS[data.datos_subsidio?.decision_resolucion || ""] ||
                      data.datos_subsidio?.decision_resolucion}
                </strong>
              </div>
              {data.datos_seguro?.motivo && (
                <div className="resumen-item resumen-item-full">
                  <span>MOTIVO</span>
                  <strong>{data.datos_seguro.motivo}</strong>
                </div>
              )}
              {data.datos_subsidio?.motivo && (
                <div className="resumen-item resumen-item-full">
                  <span>MOTIVO</span>
                  <strong>{data.datos_subsidio.motivo}</strong>
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Resolución */}
        <Card className="resumen-section resumen-resolucion">
          <CardBody>
            <div className="resumen-section-header">
              <Calendar className="resumen-section-icon" />
              <h4>Resolución</h4>
            </div>
            <div className="resumen-grid">
              <div className="resumen-item">
                <span>N° Resolución</span>
                <strong>
                  N° {data.resolucion?.numero_resolucion}-{data.resolucion?.anio}
                </strong>
              </div>
              <div className="resumen-item">
                <span>Fecha de Emisión</span>
                <strong>{formatDisplayDate(data.resolucion?.fecha_emision || "")}</strong>
              </div>
              {notificacionCompleta ? (
                <>
                  <div className="resumen-item">
                    <span>Fecha de Notificación</span>
                    <strong>
                      {formatDisplayDate(data.resolucion?.fecha_notificacion || "")}
                    </strong>
                  </div>
                  <div className="resumen-item">
                    <span>Medio de Comunicación</span>
                    <strong>
                      {capitalize(data.resolucion?.medio_comunicacion || "")}
                    </strong>
                  </div>
                  <div className="resumen-item">
                    <span>DNI</span>
                    <strong>{data.resolucion?.dni_recepciona}</strong>
                  </div>
                  <div className="resumen-item resumen-item-full">
                    <span>Apellidos y Nombres</span>
                    <strong>{data.resolucion?.apellidos_nombres}</strong>
                  </div>
                </>
              ) : (
                <div className="resumen-item resumen-item-full">
                  <span>NOTIFICACIÓN</span>
                  <strong className="resumen-pendiente">
                    Pendiente — se podrá registrar más adelante
                  </strong>
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Reconsideración (pasos 23-31) */}
        {reconsideracion && (
          <Card className="resumen-section resumen-recurso">
            <CardBody>
              <div className="resumen-section-header">
                <Scale className="resumen-section-icon" />
                <h4>Recurso de Reconsideración</h4>
              </div>
              <div className="resumen-grid">
                <div className="resumen-item">
                  <span>Fecha de Recepción</span>
                  <strong>
                    {formatDisplayDate(reconsideracion.fecha_recepcion)}
                  </strong>
                </div>
                <div className="resumen-item">
                  <span>N° Resolución</span>
                  <strong>
                    N° {reconsideracion.numero_resolucion}-
                    {reconsideracion.anio}
                  </strong>
                </div>
                <div className="resumen-item">
                  <span>Fecha de Emisión</span>
                  <strong>
                    {formatDisplayDate(reconsideracion.fecha_emision)}
                  </strong>
                </div>
                <div className="resumen-item">
                  <span>Decisión de Resolución</span>
                  <strong>
                    {capitalize(reconsideracion.decision_resolucion)}
                  </strong>
                </div>
                {reconsideracion.fecha_notificacion ? (
                  <>
                    <div className="resumen-item">
                      <span>Fecha de Notificación</span>
                      <strong>
                        {formatDisplayDate(reconsideracion.fecha_notificacion)}
                      </strong>
                    </div>
                    <div className="resumen-item">
                      <span>Medio de Comunicación</span>
                      <strong>
                        {capitalize(reconsideracion.medio_comunicacion || "")}
                      </strong>
                    </div>
                    <div className="resumen-item">
                      <span>DNI</span>
                      <strong>{reconsideracion.dni_recepciona}</strong>
                    </div>
                    <div className="resumen-item resumen-item-full">
                      <span>Apellidos y Nombres</span>
                      <strong>{reconsideracion.apellidos_nombres}</strong>
                    </div>
                  </>
                ) : (
                  <div className="resumen-item resumen-item-full">
                    <span>NOTIFICACIÓN</span>
                    <strong className="resumen-pendiente">
                      Pendiente — se podrá registrar más adelante
                    </strong>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        )}

        {/* Apelación (pasos 32-34) */}
        {apelacion && (
          <Card className="resumen-section resumen-recurso">
            <CardBody>
              <div className="resumen-section-header">
                <Gavel className="resumen-section-icon" />
                <h4>Recurso de Apelación</h4>
              </div>
              <div className="resumen-grid">
                <div className="resumen-item">
                  <span>Fecha de Recepción</span>
                  <strong>{formatDisplayDate(apelacion.fecha_recepcion)}</strong>
                </div>
                <div className="resumen-item">
                  <span>N° Nota de Derivación a SGPE</span>
                  <strong>{apelacion.numero_nota_derivacion}</strong>
                </div>
                <div className="resumen-item">
                  <span>Fecha de la Nota</span>
                  <strong>{formatDisplayDate(apelacion.fecha_nota)}</strong>
                </div>
              </div>
            </CardBody>
          </Card>
        )}
      </div>

      {/* Acciones */}
      <div className="resumen-actions">
        {onBack && (
          <Button
            variant="outline"
            onClick={onBack}
            icon={<ArrowLeft size={20} />}
          >
            Volver
          </Button>
        )}
        <Button
          onClick={onSubmit}
          loading={loading}
          icon={<Send size={20} />}
          iconPosition="right"
          disabled={!data.nit || !data.resolucion}
        >
          Registrar Solicitud
        </Button>
      </div>

      <div className="resumen-legal">
        <Shield size={16} />
        <span>
          Al registrar confirma que la información es correcta y veraz. El
          sistema registrará la operación en la auditoría.
        </span>
      </div>

      <div className="resumen-icons">
        {esSeguro ? <Shield size={18} /> : <Heart size={18} />}
        <span>Trámite de {capitalize(data.tipo_tramite || "")}</span>
      </div>
    </div>
  );
};