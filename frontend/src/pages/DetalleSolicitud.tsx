import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  FileText,
  Building2,
  Shield,
  Heart,
  Calendar,
  Scale,
  Gavel,
  Pencil,
  Plus,
  CheckCircle,
  AlertCircle,
  FileSignature,
} from "lucide-react";
import { Card, CardBody, Button, Badge, Alert, Modal, Select, Input } from "../components/ui";
import { PageHeader } from "../components/ui";
import { LoadingScreen } from "../components/ui";
import {
  formatDisplayDate,
  formatNumeroResolucion,
  soloDigitosNumeroResolucion,
  formatNumeroNotaDerivacion,
  soloDigitosNumeroNotaDerivacion,
  formatDNI,
} from "../utils/formatters";
import { solicitudesEndpoints } from "../services/endpoints";
import { getErrorMessage } from "../services/api";
import { useAuth } from "../context/AuthContext";
import type {
  Solicitud,
  Reconsideracion,
  Apelacion,
  Resolucion,
  MedioComunicacion,
  DecisionReconsideracion,
} from "../types";
import "./DetalleSolicitud.css";

const MEDIOS: { value: MedioComunicacion; label: string }[] = [
  { value: "CORREO", label: "Correo Electrónico" },
  { value: "PRESENCIAL", label: "Presencial" },
  { value: "VIRTUAL", label: "Virtual" },
];

const DECISIONES_RECONSIDERACION: { value: DecisionReconsideracion; label: string }[] = [
  { value: "FUNDADO", label: "Fundado" },
  { value: "INFUNDADO", label: "Infundado" },
  { value: "EN PARTE", label: "En Parte" },
];

const reconsideracionSchema = z
  .object({
    fecha_recepcion: z.string().min(1, "La fecha de recepción es requerida"),
    numero_resolucion: z
      .string()
      .regex(/^\d{4}$/, "El número debe contener 4 dígitos"),
    anio: z.string().regex(/^\d{4}$/, "El año debe tener 4 dígitos"),
    fecha_emision: z.string().min(1, "La fecha de emisión es requerida"),
    decision_resolucion: z.enum(
      ["FUNDADO", "INFUNDADO", "EN PARTE"],
      { message: "Debe seleccionar la decisión" }
    ),
    fecha_notificacion: z
      .string()
      .min(1, "La fecha de notificación es requerida"),
    medio_comunicacion: z.enum(
      ["CORREO", "PRESENCIAL", "VIRTUAL"],
      { message: "Debe seleccionar el medio de comunicación" }
    ),
    dni_recepciona: z
      .string()
      .regex(/^[A-Z0-9]{5,10}$/, "Entre 5 y 10 caracteres alfanuméricos"),
    apellidos_nombres: z
      .string()
      .min(1, "Requerido")
      .max(50, "Máximo 50 caracteres"),
  })
  .refine(
    (d) => !d.fecha_emision || !d.fecha_notificacion || d.fecha_notificacion >= d.fecha_emision,
    {
      message: "La notificación no puede ser anterior a la emisión",
      path: ["fecha_notificacion"],
    }
  );

const apelacionSchema = z.object({
  fecha_recepcion: z.string().min(1, "La fecha de recepción es requerida"),
  numero_nota_derivacion: z
    .string()
    .regex(/^\d{6}$/, "El número debe contener 6 dígitos"),
  fecha_nota: z.string().min(1, "La fecha de la nota es requerida"),
});

const resolucionSchema = z
  .object({
    numero_resolucion: z
      .string()
      .regex(/^\d{4}$/, "El número debe contener 4 dígitos"),
    anio: z.string().regex(/^\d{4}$/, "El año debe tener 4 dígitos"),
    fecha_emision: z.string().min(1, "La fecha de emisión es requerida"),
    fecha_notificacion: z
      .string()
      .min(1, "La fecha de notificación es requerida"),
    medio_comunicacion: z.enum(
      ["CORREO", "PRESENCIAL", "VIRTUAL"],
      { message: "Debe seleccionar el medio de comunicación" }
    ),
    dni_recepciona: z
      .string()
      .regex(/^[A-Z0-9]{5,10}$/, "Entre 5 y 10 caracteres alfanuméricos"),
    apellidos_nombres: z
      .string()
      .min(1, "Requerido")
      .max(50, "Máximo 50 caracteres"),
  })
  .refine(
    (d) => !d.fecha_emision || !d.fecha_notificacion || d.fecha_notificacion >= d.fecha_emision,
    {
      message: "La notificación no puede ser anterior a la emisión",
      path: ["fecha_notificacion"],
    }
  );

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

