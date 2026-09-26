import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FileText, Calendar, Hash, CheckCircle } from "lucide-react";
import { Input, Card, CardBody, Badge } from "../ui";
import { formatNumeroNotaDerivacion, soloDigitosNumeroNotaDerivacion } from "../../utils/formatters";
import type { Apelacion } from "../../types";
import "./RecursoStep.css";

const apelacionSchema = z.object({
  fecha_recepcion: z.string().min(1, "La fecha de recepción es requerida"),
  numero_nota_derivacion: z
    .string()
    .min(1, "El número de nota es requerido")
    .regex(/^\d{6}$/, "El número debe contener 6 dígitos"),
  fecha_nota: z.string().min(1, "La fecha de la nota es requerida"),
});

type ApelacionForm = z.infer<typeof apelacionSchema>;

interface ApelacionStepProps {
  data?: Apelacion;
  onChange: (data: Apelacion) => void;
}

export const ApelacionStep: React.FC<ApelacionStepProps> = ({
  data,
  onChange,
}) => {
  const {
    register,
    watch,
    setValue,
    formState: { errors, isValid, isDirty },
  } = useForm<ApelacionForm>({
    resolver: zodResolver(apelacionSchema),
    defaultValues: {
      fecha_recepcion: data?.fecha_recepcion || "",
      numero_nota_derivacion: data?.numero_nota_derivacion || "",
      fecha_nota: data?.fecha_nota || "",
    },
    mode: "onChange",
  });

  const watched = watch();

  React.useEffect(() => {
    if (!isValid) return;
    onChange({
      fecha_recepcion: watched.fecha_recepcion,
      numero_nota_derivacion: watched.numero_nota_derivacion,
      fecha_nota: watched.fecha_nota,
    });
  }, [watched, isValid, onChange]);

  return (
    <div className="recurso-step">
      <div className="step-intro">

        <Badge variant="warning" className="tipo-badge">
          <CheckCircle size={16} />
          Tercera parte del acto administrativo
        </Badge>
      </div>

      <form className="recurso-form">
        <div className="form-sections">
          {/* Paso 32: fecha de recepción */}
          <Card className="form-section">
            <CardBody>
              <div className="section-header">
                <Calendar className="section-icon" />
                <h4>Recepción de la Apelación</h4>
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

          {/* Pasos 33 y 34: nota de derivación */}
          <Card className="form-section">
            <CardBody>
              <div className="section-header">
                <Hash className="section-icon" />
                <h4>Nota de Derivación a SGPE</h4>
              </div>

              <Input
                label="N° de Nota de Derivación a SGPE"
                placeholder="000012"
                helperText="6 dígitos, se completa con ceros a la izquierda (ej. 12 → 000012)"
                icon={<FileText size={20} />}
                fullWidth
                maxLength={6}
                inputMode="numeric"
                error={errors.numero_nota_derivacion?.message?.toString()}
                {...register("numero_nota_derivacion", {
                  // Sin relleno mientras se escribe: rellenar en cada pulsación
                  // llenaba el campo al primer dígito y bloqueaba el resto,
                  // porque ya alcanzaba el maxLength de 6.
                  onChange: (e) =>
                    setValue(
                      "numero_nota_derivacion",
                      soloDigitosNumeroNotaDerivacion(e.target.value)
                    ),
                  // Los ceros a la izquierda se agregan al salir del campo.
                  // `shouldValidate` es obligatorio: sin esto el error que
                  // apareció al teclear un solo dígito se queda pegado aunque
                  // el valor ya tenga los 6 dígitos.
                  onBlur: (e) => {
                    const digits = soloDigitosNumeroNotaDerivacion(e.target.value);
                    setValue(
                      "numero_nota_derivacion",
                      digits ? formatNumeroNotaDerivacion(digits) : "",
                      { shouldValidate: true }
                    );
                  },
                })}
              />

              <Input
                label="Fecha de la Nota"
                type="date"
                helperText="Formato DD/MM/AAAA"
                icon={<Calendar size={20} />}
                fullWidth
                error={errors.fecha_nota?.message?.toString()}
                {...register("fecha_nota")}
              />

              {watched.numero_nota_derivacion && (
                <div className="resolucion-preview">
                  <strong>
                    Nota N° {watched.numero_nota_derivacion}
                  </strong>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {isDirty && isValid && (
          <Card className="selection-summary">
            <CardBody>
              <div className="summary-header">
                <CheckCircle className="summary-icon" />
                <h4>Apelación Completa</h4>
              </div>
              <div className="summary-grid">
                <div className="summary-item">
                  <strong>Recepción:</strong>
                  <span>{watched.fecha_recepcion}</span>
                </div>
                <div className="summary-item">
                  <strong>Nota SGPE:</strong>
                  <span>
                    N° {watched.numero_nota_derivacion} · {watched.fecha_nota}
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
