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
} from "lucide-react";
import { Input, Select, Card, CardBody, Badge } from "../ui";
import {
  formatNumeroResolucion,
  formatDNI,
} from "../../utils/formatters";
import type { Resolucion, MedioComunicacion } from "../../types";
import "./ResolucionStep.css";

const resolucionSchema = z
  .object({
    numero_resolucion: z
      .string()
      .min(1, "El número de resolución es requerido")
      .regex(/^\d{4}$/, "El número debe contener 4 dígitos"),
    anio: z
      .string()
      .regex(/^\d{4}$/, "El año debe tener 4 dígitos"),
    fecha_emision: z.string().min(1, "La fecha de emisión es requerida"),
    fecha_notificacion: z
      .string()
      .min(1, "La fecha de notificación es requerida"),
    medio_comunicacion: z
      .string()
      .refine(
        (val) => val === "" || ["CORREO", "PRESENCIAL", "VIRTUAL"].includes(val),
        { message: "Debe seleccionar un medio de comunicación válido" }
      ),
    dni_recepciona: z
      .string()
      .min(1, "El DNI es requerido")
      .regex(
        /^[A-Z0-9]{5,10}$/,
        "Debe contener entre 5 y 10 caracteres alfanuméricos"
      ),
    apellidos_nombres: z
      .string()
      .min(1, "Apellidos y nombres son requeridos")
      .max(50, "Máximo 50 caracteres"),
  })
  .refine(
    (d) => !d.fecha_emision || !d.fecha_notificacion || d.fecha_notificacion >= d.fecha_emision,
    {
      message: "La notificación no puede ser anterior a la emisión",
      path: ["fecha_notificacion"],
    }
  );

type ResolucionForm = z.infer<typeof resolucionSchema>;

interface ResolucionStepProps {
  data?: Resolucion;
  onChange: (data: Resolucion) => void;
}

const medioOptions = [
  { value: "CORREO", label: "Correo Electrónico" },
  { value: "PRESENCIAL", label: "Presencial" },
  { value: "VIRTUAL", label: "Virtual" },
];

export const ResolucionStep: React.FC<ResolucionStepProps> = ({
  data,
  onChange,
}) => {
  const anioActual = new Date().getFullYear();

  const {
    register,
    control,
    watch,
    setValue,
    formState: { errors, isValid, isDirty },
  } = useForm<ResolucionForm>({
    resolver: zodResolver(resolucionSchema),
    defaultValues: {
      numero_resolucion: data?.numero_resolucion || "",
      anio: String(data?.anio || anioActual),
      fecha_emision: data?.fecha_emision || "",
      fecha_notificacion: data?.fecha_notificacion || "",
      medio_comunicacion: data?.medio_comunicacion || ("" as any),
      dni_recepciona: data?.dni_recepciona || "",
      apellidos_nombres: data?.apellidos_nombres || "",
    },
    mode: "onChange",
  });

  const watched = watch();

  React.useEffect(() => {
    if (isValid && watched.medio_comunicacion !== "") {
      onChange({
        numero_resolucion: watched.numero_resolucion,
        anio: Number(watched.anio),
        fecha_emision: watched.fecha_emision,
        fecha_notificacion: watched.fecha_notificacion,
        medio_comunicacion: watched.medio_comunicacion as MedioComunicacion,
        dni_recepciona: watched.dni_recepciona,
        apellidos_nombres: watched.apellidos_nombres,
      });
    }
  }, [watched, isValid, onChange]);

  const medioIcon = (medio: string) => {
    if (medio === "PRESENCIAL") return <Building2 size={18} />;
    if (medio === "VIRTUAL") return <Monitor size={18} />;
    return <Mail size={18} />;
  };

  return (
    <div className="resolucion-step">
      <div className="step-intro">
        <div className="intro-header">
          <FileText className="intro-icon" />
          <div>
            <h3>Resolución Administrativa</h3>
            <p>Complete los datos de la resolución y su notificación</p>
          </div>
        </div>
        <Badge variant="success" className="tipo-badge">
          <CheckCircle size={16} />
          Paso final del registro
        </Badge>
      </div>

      <form className="resolucion-form">
        <div className="form-sections">
          {/* Número de resolución y año */}
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
                  onChange: (e) =>
                    setValue(
                      "numero_resolucion",
                      formatNumeroResolucion(e.target.value)
                    ),
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
                  <strong>Res. N° {watched.numero_resolucion}-{watched.anio}</strong>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Fechas */}
          <Card className="form-section">
            <CardBody>
              <div className="section-header">
                <Calendar className="section-icon" />
                <h4>Fechas</h4>
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

              <Input
                label="Fecha de Notificación"
                type="date"
                helperText="No puede ser anterior a la emisión"
                icon={<Calendar size={20} />}
                fullWidth
                error={errors.fecha_notificacion?.message?.toString()}
                {...register("fecha_notificacion")}
              />
            </CardBody>
          </Card>

          {/* Medio de comunicación */}
          <Card className="form-section form-section-full">
            <CardBody>
              <div className="section-header">
                <Mail className="section-icon" />
                <h4>Notificación</h4>
              </div>

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
                    error={errors.medio_comunicacion?.message?.toString()}
                    value={field.value}
                    onChange={(value) =>
                      field.onChange(value as MedioComunicacion)
                    }
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

          {/* Quien recepciona */}
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
                  error={errors.dni_recepciona?.message?.toString()}
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

        {isDirty && isValid && (
          <Card className="selection-summary">
            <CardBody>
              <div className="summary-header">
                <CheckCircle className="summary-icon" />
                <h4>Resolución Completa</h4>
              </div>
              <div className="summary-grid">
                <div className="summary-item">
                  <strong>Resolución:</strong>
                  <span>
                    N° {watched.numero_resolucion}-{watched.anio}
                  </span>
                </div>
                <div className="summary-item">
                  <strong>Medio:</strong>
                  <span>{watched.medio_comunicacion}</span>
                </div>
                <div className="summary-item">
                  <strong>Recepciona:</strong>
                  <span>{watched.dni_recepciona} · {watched.apellidos_nombres}</span>
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        <Card className="help-section">
          <CardBody>
            <h5>💡 Información importante</h5>
            <div className="help-grid">
              <div className="help-item">
                <strong>N° Resolución:</strong>
                <span>4 dígitos. Ejemplo: 12 → 0012</span>
              </div>
              <div className="help-item">
                <strong>Año:</strong>
                <span>El año actual se carga por defecto y es editable</span>
              </div>
              <div className="help-item">
                <strong>DNI:</strong>
                <span>Entre 5 y 10 caracteres alfanuméricos</span>
              </div>
            </div>
          </CardBody>
        </Card>
      </form>
    </div>
  );
};