const capitalize = (value: string) =>
  value.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());

/** La notificación es opcional: si no se registró, se muestra como pendiente. */
const SIN_NOTIFICAR = "Pendiente";
const fechaOpcional = (valor?: string | null) =>
  valor ? formatDisplayDate(valor) : SIN_NOTIFICAR;
const textoOpcional = (valor?: string | null) =>
  valor ? capitalize(valor) : SIN_NOTIFICAR;
const valorOpcional = (valor?: string | null) => valor || SIN_NOTIFICAR;

export const DetalleSolicitud: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { tienePermiso } = useAuth();

  const [solicitud, setSolicitud] = useState<Solicitud | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState<string>(
    (location.state as { message?: string } | null)?.message || ""
  );

  const [modalModal, setModalModal] = useState<"" | "reconsideracion" | "apelacion" | "resolucion">("");

  const puedeConsultar = tienePermiso("CONSULTAR_SOLICITUDES");
  const puedeEditar = tienePermiso("CREAR_SOLICITUD");

  const cargar = useCallback(async () => {
    if (!id) return;
    setCargando(true);
    try {
      const data = await solicitudesEndpoints.obtener(Number(id));
      setSolicitud(data);
      setError("");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Abrir modal automático si viene con ?recurso=...
  useEffect(() => {
    if (!solicitud) return;
    const params = new URLSearchParams(location.search);
    const recurso = params.get("recurso");
    if (recurso === "reconsideracion" && !solicitud.reconsideracion) {
      setModalModal("reconsideracion");
    } else if (recurso === "apelacion" && !solicitud.apelacion) {
      setModalModal("apelacion");
    }
  }, [solicitud, location.search]);

  if (cargando) return <LoadingScreen message="Cargando detalle del trámite..." />;

  if (error && !solicitud) {
    return (
      <div className="detalle-page">
        <PageHeader
          title="Detalle del Trámite"
          subtitle="No se pudo cargar la información"
          icon={<FileText size={24} />}
         
          actions={
            <Button variant="outline" icon={<ArrowLeft size={18} />} onClick={() => navigate(-1)}>
              Volver
            </Button>
          }
        />
        <Alert variant="error">
          <AlertCircle size={20} />
          {error}
        </Alert>
      </div>
    );
  }

  if (!solicitud) return null;

  const esSeguro = solicitud.tipo_tramite === "SEGURO";
  const datosRiesgo = esSeguro ? solicitud.datos_seguro : solicitud.datos_subsidio;

  return (
    <div className="detalle-page">
      <PageHeader
        title={`Trámite ${solicitud.exp_sgd}`}
        subtitle={`NIT ${solicitud.nit} · ${solicitud.asegurado_titular}`}
        icon={<FileText size={24} />}
       
        actions={
          <div className="detalle-actions">
            <Button variant="outline" icon={<ArrowLeft size={18} />} onClick={() => navigate(-1)}>
              Volver
            </Button>
            {puedeEditar && (
              <Button
                variant="outline"
                icon={<Pencil size={18} />}
                onClick={() => setModalModal("resolucion")}
                disabled={!solicitud.resolucion}
                title={solicitud.resolucion ? "Editar resolución" : "Registre la resolución del trámite"}
              >
                {solicitud.resolucion ? "Editar Resolución" : "Resolver Trámite"}
              </Button>
            )}
          </div>
        }
      />

      {mensaje && (
        <Alert variant="success" onClose={() => setMensaje("")}>
          <CheckCircle size={20} />
          {mensaje}
        </Alert>
      )}

      {puedeConsultar && solicitud.reconsideracion && (
        <Alert variant="info">
          <Scale size={20} />
          Este trámite cuenta con un recurso de reconsideración registrado.
        </Alert>
      )}

      <div className="detalle-estados">
        <div className={`detalle-estado ${solicitud.resolucion ? "detalle-estado-done" : ""}`}>
          <FileSignature size={18} />
          <div>
            <strong>Resolución</strong>
            <span>{solicitud.resolucion ? "Registrada" : "Pendiente"}</span>
          </div>
        </div>
        <div className={`detalle-estado ${solicitud.reconsideracion ? "detalle-estado-done" : ""}`}>
          <Scale size={18} />
          <div>
            <strong>Reconsideración</strong>
            <span>{solicitud.reconsideracion ? "Registrada" : "Pendiente"}</span>
          </div>
        </div>
        <div className={`detalle-estado ${solicitud.apelacion ? "detalle-estado-done" : ""}`}>
          <Gavel size={18} />
          <div>
            <strong>Apelación</strong>
            <span>{solicitud.apelacion ? "Registrada" : "Pendiente"}</span>
          </div>
        </div>
      </div>

      <div className="detalle-grid">
        {/* Datos del trámite */}
        <Card className="detalle-card">
          <CardBody>
            <div className="detalle-card-header">
              <Building2 className="detalle-card-icon detalle-icon-primary" />
              <h3>Datos del Trámite</h3>
            </div>
            <div className="detalle-fields">
              <div className="detalle-field">
                <span>NIT</span>
                <strong>{solicitud.nit}</strong>
              </div>
              <div className="detalle-field">
                <span>EXP SGD</span>
                <strong>{solicitud.exp_sgd}</strong>
              </div>
              <div className="detalle-field">
                <span>Fecha de Recepción</span>
                <strong>{formatDisplayDate(solicitud.fecha_recepcion)}</strong>
              </div>
              <div className="detalle-field">
                <span>RUC</span>
                <strong>{solicitud.ruc}</strong>
              </div>
              <div className="detalle-field detalle-field-full">
                <span>Entidad Empleadora</span>
                <strong>{solicitud.entidad_empleadora}</strong>
              </div>
              <div className="detalle-field">
                <span>DNI/C.E.</span>
                <strong>{solicitud.dni_ce}</strong>
              </div>
              <div className="detalle-field detalle-field-full">
                <span>Asegurado Titular</span>
                <strong>{solicitud.asegurado_titular}</strong>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Tipo de trámite */}
        <Card className="detalle-card">
          <CardBody>
            <div className="detalle-card-header">
              {esSeguro ? (
                <Shield className="detalle-card-icon detalle-icon-primary" />
              ) : (
                <Heart className="detalle-card-icon detalle-icon-secondary" />
              )}
              <h3>
                Tipo de Trámite:{" "}
                <Badge variant={esSeguro ? "primary" : "secondary"}>
                  {solicitud.tipo_tramite}
                </Badge>
              </h3>
            </div>
            <div className="detalle-fields">
              <div className="detalle-field">
                <span>Riesgo</span>
                <strong>{RIESGO_LABELS[datosRiesgo?.riesgo || ""] || datosRiesgo?.riesgo}</strong>
              </div>
              <div className="detalle-field">
                <span>Decisión de Resolución</span>
                <strong>{datosRiesgo?.decision_resolucion}</strong>
              </div>
              {(esSeguro ? solicitud.datos_seguro?.motivo : solicitud.datos_subsidio?.motivo) && (
                <div className="detalle-field detalle-field-full">
                  <span>Motivo</span>
                  <strong>
                    {esSeguro ? solicitud.datos_seguro?.motivo : solicitud.datos_subsidio?.motivo}
                  </strong>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="detalle-grid">
        {/* Resolución */}
        <Card className="detalle-card">
          <CardBody>
            <div className="detalle-card-header">
              <Calendar className="detalle-card-icon detalle-icon-warning" />
              <h3>Resolución</h3>
              {solicitud.resolucion ? (
                <Badge variant="success" size="sm">Registrada</Badge>
              ) : (
                <Badge variant="gray" size="sm">Pendiente</Badge>
              )}
            </div>
            {solicitud.resolucion ? (
              <div className="detalle-fields">
                <div className="detalle-field">
                  <span>N° Resolución</span>
                  <strong className="detalle-reso">
                    {solicitud.resolucion.numero_resolucion}-{solicitud.resolucion.anio}
                  </strong>
                </div>
                <div className="detalle-field">
                  <span>Fecha de Emisión</span>
                  <strong>{formatDisplayDate(solicitud.resolucion.fecha_emision)}</strong>
                </div>
                <div className="detalle-field">
                  <span>Fecha de Notificación</span>
                  <strong>{fechaOpcional(solicitud.resolucion.fecha_notificacion)}</strong>
                </div>
                <div className="detalle-field">
                  <span>Medio de Comunicación</span>
                  <strong>{textoOpcional(solicitud.resolucion.medio_comunicacion)}</strong>
                </div>
                <div className="detalle-field">
                  <span>DNI</span>
                  <strong>{valorOpcional(solicitud.resolucion.dni_recepciona)}</strong>
                </div>
                <div className="detalle-field detalle-field-full">
                  <span>Apellidos y Nombres</span>
                  <strong>{valorOpcional(solicitud.resolucion.apellidos_nombres)}</strong>
                </div>
              </div>
            ) : (
              <div className="detalle-vacio">
                <AlertCircle size={24} />
                <p>El trámite aún no tiene resolución registrada</p>
                {puedeEditar && (
                  <Button
                    size="sm"
                    icon={<Plus size={16} />}
                    onClick={() => setModalModal("resolucion")}
                  >
                    Resolver Trámite
                  </Button>
                )}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Recursos */}
        <Card className="detalle-card">
          <CardBody>
            <div className="detalle-card-header">
              <Scale className="detalle-card-icon detalle-icon-success" />
              <h3>Recursos Administrativos</h3>
            </div>

            {solicitud.reconsideracion ? (
              <div className="detalle-subcard">
                <div className="detalle-subcard-header">
                  <strong>Reconsideración</strong>
                  <Badge variant="success" size="sm">N° {solicitud.reconsideracion.numero_resolucion}-{solicitud.reconsideracion.anio}</Badge>
                </div>
                <div className="detalle-fields">
                  <div className="detalle-field">
                    <span>Fecha de Recepción</span>
                    <strong>{formatDisplayDate(solicitud.reconsideracion.fecha_recepcion)}</strong>
                  </div>
                  <div className="detalle-field">
                    <span>Decisión</span>
                    <strong>{solicitud.reconsideracion.decision_resolucion}</strong>
                  </div>
                  <div className="detalle-field">
                    <span>Fecha de Notificación</span>
                    <strong>{fechaOpcional(solicitud.reconsideracion.fecha_notificacion)}</strong>
                  </div>
                  <div className="detalle-field">
                    <span>Medio</span>
                    <strong>{textoOpcional(solicitud.reconsideracion.medio_comunicacion)}</strong>
                  </div>
                  <div className="detalle-field detalle-field-full">
                    <span>Quien Recibió</span>
                    <strong>
                      {valorOpcional(solicitud.reconsideracion.apellidos_nombres)} (
                      {valorOpcional(solicitud.reconsideracion.dni_recepciona)})
                    </strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="detalle-subcard detalle-subcard-vacio">
                <AlertCircle size={18} />
                <p>Sin reconsideración registrada</p>
                {puedeEditar && solicitud.resolucion && (
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Plus size={16} />}
                    onClick={() => setModalModal("reconsideracion")}
                  >
                    Registrar Reconsideración
                  </Button>
                )}
              </div>
            )}

            <div className="detalle-divisor" />

            {solicitud.apelacion ? (
              <div className="detalle-subcard">
                <div className="detalle-subcard-header">
                  <strong>Apelación</strong>
                  <Badge variant="primary" size="sm">N° {solicitud.apelacion.numero_nota_derivacion}</Badge>
                </div>
                <div className="detalle-fields">
                  <div className="detalle-field">
                    <span>Fecha de Recepción</span>
                    <strong>{formatDisplayDate(solicitud.apelacion.fecha_recepcion)}</strong>
                  </div>
                  <div className="detalle-field">
                    <span>Fecha de Nota</span>
                    <strong>{formatDisplayDate(solicitud.apelacion.fecha_nota)}</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="detalle-subcard detalle-subcard-vacio">
                <AlertCircle size={18} />
                <p>Sin apelación registrada</p>
                {puedeEditar && (
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Plus size={16} />}
                    onClick={() => setModalModal("apelacion")}
                  >
                    Registrar Apelación
                  </Button>
                )}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Modales */}
      <ReconsideracionModal
        abierto={modalModal === "reconsideracion"}
        onClose={() => setModalModal("")}
        onGuardar={async (data) => {
          await solicitudesEndpoints.crearReconsideracion(solicitud.id, data);
          await cargar();
          setMensaje("Recurso de reconsideración registrado correctamente");
        }}
      />
      <ApelacionModal
        abierto={modalModal === "apelacion"}
        onClose={() => setModalModal("")}
        onGuardar={async (data) => {
          await solicitudesEndpoints.crearApelacion(solicitud.id, data);
          await cargar();
          setMensaje("Recurso de apelación registrado correctamente");
        }}
      />
      <ResolucionModal
        abierto={modalModal === "resolucion"}
        onClose={() => setModalModal("")}
        resolucion={solicitud.resolucion}
        onGuardar={async (data) => {
          if (solicitud.resolucion) {
            await solicitudesEndpoints.editarResolucion(solicitud.id, data);
            setMensaje("Resolución actualizada correctamente");
          } else {
            await solicitudesEndpoints.crearResolucion(solicitud.id, data);
            setMensaje("Resolución registrada correctamente");
          }
          await cargar();
        }}
      />
    </div>
  );
};

interface ModalBaseProps {
  abierto: boolean;
  onClose: () => void;
}

/* ===== Modal Reconsideración ===== */
interface ReconsideracionModalProps extends ModalBaseProps {
  onGuardar: (data: Reconsideracion) => Promise<void>;
}

const ReconsideracionModal: React.FC<ReconsideracionModalProps> = ({
  abierto,
  onClose,
  onGuardar,
}) => {
  const anioActual = new Date().getFullYear();

  type FormReconsideracion = z.infer<typeof reconsideracionSchema>;
  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormReconsideracion>({
    resolver: zodResolver(reconsideracionSchema) as never,
    defaultValues: { anio: String(anioActual), numero_resolucion: "", fecha_recepcion: "", fecha_emision: "", fecha_notificacion: "", decision_resolucion: "" as FormReconsideracion["decision_resolucion"], medio_comunicacion: "" as FormReconsideracion["medio_comunicacion"], dni_recepciona: "", apellidos_nombres: "" },
    mode: "onChange",
  });

  useEffect(() => {
    if (abierto)
      reset({ anio: String(anioActual), numero_resolucion: "", fecha_recepcion: "", fecha_emision: "", fecha_notificacion: "", decision_resolucion: "" as FormReconsideracion["decision_resolucion"], medio_comunicacion: "" as FormReconsideracion["medio_comunicacion"], dni_recepciona: "", apellidos_nombres: "" });
  }, [abierto, reset, anioActual]);

  const onSubmit = async (values: FormReconsideracion) => {
    try {
      await onGuardar({
        fecha_recepcion: values.fecha_recepcion,
        numero_resolucion: values.numero_resolucion,
        anio: Number(values.anio),
        fecha_emision: values.fecha_emision,
        decision_resolucion: values.decision_resolucion,
        fecha_notificacion: values.fecha_notificacion,
        medio_comunicacion: values.medio_comunicacion,
        dni_recepciona: values.dni_recepciona,
        apellidos_nombres: values.apellidos_nombres,
      });
      onClose();
    } catch (err) {
      // El error se muestra por la navegación del padre
      window.alert(getErrorMessage(err));
    }
  };

  return (
    <Modal isOpen={abierto} onClose={onClose} title="Registrar Reconsideración" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="modal-form">
        <div className="modal-grid">
          <div className="form-field">
            <label>
              Fecha de Recepción *
            </label>
            <Input type="date" {...register("fecha_recepcion")} error={errors.fecha_recepcion?.message} />
          </div>
          <div className="form-field">
            <label>N° Resolución *</label>
            <div className="form-input-prefix">
              <span>N°</span>
              <Input
                placeholder="0000"
                maxLength={4}
                inputMode="numeric"
                {...register("numero_resolucion", {
                  // Mientras se escribe solo se filtran los dígitos. Rellenar con
                  // ceros aquí llenaba el campo al primer dígito y bloqueaba el
                  // resto, porque el campo ya alcanzaba su maxLength de 4.
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
                    setValue(
                      "numero_resolucion",
                      digits ? formatNumeroResolucion(digits) : "",
                      { shouldValidate: true }
                    );
                  },
                })}
                error={errors.numero_resolucion?.message}
              />
            </div>
          </div>
          <div className="form-field">
            <label>Año de Resolución *</label>
            <Input type="number" min={2000} max={2100} maxLength={4} {...register("anio")} error={errors.anio?.message} />
          </div>
          <div className="form-field">
            <label>Fecha de Emisión *</label>
            <Input type="date" {...register("fecha_emision")} error={errors.fecha_emision?.message} />
          </div>
          <div className="form-field">
            <label>Decisión de Resolución *</label>
            <Controller
              control={control}
              name="decision_resolucion"
              render={({ field }) => (
                <Select
                  placeholder="Seleccione la decisión"
                  options={DECISIONES_RECONSIDERACION}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.decision_resolucion?.message}
                />
              )}
            />
          </div>
          <div className="form-field">
            <label>Fecha de Notificación *</label>
            <Input type="date" {...register("fecha_notificacion")} error={errors.fecha_notificacion?.message} />
          </div>
          <div className="form-field">
            <label>Medio de Comunicación *</label>
            <Controller
              control={control}
              name="medio_comunicacion"
              render={({ field }) => (
                <Select
                  placeholder="Seleccione el medio"
                  options={MEDIOS}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.medio_comunicacion?.message}
                />
              )}
            />
          </div>
          <div className="form-field">
            <label>DNI de quien recepciona *</label>
            <Input
              placeholder="Documento (5-10 caracteres)"
              maxLength={10}
              {...register("dni_recepciona")}
              onChange={(e) => {
                e.target.value = formatDNI(e.target.value);
                register("dni_recepciona").onChange(e);
              }}
              error={errors.dni_recepciona?.message}
            />
          </div>
          <div className="form-field form-field-full">
            <label>Apellidos y Nombres de quien recepciona *</label>
            <Input placeholder="Apellidos y nombres" maxLength={50} {...register("apellidos_nombres")} error={errors.apellidos_nombres?.message} />
          </div>
        </div>
        <div className="modal-footer">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSubmitting} icon={<Scale size={18} />}>
            Registrar Reconsideración
          </Button>
        </div>
      </form>
    </Modal>
  );
};

