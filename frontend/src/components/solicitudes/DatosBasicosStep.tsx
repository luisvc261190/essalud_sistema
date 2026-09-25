import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building, FileText, Calendar, User, CreditCard } from "lucide-react";
import { Input, Card, CardBody } from "../ui";
import { formatNIT, formatExpSGD, formatRUC, formatDNI } from "../../utils/formatters";
import "./DatosBasicosStep.css";

const datosBasicosSchema = z.object({
  nit: z.string().min(1, "El NIT es requerido"),
  exp_sgd: z.string().regex(/^0\d{15}$/, "EXP SGD debe tener 16 dígitos y empezar con 0"),
  fecha_recepcion: z.string().min(1, "La fecha de recepción es requerida"),
  ruc: z.string().regex(/^\d{11}$/, "RUC debe tener exactamente 11 dígitos"),
  entidad_empleadora: z.string().min(1, "La entidad empleadora es requerida").max(50, "Máximo 50 caracteres"),
  dni_ce: z.string().min(5, "DNI/C.E. debe tener entre 5 y 10 caracteres").max(10, "DNI/C.E. debe tener entre 5 y 10 caracteres"),
  asegurado_titular: z.string().min(1, "El asegurado titular es requerido").max(50, "Máximo 50 caracteres"),
});

type DatosBasicosForm = z.infer<typeof datosBasicosSchema>;

interface DatosBasicosStepProps {
  data: Partial<DatosBasicosForm>;
  onChange: (data: Partial<DatosBasicosForm>) => void;
}

export const DatosBasicosStep: React.FC<DatosBasicosStepProps> = ({ data, onChange }) => {
  const {
    register,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<DatosBasicosForm>({
    resolver: zodResolver(datosBasicosSchema),
    defaultValues: data,
    mode: "onChange",
  });

  // Observar cambios en el formulario y propagarlos
  React.useEffect(() => {
    const subscription = watch((formData) => {
      if (isValid) {
        onChange(formData as DatosBasicosForm);
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, onChange, isValid]);

  // Formatear NIT automáticamente
  const handleNITChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatNIT(e.target.value);
    setValue("nit", formatted);
  };

  // Formatear EXP SGD automáticamente
  const handleExpSGDChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatExpSGD(e.target.value);
    setValue("exp_sgd", formatted);
  };

  // Formatear RUC automáticamente
  const handleRUCChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatRUC(e.target.value);
    setValue("ruc", formatted);
  };

  // Formatear DNI/C.E. automáticamente
  const handleDNIChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatDNI(e.target.value);
    setValue("dni_ce", formatted);
  };

  return (
    <div className="datos-basicos-step">
      <div className="step-intro">
        <h3>Datos Básicos del Acto Administrativo</h3>
        <p>Ingrese la información principal del trámite. Todos los campos son obligatorios.</p>
      </div>

      <form className="datos-basicos-form">
        <div className="form-grid">
          {/* NIT */}
          <Card className="form-section">
            <CardBody>
              <div className="section-header">
                <Building className="section-icon" />
                <h4>Información de la Empresa</h4>
              </div>
              
              <Input
                label="NIT"
                placeholder="0000-0000-NIT-0000000"
                helperText="Formato: XXXX-XXXX-NIT-XXXXXXX"
                icon={<FileText size={20} />}
                fullWidth
                error={errors.nit?.message}
                {...register("nit", {
                  onChange: handleNITChange,
                })}
              />
              
              <Input
                label="RUC"
                placeholder="Ingrese 11 dígitos"
                helperText="Debe contener exactamente 11 números"
                icon={<CreditCard size={20} />}
                fullWidth
                error={errors.ruc?.message}
                {...register("ruc", {
                  onChange: handleRUCChange,
                })}
              />
              
              <Input
                label="Entidad Empleadora"
                placeholder="Nombre de la entidad empleadora"
                helperText="Máximo 50 caracteres"
                icon={<Building size={20} />}
                fullWidth
                maxLength={50}
                error={errors.entidad_empleadora?.message}
                {...register("entidad_empleadora")}
              />
            </CardBody>
          </Card>

          {/* EXP SGD y Fecha */}
          <Card className="form-section">
            <CardBody>
              <div className="section-header">
                <FileText className="section-icon" />
                <h4>Información del Expediente</h4>
              </div>
              
              <Input
                label="EXP SGD"
                placeholder="0000000000000000"
                helperText="16 números, debe empezar con 0"
                icon={<FileText size={20} />}
                fullWidth
                error={errors.exp_sgd?.message}
                {...register("exp_sgd", {
                  onChange: handleExpSGDChange,
                })}
              />
              
              <Input
                label="Fecha de Recepción"
                type="date"
                helperText="Fecha en formato DD/MM/YYYY"
                icon={<Calendar size={20} />}
                fullWidth
                error={errors.fecha_recepcion?.message}
                {...register("fecha_recepcion")}
              />
            </CardBody>
          </Card>

          {/* Datos del Asegurado */}
          <Card className="form-section form-section-full">
            <CardBody>
              <div className="section-header">
                <User className="section-icon" />
                <h4>Datos del Asegurado</h4>
              </div>
              
              <div className="asegurado-grid">
                <Input
                  label="DNI/C.E."
                  placeholder="Documento de identidad"
                  helperText="Entre 5 y 10 caracteres alfanuméricos"
                  icon={<CreditCard size={20} />}
                  fullWidth
                  error={errors.dni_ce?.message}
                  {...register("dni_ce", {
                    onChange: handleDNIChange,
                  })}
                />
                
                <Input
                  label="Asegurado Titular"
                  placeholder="Nombres y apellidos completos"
                  helperText="Máximo 50 caracteres"
                  icon={<User size={20} />}
                  fullWidth
                  maxLength={50}
                  error={errors.asegurado_titular?.message}
                  {...register("asegurado_titular")}
                />
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Información de ayuda */}
        <Card className="help-section">
          <CardBody>
            <h5>💡 Información sobre los formatos</h5>
            <div className="help-grid">
              <div className="help-item">
                <strong>NIT:</strong>
                <span>Se completará automáticamente con ceros a la izquierda. Ejemplo: 12 → 0000012</span>
              </div>
              <div className="help-item">
                <strong>EXP SGD:</strong>
                <span>Debe tener exactamente 16 números y siempre empezar con 0</span>
              </div>
              <div className="help-item">
                <strong>RUC:</strong>
                <span>Debe contener exactamente 11 números</span>
              </div>
              <div className="help-item">
                <strong>DNI/C.E.:</strong>
                <span>Entre 5 y 10 caracteres, puede incluir letras y números</span>
              </div>
            </div>
          </CardBody>
        </Card>
      </form>
    </div>
  );
};