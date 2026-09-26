import React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  FileText,
  Calendar,
  CheckCircle,
  Mail,
  Building2,
  Monitor,
  Hash,
  Scale,
  AlertCircle,
} from "lucide-react";
import { Input, Select, Card, CardBody, Badge, Alert } from "../ui";
import {
  formatNumeroResolucion,
  soloDigitosNumeroResolucion,
  formatDNI,
} from "../../utils/formatters";
import type { Reconsideracion, MedioComunicacion } from "../../types";
import "./RecursoStep.css";

const reconsideracionSchema = z.object({
  fecha_recepcion: z.string().min(1, "La fecha de recepción es requerida"),
  numero_resolucion: z
    .string()
    .min(1, "El número de resolución es requerido")
    .regex(/^\d{4}$/, "El número debe contener 4 dígitos"),
  anio: z.string().regex(/^\d{4}$/, "El año debe tener 4 dígitos"),
  fecha_emision: z.string().min(1, "La fecha de emisión es requerida"),
  decision_resolucion: z
    .string()
    .min(1, "La decisión de la resolución es requerida")
    .refine((val) => ["FUNDADO", "INFUNDADO", "EN PARTE"].includes(val), {
      message: "Solo se permiten: FUNDADO, INFUNDADO, EN PARTE",
    }),
  fecha_notificacion: z.string(),
  medio_comunicacion: z.string(),
  dni_recepciona: z.string(),
  apellidos_nombres: z.string().max(50, "Máximo 50 caracteres"),
});

type ReconsideracionForm = z.infer<typeof reconsideracionSchema>;

interface ReconsideracionStepProps {
  data?: Reconsideracion;
  /** Indica si la notificación es obligatoria en este formulario. */
  notificacionObligatoria?: boolean;
  onChange: (data: Reconsideracion) => void;
}

const decisionOptions = [
  { value: "FUNDADO", label: "Fundado" },
  { value: "INFUNDADO", label: "Infundado" },
  { value: "EN PARTE", label: "En Parte" },
];

const medioOptions = [
  { value: "CORREO", label: "Correo Electrónico" },
  { value: "PRESENCIAL", label: "Presencial" },
  { value: "VIRTUAL", label: "Virtual" },
];