/* ===== Modal Apelación ===== */
interface ApelacionModalProps extends ModalBaseProps {
  onGuardar: (data: Apelacion) => Promise<void>;
}

const ApelacionModal: React.FC<ApelacionModalProps> = ({ abierto, onClose, onGuardar }) => {
  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<
    z.infer<typeof apelacionSchema>
  >({
    resolver: zodResolver(apelacionSchema),
    defaultValues: { fecha_recepcion: "", numero_nota_derivacion: "", fecha_nota: "" },
    mode: "onChange",
  });

  useEffect(() => {
    if (abierto) reset({ fecha_recepcion: "", numero_nota_derivacion: "", fecha_nota: "" });
  }, [abierto, reset]);

  const onSubmit = async (values: z.infer<typeof apelacionSchema>) => {
    try {
      await onGuardar({
        fecha_recepcion: values.fecha_recepcion,
        numero_nota_derivacion: values.numero_nota_derivacion,
        fecha_nota: values.fecha_nota,
      });
      onClose();
    } catch (err) {
      window.alert(getErrorMessage(err));
    }
  };

  return (
    <Modal isOpen={abierto} onClose={onClose} title="Registrar Apelación" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="modal-form">
        <p className="modal-note">
          Para el recurso de apelación solo se registra la fecha de recepción, el número de nota
          de derivación SGPE (6 dígitos) y la fecha de la nota.
        </p>
        <div className="modal-grid">
          <div className="form-field">
            <label>Fecha de Recepción *</label>
            <Input type="date" {...register("fecha_recepcion")} error={errors.fecha_recepcion?.message} />
          </div>
          <div className="form-field">
            <label>N° Nota de Derivación SGPE *</label>
            <div className="form-input-prefix">
              <span>N°</span>
              <Input
                placeholder="000000"
                maxLength={6}
                inputMode="numeric"
                {...register("numero_nota_derivacion", {
                  // Mismo criterio que el número de resolución: solo dígitos
                  // mientras se escribe, ceros a la izquierda al salir.
                  onChange: (e) =>
                    setValue(
                      "numero_nota_derivacion",
                      soloDigitosNumeroNotaDerivacion(e.target.value)
                    ),
                  onBlur: (e) => {
                    const digits = soloDigitosNumeroNotaDerivacion(e.target.value);
                    setValue(
                      "numero_nota_derivacion",
                      digits ? formatNumeroNotaDerivacion(digits) : "",
                      { shouldValidate: true }
                    );
                  },
                })}
                error={errors.numero_nota_derivacion?.message}
              />
            </div>
          </div>
          <div className="form-field form-field-full">
            <label>Fecha de Nota *</label>
            <Input type="date" {...register("fecha_nota")} error={errors.fecha_nota?.message} />
          </div>
        </div>
        <div className="modal-footer">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSubmitting} icon={<Gavel size={18} />}>
            Registrar Apelación
          </Button>
        </div>
      </form>
    </Modal>
  );
};

