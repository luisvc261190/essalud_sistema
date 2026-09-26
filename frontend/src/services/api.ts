import axios, {
  AxiosError,
  getAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import type { ApiError } from "../types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

interface CacheEntry {
  res: AxiosResponse;
  at: number;
  ttl: number;
}

const DEFAULT_GET_TTL_MS = 30_000;
const CACHE_MAX_ENTRIES = 300;
const _cache = new Map<string, CacheEntry>();

/** Opciones propias de esta capa, admitidas en cualquier peticion. */
export interface CacheOpciones {
  /**
   * Vigencia de la respuesta en cache. `0` desactiva la cache para esa
   * peticion. Por defecto los GET se guardan 30 s.
   */
  cacheTTL?: number;
  /** Ignora la entrada cacheada y vuelve a preguntar al servidor. */
  skipCache?: boolean;
}

// Registra las opciones anteriores en el tipo de configuracion de axios, para
// que se puedan pasar tal cual en `api.get(url, { cacheTTL, skipCache })`.
declare module "axios" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AxiosRequestConfig extends CacheOpciones {}
}

type PeticionCacheable = InternalAxiosRequestConfig & CacheOpciones;

function _hashToken(token: string | null): string {
  if (!token) return "anon";
  let h = 5381;
  for (let i = 0; i < token.length; i++) {
    h = ((h << 5) + h + token.charCodeAt(i)) | 0;
  }
  return String(h >>> 0);
}

function _cacheKey(config: InternalAxiosRequestConfig): string {
  const user = _hashToken(localStorage.getItem("access_token"));
  const params = config.params ? JSON.stringify(config.params) : "";
  return `${config.method || "get"}|${config.baseURL || ""}${config.url || ""}|${params}#${user}`;
}

function _limpiarCache(): void {
  if (_cache.size <= CACHE_MAX_ENTRIES) return;
  const sobran = _cache.size - CACHE_MAX_ENTRIES;
  const keys = Array.from(_cache.keys());
  for (let i = 0; i < sobran; i++) {
    _cache.delete(keys[i]);
  }
}

const defaultAdapter = getAdapter(["xhr", "http", "fetch"]);

async function adapterConCache(
  config: InternalAxiosRequestConfig
): Promise<AxiosResponse> {
  const esGET = (config.method || "get").toLowerCase() === "get";
  const { cacheTTL, skipCache } = config as PeticionCacheable;
  const ttlMs = cacheTTL === undefined ? DEFAULT_GET_TTL_MS : cacheTTL;

  if (esGET && ttlMs > 0) {
    const key = _cacheKey(config);
    const hit = _cache.get(key);
    if (!skipCache && hit && Date.now() - hit.at < hit.ttl) {
      return hit.res;
    }
    const res = await defaultAdapter(config);
    if (res.status >= 200 && res.status < 300) {
      _cache.set(key, { res, at: Date.now(), ttl: ttlMs });
      _limpiarCache();
    }
    return res;
  }

  const res = await defaultAdapter(config);
  if (res.config.method && res.config.method.toLowerCase() !== "get") {
    // Toda mutación invalida la caché de lecturas para no mostrar datos viejos.
    _cache.clear();
  }
  return res;
}

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  adapter: adapterConCache,
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("access_token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const getErrorMessage = (error: unknown): string => {
  if (axios.isCancel(error)) {
    // La peticion se cancelo porque el usuario siguio escribiendo: no es un fallo.
    return "";
  }
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { detail?: unknown } | undefined;
    if (data?.detail) {
      if (typeof data.detail === "string") return data.detail;
      if (Array.isArray(data.detail)) {
        return data.detail
          .map((d) =>
            typeof d === "object" && d !== null && "msg" in d
              ? String((d as { msg: unknown }).msg)
              : String(d)
          )
          .join(", ");
      }
      return JSON.stringify(data.detail);
    }
    return error.message || "Error de conexión con el servidor";
  }
  if (error instanceof Error) return error.message;
  return "Error desconocido";
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/login") &&
      !originalRequest.url?.includes("/auth/refresh")
    ) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refresh_token");
        if (!refreshToken) {
          throw new Error("No refresh token");
        }

        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token: newRefreshToken } = response.data;

        localStorage.setItem("access_token", access_token);
        localStorage.setItem("refresh_token", newRefreshToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
        }

        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user");
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;