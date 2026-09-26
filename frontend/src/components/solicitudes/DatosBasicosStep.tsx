import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building, FileText, Calendar, User, CreditCard } from "lucide-react";
import { Input, Card, CardBody, NITInput } from "../ui";
import {
  formatExpSGD,
  formatRUC,
  formatDNI,
} from "../../utils/formatters";
import "./DatosBasicosStep.css";

const datosBasicosSchema = z.object({
  nit: z
    .string()
    .regex(
      /^\d{4}-\d{4}-NIT-\d{7}$/,
      "El NIT debe tener el formato XXXX-XXXX-NIT-XXXXXXX"
    ),
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

  // El NIT lo lleva NITInput, que necesita controlar el cursor y por eso no
  // puede pasar por `register`.

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

  // Valor controlado del NIT.
  const watchedNit = watch("nit") || "";

  return (
    <div className="datos-basicos-step">


      <form className="datos-basicos-form">
        <div className="form-grid">
          {/* Orden del cliente: primero "INF. Del Expediente" y despues
              "INF. De la Empresa". Los pasos 2 a 8 se respetan en el orden en
              que aparecen: NIT(2), EXP SGD(3), FECHA(4), RUC(5),
              ENTIDAD(6), DNI(7), ASEGURADO(8). */}
          <Card className="form-section">
            <CardBody>
              <div className="section-header">
                <FileText className="section-icon" />
                <h4>Información del Expediente</h4>
              </div>

              {/* Paso 2 */}
              <NITInput
                value={watchedNit}
                onValueChange={(valor) => setValue("nit", valor, { shouldValidate: true })}
                onComplete={(valor) => setValue("nit", valor, { shouldValidate: true })}
                error={errors.nit?.message}
                required
                fullWidth
              />
              <br />

              {/* Paso 3 */}
              <Input
                label="EXP SGD"
                placeholder="0000000000000000"
                helperText="16 números, siempre empieza con 0"
                icon={<FileText size={20} />}
                fullWidth
                error={errors.exp_sgd?.message}
                {...register("exp_sgd", {
                  onChange: handleExpSGDChange,
                })}
              />
              <br />
              {/* Paso 4 */}
              <Input
                label="Fecha de Recepción"
                type="date"
                helperText="Formato DD/MM/AAAA"
                icon={<Calendar size={20} />}
                fullWidth
                error={errors.fecha_recepcion?.message}
                {...register("fecha_recepcion")}
                required
              />
            </CardBody>
          </Card>

          {/* Paso 5 y 6 */}
          <Card className="form-section">
            <CardBody>
              <div className="section-header">
                <Building className="section-icon" />
                <h4>Información de la Empresa</h4>
              </div>

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
              <br />

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

          {/* Paso 7 y 8 */}
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