/* ===== Modal Resolución ===== */
interface ResolucionModalProps extends ModalBaseProps {
  resolucion?: Resolucion | null;
  onGuardar: (data: Resolucion) => Promise<void>;
}

const ResolucionModal: React.FC<ResolucionModalProps> = ({
  abierto,
  onClose,
  resolucion,
  onGuardar,
}) => {
  const anioActual = new Date().getFullYear();
  type FormResolucion = z.infer<typeof resolucionSchema>;
  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormResolucion>({
    resolver: zodResolver(resolucionSchema) as never,
    defaultValues: {},
    mode: "onChange",
  });

  useEffect(() => {
    if (abierto)
      reset({
        numero_resolucion: resolucion?.numero_resolucion || "",
        anio: String(resolucion?.anio || anioActual),
        fecha_emision: resolucion?.fecha_emision || "",
        fecha_notificacion: resolucion?.fecha_notificacion || "",
        medio_comunicacion: (resolucion?.medio_comunicacion || "") as FormResolucion["medio_comunicacion"],
        dni_recepciona: resolucion?.dni_recepciona || "",
        apellidos_nombres: resolucion?.apellidos_nombres || "",
      });
  }, [abierto, resolucion, reset, anioActual]);

  const onSubmit = async (values: FormResolucion) => {
    try {
      await onGuardar({
        numero_resolucion: values.numero_resolucion,
        anio: Number(values.anio),
        fecha_emision: values.fecha_emision,
        fecha_notificacion: values.fecha_notificacion,
        medio_comunicacion: values.medio_comunicacion,
        dni_recepciona: values.dni_recepciona,
        apellidos_nombres: values.apellidos_nombres,
      });
      onClose();
    } catch (err) {
      window.alert(getErrorMessage(err));
    }
  };

  return (
    <Modal
      isOpen={abierto}
      onClose={onClose}
      title={resolucion ? "Editar Resolución" : "Registrar Resolución"}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="modal-form">
        <div className="modal-grid">
          <div className="form-field">
            <label>N° Resolución *</label>
            <div className="form-input-prefix">
              <span>N°</span>
              <Input
                placeholder="0000"
                maxLength={4}
                inputMode="numeric"
                {...register("numero_resolucion", {
                  // Mientras se escribe solo se filtran los dígitos. Rellenar con
                  // ceros aquí llenaba el campo al primer dígito y bloqueaba el
                  // resto, porque el campo ya alcanzaba su maxLength de 4.
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
                    setValue(
                      "numero_resolucion",
                      digits ? formatNumeroResolucion(digits) : "",
                      { shouldValidate: true }
                    );
                  },
                })}
                error={errors.numero_resolucion?.message}
              />
            </div>
          </div>
          <div className="form-field">
            <label>Año de Resolución *</label>
            <Input type="number" min={2000} max={2100} maxLength={4} {...register("anio")} error={errors.anio?.message} />
          </div>
          <div className="form-field">
            <label>Fecha de Emisión *</label>
            <Input type="date" {...register("fecha_emision")} error={errors.fecha_emision?.message} />
          </div>
          <div className="form-field">
            <label>Fecha de Notificación *</label>
            <Input type="date" {...register("fecha_notificacion")} error={errors.fecha_notificacion?.message} />
          </div>
          <div className="form-field">
            <label>Medio de Comunicación *</label>
            <Controller
              control={control}
              name="medio_comunicacion"
              render={({ field }) => (
                <Select
                  placeholder="Seleccione el medio"
                  options={MEDIOS}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.medio_comunicacion?.message}
                />
              )}
            />
          </div>
          <div className="form-field">
            <label>DNI de quien recepciona *</label>
            <Input
              placeholder="Documento (5-10 caracteres)"
              maxLength={10}
              {...register("dni_recepciona")}
              onChange={(e) => {
                e.target.value = formatDNI(e.target.value);
                register("dni_recepciona").onChange(e);
              }}
              error={errors.dni_recepciona?.message}
            />
          </div>
          <div className="form-field form-field-full">
            <label>Apellidos y Nombres de quien recepciona *</label>
            <Input placeholder="Apellidos y nombres" maxLength={50} {...register("apellidos_nombres")} error={errors.apellidos_nombres?.message} />
          </div>
        </div>
        <div className="modal-footer">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSubmitting} icon={<FileSignature size={18} />}>
            {resolucion ? "Guardar Cambios" : "Registrar Resolución"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};