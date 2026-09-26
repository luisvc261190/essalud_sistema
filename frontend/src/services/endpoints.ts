import api from "./api";
import type {
  LoginCredentials,
  TokenResponse,
  User,
  Solicitud,
  SolicitudCreate,
  SolicitudResumen,
  PaginatedResponse,
  Resolucion,
  Reconsideracion,
  Apelacion,
  Catalogos,
  ResumenDashboard,
  UserItem,
  UserCreatePayload,
  UserUpdatePayload,
  Role,
  AuditLog,
  BackupItem,
  EstadoHerramientas,
  ImportacionItem,
} from "../types";

// AUTH ENDPOINTS
export const authEndpoints = {
  login: async (credentials: LoginCredentials): Promise<TokenResponse> => {
    const formData = new FormData();
    formData.append("username", credentials.username);
    formData.append("password", credentials.password);

    const response = await api.post<TokenResponse>("/auth/login", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  me: async (): Promise<User> => {
    const response = await api.get<User>("/auth/me");
    return response.data;
  },

  logout: async (): Promise<void> => {
    await api.post("/auth/logout");
  },
};

// SOLICITUDES ENDPOINTS
export const solicitudesEndpoints = {
  crear: async (data: SolicitudCreate): Promise<Solicitud> => {
    const response = await api.post<Solicitud>("/solicitudes", data);
    return response.data;
  },

  obtener: async (id: number): Promise<Solicitud> => {
    const response = await api.get<Solicitud>(`/consultas/${id}`);
    return response.data;
  },

  editar: async (
    id: number,
    data: Partial<SolicitudCreate>
  ): Promise<Solicitud> => {
    const response = await api.patch<Solicitud>(`/solicitudes/${id}`, data);
    return response.data;
  },

  crearResolucion: async (
    id: number,
    data: Resolucion
  ): Promise<Solicitud> => {
    const response = await api.post<Solicitud>(
      `/solicitudes/${id}/resolucion`,
      data
    );
    return response.data;
  },

  editarResolucion: async (
    id: number,
    data: Resolucion
  ): Promise<Solicitud> => {
    const response = await api.patch<Solicitud>(
      `/solicitudes/${id}/resolucion`,
      data
    );
    return response.data;
  },

  crearReconsideracion: async (
    id: number,
    data: Reconsideracion
  ): Promise<Solicitud> => {
    const response = await api.post<Solicitud>(
      `/solicitudes/${id}/reconsideracion`,
      data
    );
    return response.data;
  },

  crearApelacion: async (id: number, data: Apelacion): Promise<Solicitud> => {
    const response = await api.post<Solicitud>(
      `/solicitudes/${id}/apelacion`,
      data
    );
    return response.data;
  },
};

// CONSULTAS ENDPOINTS
export interface ConsultaParams {
  nit?: string;
  exp_sgd?: string;
  dni_ce?: string;
  asegurado_titular?: string;
  /** Búsqueda libre: coincide con cualquiera de los cuatro campos. */
  q?: string;
  page?: number;
  page_size?: number;
  orden_campo?: string;
  orden_dir?: "asc" | "desc";
}

export interface ConsultaOpciones {
  /** Cancela la petición en vuelo cuando el usuario sigue escribiendo. */
  signal?: AbortSignal;
  /**
   * Vigencia en caché de esta respuesta. El buscador usa una ventana corta:
   * así, al borrar caracteres y volver a escribir lo mismo, el resultado sale
   * al instante sin volver a preguntarle al servidor.
   */
  cacheTTL?: number;
  /** Fuerza la consulta al servidor aunque haya una copia en caché. */
  skipCache?: boolean;
}

export const consultasEndpoints = {
  buscar: async (
    params: ConsultaParams,
    opciones: ConsultaOpciones = {}
  ): Promise<PaginatedResponse<SolicitudResumen>> => {
    const response = await api.get<PaginatedResponse<SolicitudResumen>>(
      "/consultas",
      {
        params,
        signal: opciones.signal,
        cacheTTL: opciones.cacheTTL,
        skipCache: opciones.skipCache,
      }
    );
    return response.data;
  },
};

// CATÁLOGOS ENDPOINTS
export const catalogosEndpoints = {
  obtener: async (): Promise<Catalogos> => {
    const response = await api.get<Catalogos>("/catalogos");
    return response.data;
  },
};

// REPORTES ENDPOINTS
export const reportesEndpoints = {
  resumen: async (): Promise<ResumenDashboard> => {
    const response = await api.get<ResumenDashboard>("/reportes/resumen");
    return response.data;
  },
};

// USUARIOS ENDPOINTS
export interface UsuariosParams {
  page?: number;
  page_size?: number;
  search?: string;
}

export const usuariosEndpoints = {
  listar: async (
    params: UsuariosParams
  ): Promise<PaginatedResponse<UserItem>> => {
    const response = await api.get<PaginatedResponse<UserItem>>("/users", {
      params,
    });
    return response.data;
  },

  crear: async (data: UserCreatePayload): Promise<UserItem> => {
    const response = await api.post<UserItem>("/users", data);
    return response.data;
  },

  editar: async (
    id: number,
    data: UserUpdatePayload
  ): Promise<UserItem> => {
    const response = await api.patch<UserItem>(`/users/${id}`, data);
    return response.data;
  },

  asignarRol: async (id: number, roleId: number): Promise<UserItem> => {
    const response = await api.post<UserItem>(`/users/${id}/roles`, {
      role_id: roleId,
    });
    return response.data;
  },

  removerRol: async (id: number, roleId: number): Promise<UserItem> => {
    const response = await api.delete<UserItem>(`/users/${id}/roles/${roleId}`);
    return response.data;
  },

  bloquear: async (id: number): Promise<UserItem> => {
    const response = await api.post<UserItem>(`/users/${id}/bloquear`);
    return response.data;
  },

  desbloquear: async (id: number): Promise<UserItem> => {
    const response = await api.post<UserItem>(`/users/${id}/desbloquear`);
    return response.data;
  },

  eliminar: async (id: number): Promise<UserItem> => {
    const response = await api.delete<UserItem>(`/users/${id}`);
    return response.data;
  },
};

export const rolesEndpoints = {
  listar: async (): Promise<Role[]> => {
    const response = await api.get<Role[]>("/roles");
    return response.data;
  },
};

// AUDITORÍA ENDPOINTS
export interface AuditoriaParams {
  usuario?: string;
  accion?: string;
  entidad?: string;
  desde?: string;
  hasta?: string;
  page?: number;
  page_size?: number;
}

export const auditoriaEndpoints = {
  listar: async (
    params: AuditoriaParams
  ): Promise<PaginatedResponse<AuditLog>> => {
    const response = await api.get<PaginatedResponse<AuditLog>>("/auditoria", {
      params,
    });
    return response.data;
  },
};

// RESPALDOS ENDPOINTS
export interface BackupsParams {
  tipo?: string;
  estado?: string;
  page?: number;
  page_size?: number;
}

export const backupsEndpoints = {
  listar: async (
    params: BackupsParams
  ): Promise<PaginatedResponse<BackupItem>> => {
    const response = await api.get<PaginatedResponse<BackupItem>>("/backups", {
      params,
    });
    return response.data;
  },

  estadoHerramientas: async (): Promise<EstadoHerramientas> => {
    const response = await api.get<EstadoHerramientas>(
      "/backups/estado-herramientas"
    );
    return response.data;
  },

  crear: async (): Promise<BackupItem> => {
    const response = await api.post<BackupItem>("/backups");
    return response.data;
  },

  restaurar: async (id: number): Promise<BackupItem> => {
    const response = await api.post<BackupItem>(`/backups/${id}/restaurar`);
    return response.data;
  },

  eliminar: async (id: number): Promise<BackupItem> => {
    const response = await api.delete<BackupItem>(`/backups/${id}`);
    return response.data;
  },
};

// IMPORTACIONES ENDPOINTS
export const importacionesEndpoints = {
  listar: async (
    page = 1,
    pageSize = 20
  ): Promise<PaginatedResponse<ImportacionItem>> => {
    const response = await api.get<PaginatedResponse<ImportacionItem>>(
      "/importaciones",
      { params: { page, page_size: pageSize } }
    );
    return response.data;
  },

  subir: async (archivo: File): Promise<ImportacionItem> => {
    const formData = new FormData();
    formData.append("archivo", archivo);
    const response = await api.post<ImportacionItem>("/importaciones", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  confirmar: async (id: number): Promise<ImportacionItem> => {
    const response = await api.post<ImportacionItem>(
      `/importaciones/${id}/confirmar`
    );
    return response.data;
  },

  cancelar: async (id: number): Promise<ImportacionItem> => {
    const response = await api.post<ImportacionItem>(
      `/importaciones/${id}/cancelar`
    );
    return response.data;
  },
};