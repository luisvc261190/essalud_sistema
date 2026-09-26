// Types para el sistema de Actos Administrativos (alineados con el backend)

export type TipoTramite = "SEGURO" | "SUBSIDIO";

export type RiesgoSeguro =
  | "ALTA TITULAR"
  | "ALTA DERECHOHABIENTE"
  | "CONDICION DEL ASEGURADO"
  | "AUDITORIA"
  | "FISCALIZACION POSTERIOR"
  | "BAJA TITULAR"
  | "BAJA DERECHOHABIENTE"
  | "LACTANCIA"
  | "ENFERMEDAD";

export type DecisionSeguro = "BAJA DE OFICIO" | "RESOLUCION DE MULTA";

export type RiesgoSubsidio =
  | "LACTANCIA"
  | "ENFERMEDAD"
  | "MATERNIDAD"
  | "SEPELIO"
  | "REINTEGRO"
  | "FISCALIZACION POSTERIOR";

export type DecisionSubsidio =
  | "BAJA DE OFICIO"
  | "DENEGATORIA"
  | "IMPROCEDENTE"
  | "EN PARTE";

export type DecisionReconsideracion = "FUNDADO" | "INFUNDADO" | "EN PARTE";

export type MedioComunicacion = "CORREO" | "PRESENCIAL" | "VIRTUAL";

export interface DatosSeguro {
  riesgo: RiesgoSeguro;
  decision_resolucion: DecisionSeguro;
  motivo?: string | null;
}

export interface DatosSubsidio {
  motivo: string;
  riesgo: RiesgoSubsidio;
  decision_resolucion: DecisionSubsidio;
}

/**
 * Bloque de notificacion. Es opcional: la resolucion y la reconsideracion se
 * pueden grabar sin necesidad de llegar a la notificacion. Si se informa
 * alguno de los campos, el backend exige los cuatro.
 */
export interface Notificacion {
  fecha_notificacion?: string | null;
  medio_comunicacion?: MedioComunicacion | null;
  dni_recepciona?: string | null;
  apellidos_nombres?: string | null;
}

export interface Resolucion extends Notificacion {
  numero_resolucion: string;
  anio: number;
  fecha_emision: string;
}

export interface Reconsideracion extends Notificacion {
  fecha_recepcion: string;
  numero_resolucion: string;
  anio: number;
  fecha_emision: string;
  decision_resolucion: DecisionReconsideracion;
}

export interface Apelacion {
  fecha_recepcion: string;
  numero_nota_derivacion: string;
  fecha_nota: string;
}

export interface Solicitud {
  id: number;
  nit: string;
  exp_sgd: string;
  fecha_recepcion: string;
  ruc: string;
  entidad_empleadora: string;
  dni_ce: string;
  asegurado_titular: string;
  tipo_tramite: TipoTramite;
  origen: string;
  created_at?: string | null;
  datos_seguro?: DatosSeguro | null;
  datos_subsidio?: DatosSubsidio | null;
  resolucion?: Resolucion | null;
  reconsideracion?: Reconsideracion | null;
  apelacion?: Apelacion | null;
}

export interface SolicitudResumen {
  id: number;
  nit: string;
  exp_sgd: string;
  fecha_recepcion: string;
  ruc: string;
  entidad_empleadora: string;
  dni_ce: string;
  asegurado_titular: string;
  tipo_tramite: TipoTramite;
  origen: string;
  created_at?: string | null;
  datos_seguro?: { riesgo: string; decision_resolucion: string } | null;
  datos_subsidio?: { riesgo: string; decision_resolucion: string } | null;
  resolucion?: { numero_resolucion: string; anio: number } | null;
}

export interface SolicitudCreate {
  nit: string;
  exp_sgd: string;
  fecha_recepcion: string;
  ruc: string;
  entidad_empleadora: string;
  dni_ce: string;
  asegurado_titular: string;
  tipo_tramite: TipoTramite;
  datos_seguro?: DatosSeguro | null;
  datos_subsidio?: DatosSubsidio | null;
  resolucion?: Resolucion | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface Catalogos {
  tipos_tramite: string[];
  riesgos_seguro: string[];
  decisiones_seguro: string[];
  riesgos_subsidio: string[];
  decisiones_subsidio: string[];
  decisiones_reconsideracion: string[];
  medios_comunicacion: string[];
  formatos: {
    nit: string;
    exp_sgd_digitos: number;
    ruc_digitos: number;
    dni_ce_min: number;
    dni_ce_max: number;
    numero_resolucion_digitos: number;
    numero_nota_derivacion_digitos: number;
  };
}

export interface Conteo {
  grupo: string;
  total: number;
}

export interface ResumenDashboard {
  total_solicitudes: number;
  por_tipo_tramite: Conteo[];
  por_riesgo: Conteo[];
  total_resoluciones: number;
  total_reconsideraciones: number;
  total_apelaciones: number;
  por_anio: Conteo[];
}

export interface User {
  id: number;
  usuario: string;
  nombres: string | null;
  apellidos: string | null;
  email: string | null;
  roles: string[];
  permissions: string[];
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface ApiError {
  detail: string;
  status?: number;
}

// Modulo de usuarios y roles (admin)
export interface Role {
  id: number;
  nombre: string;
  descripcion?: string | null;
  permissions: string[];
}

export interface UserItem {
  id: number;
  usuario: string;
  nombres?: string | null;
  apellidos?: string | null;
  email?: string | null;
  is_active: boolean;
  roles: string[];
  max_usuarios?: number | null;
  usuarios_creados?: number;
  usuario_creador_id?: number | null;
  usuario_creador?: string | null;
  created_at: string;
}

export interface UserCreatePayload {
  usuario: string;
  password: string;
  nombres?: string | null;
  apellidos?: string | null;
  email?: string | null;
  is_active?: boolean;
  role_ids?: number[];
  max_usuarios?: number | null;
}

export interface UserUpdatePayload {
  nombres?: string | null;
  apellidos?: string | null;
  email?: string | null;
  is_active?: boolean;
  password?: string | null;
  max_usuarios?: number | null;
}

// Auditoría
export interface AuditLog {
  id: number;
  usuario: string | null;
  accion: string;
  entidad: string;
  registro_id: number | null;
  informacion_anterior: Record<string, unknown> | null;
  informacion_nueva: Record<string, unknown> | null;
  ip: string | null;
  created_at: string;
}

// Respaldos
export interface BackupItem {
  id: number;
  tipo: string;
  estado: string;
  archivo_nombre?: string | null;
  archivo_url?: string | null;
  sha256?: string | null;
  tamano_bytes?: number | null;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  creado_por?: number | null;
}

export interface EstadoHerramientas {
  pg_dump?: boolean;
  pg_restore?: boolean;
  motor_backup?: string;
  backup_dir?: string;
}

// Importaciones Excel
export interface ImportacionItem {
  id: number;
  nombre_archivo: string;
  modo: string;
  estado: string;
  registros_leidos: number;
  registros_validos: number;
  registros_con_errores: number;
  hash_archivo?: string | null;
  created_at: string;
  reimportacion: boolean;
}