export const ReconsideracionStep: React.FC<ReconsideracionStepProps> = ({
  data,
  notificacionObligatoria = true,
  onChange,
}) => {
  const anioActual = new Date().getFullYear();

  const {
    register,
    control,
    watch,
    setValue,
    formState: { errors, isValid, isDirty },
  } = useForm<ReconsideracionForm>({
    resolver: zodResolver(reconsideracionSchema),
    defaultValues: {
      fecha_recepcion: data?.fecha_recepcion || "",
      numero_resolucion: data?.numero_resolucion || "",
      anio: String(data?.anio || anioActual),
      fecha_emision: data?.fecha_emision || "",
      decision_resolucion: data?.decision_resolucion || "",
      fecha_notificacion: data?.fecha_notificacion || "",
      medio_comunicacion: data?.medio_comunicacion || "",
      dni_recepciona: data?.dni_recepciona || "",
      apellidos_nombres: data?.apellidos_nombres || "",
    },
    mode: "onChange",
  });

  const watched = watch();

  // El bloque de notificación es opcional: solo se envía si está completo.
  // Si el usuario lo deja a medias se manda entero a null, porque el backend
  // exige los cuatro campos o ninguno.
  const notificacionCompleta =
    watched.fecha_notificacion !== "" &&
    watched.medio_comunicacion !== "" &&
    watched.dni_recepciona !== "" &&
    watched.apellidos_nombres !== "";

  const notificacionParcial =
    !notificacionCompleta &&
    (watched.fecha_notificacion !== "" ||
      watched.medio_comunicacion !== "" ||
      watched.dni_recepciona !== "" ||
      watched.apellidos_nombres !== "");

  const datosValidos =
    isValid &&
    watched.decision_resolucion !== "" &&
    (notificacionObligatoria ? notificacionCompleta : true);

  React.useEffect(() => {
    if (!datosValidos) return;
    const enviar = notificacionCompleta;
    onChange({
      fecha_recepcion: watched.fecha_recepcion,
      numero_resolucion: watched.numero_resolucion,
      anio: Number(watched.anio),
      fecha_emision: watched.fecha_emision,
      decision_resolucion: watched
        .decision_resolucion as Reconsideracion["decision_resolucion"],
      fecha_notificacion: enviar ? watched.fecha_notificacion : null,
      medio_comunicacion: enviar
        ? (watched.medio_comunicacion as MedioComunicacion)
        : null,
      dni_recepciona: enviar ? watched.dni_recepciona : null,
      apellidos_nombres: enviar ? watched.apellidos_nombres : null,
    });
  }, [watched, datosValidos, notificacionCompleta, onChange]);

  const medioIcon = (medio: string) => {
    if (medio === "PRESENCIAL") return <Building2 size={18} />;
    if (medio === "VIRTUAL") return <Monitor size={18} />;
    return <Mail size={18} />;
  };

  return (
    <div className="recurso-step">
      <div className="step-intro">
        <div className="intro-header">
          <Scale className="intro-icon" />
          <div>
            <h3>Recurso de Reconsideración</h3>
            <p>Pasos 23 al 31 · Impugnación de la resolución emitida</p>
          </div>
        </div>
        <Badge variant="primary" className="tipo-badge">
          <CheckCircle size={16} />
          Segunda parte del acto administrativo
        </Badge>
      </div>

      <form className="recurso-form">
        <div className="form-sections">
          {/* Paso 23: fecha de recepción */}
          <Card className="form-section form-section-full">
            <CardBody>
              <div className="section-header">
                <Calendar className="section-icon" />
                <h4>Datos de la Reconsideración</h4>
              </div>

              <Input
                label="Fecha de Recepción"
                type="date"
                helperText="Formato DD/MM/AAAA"
                icon={<Calendar size={20} />}
                fullWidth
                error={errors.fecha_recepcion?.message?.toString()}
                {...register("fecha_recepcion")}
              />
            </CardBody>
          </Card>

          {/* Pasos 24, 25 y 26: número, año y fecha de emisión */}
          <Card className="form-section">
            <CardBody>
              <div className="section-header">
                <Hash className="section-icon" />
                <h4>Número de Resolución</h4>
              </div>

              <Input
                label="N° Resolución"
                placeholder="0045"
                helperText="4 dígitos, se completa con ceros a la izquierda"
                icon={<FileText size={20} />}
                fullWidth
                maxLength={4}
                inputMode="numeric"
                error={errors.numero_resolucion?.message?.toString()}
                {...register("numero_resolucion", {
                  // Sin relleno mientras se escribe: rellenar en cada pulsación
                  // llenaba el campo al primer dígito y bloqueaba el resto,
                  // porque ya alcanzaba el maxLength de 4.
                  onChange: (e) =>
                    setValue(
                      "numero_resolucion",
                      soloDigitosNumeroResolucion(e.target.value)
                    ),
                  // Los ceros a la izquierda se agregan al salir del campo.
                  // `shouldValidate` es obligatorio: sin esto el error que
                  // apareció al teclear un solo dígito se queda pegado aunque
                  // el valor ya tenga los 4 dígitos.
                  onBlur: (e) => {
                    const digits = soloDigitosNumeroResolucion(e.target.value);
                    setValue("numero_resolucion", digits ? formatNumeroResolucion(digits) : "", {
                      shouldValidate: true,
                    });
                  },
                })}
              />

              <Input
                label="Año"
                type="number"
                helperText="Se muestra el año actual, puede editarlo"
                icon={<Calendar size={20} />}
                fullWidth
                error={errors.anio?.message?.toString()}
                {...register("anio")}
              />

              {watched.numero_resolucion && (
                <div className="resolucion-preview">
                  <strong>
                    Res. N° {watched.numero_resolucion}-{watched.anio}
                  </strong>
                </div>
              )}
            </CardBody>
          </Card>

          <Card className="form-section">
            <CardBody>
              <div className="section-header">
                <Calendar className="section-icon" />
                <h4>Fechas y Decisión</h4>
              </div>

              <Input
                label="Fecha de Emisión"
                type="date"
                helperText="Formato DD/MM/AAAA"
                icon={<Calendar size={20} />}
                fullWidth
                error={errors.fecha_emision?.message?.toString()}
                {...register("fecha_emision")}
              />

              <Controller
                control={control}
                name="decision_resolucion"
                render={({ field }) => (
                  <Select
                    label="Decisión de Resolución"
                    options={decisionOptions}
                    placeholder="Seleccione la decisión"
                    helperText="Solo se permiten: FUNDADO, INFUNDADO, EN PARTE"
                    fullWidth
                    error={errors.decision_resolucion?.message?.toString()}
                    value={field.value}
                    onChange={(value) =>
                      field.onChange(
                        value as Reconsideracion["decision_resolucion"]
                      )
                    }
                  />
                )}
              />
            </CardBody>
          </Card>

          {/* Paso 28: fecha de notificación (opcional) */}
          <Card className="form-section form-section-full">
            <CardBody>
              <div className="section-header">
                <Mail className="section-icon" />
                <h4>Notificación</h4>
              </div>

              {!notificacionObligatoria && (
                <p className="recurso-nota">
                  Opcional: puede grabar la reconsideración sin llegar a la
                  notificación. Si completa alguno de estos datos, debe
                  llenarlos todos.
                </p>
              )}

              {notificacionParcial && (
                <Alert variant="warning" className="recurso-alerta">
                  <AlertCircle size={18} />
                  Complete los cuatro datos de la notificación o déjelos vacíos:
                  si queda alguno suelto, no se guardará ninguno.
                </Alert>
              )}

              <Input
                label="Fecha de Notificación"
                type="date"
                helperText={
                  notificacionObligatoria
                    ? "Formato DD/MM/AAAA"
                    : "Opcional. Formato DD/MM/AAAA"
                }
                icon={<Calendar size={20} />}
                fullWidth
                {...register("fecha_notificacion")}
              />

              <Controller
                control={control}
                name="medio_comunicacion"
                render={({ field }) => (
                  <Select
                    label="Medio de Comunicación"
                    options={medioOptions}
                    placeholder="Seleccione el medio"
                    helperText="Solo se permiten: CORREO, PRESENCIAL, VIRTUAL"
                    fullWidth
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />

              {watched.medio_comunicacion && (
                <div className="medio-comunicacion-selected">
                  {medioIcon(watched.medio_comunicacion)}
                  <span>Notificación por {watched.medio_comunicacion}</span>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Pasos 30 y 31: quien recepciona */}
          <Card className="form-section form-section-full">
            <CardBody>
              <div className="section-header">
                <CheckCircle className="section-icon" />
                <h4>Persona que Recepciona el Documento</h4>
              </div>

              <div className="recepciona-grid">
                <Input
                  label="DNI"
                  placeholder="Documento de identidad"
                  helperText="Entre 5 y 10 caracteres alfanuméricos"
                  icon={<FileText size={20} />}
                  fullWidth
                  maxLength={10}
                  {...register("dni_recepciona", {
                    onChange: (e) =>
                      setValue("dni_recepciona", formatDNI(e.target.value)),
                  })}
                />

                <Input
                  label="Apellidos y Nombres"
                  placeholder="Apellidos y nombres completos"
                  helperText="Máximo 50 caracteres"
                  icon={<CheckCircle size={20} />}
                  fullWidth
                  maxLength={50}
                  error={errors.apellidos_nombres?.message?.toString()}
                  {...register("apellidos_nombres")}
                />
              </div>
            </CardBody>
          </Card>
        </div>

        {isDirty && datosValidos && (
          <Card className="selection-summary">
            <CardBody>
              <div className="summary-header">
                <CheckCircle className="summary-icon" />
                <h4>Reconsideración Completa</h4>
              </div>
              <div className="summary-grid">
                <div className="summary-item">
                  <strong>Resolución:</strong>
                  <span>
                    N° {watched.numero_resolucion}-{watched.anio}
                  </span>
                </div>
                <div className="summary-item">
                  <strong>Decisión:</strong>
                  <span>{watched.decision_resolucion}</span>
                </div>
                <div className="summary-item">
                  <strong>Notificación:</strong>
                  <span>
                    {notificacionCompleta
                      ? `${watched.fecha_notificacion} · ${watched.medio_comunicacion}`
                      : "Pendiente"}
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>
        )}
      </form>
    </div>
  );
};
