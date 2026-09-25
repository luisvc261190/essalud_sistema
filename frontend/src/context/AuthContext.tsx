import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

import type { User, LoginCredentials } from "../types";
import { authEndpoints } from "../services/endpoints";
import { getErrorMessage } from "../services/api";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  tienePermiso: (permiso: string) => boolean;
  tieneRol: (rol: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * ============================================================
   * REFRESCAR USUARIO
   * ============================================================
   */
  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem("access_token");

    // No existe token
    if (!token) {
      setUser(null);
      return;
    }

    // Primero intentamos recuperar el usuario guardado
    const stored = localStorage.getItem("user");

    if (stored) {
      try {
        const cachedUser = JSON.parse(stored) as User;
        setUser(cachedUser);
      } catch (error) {
        console.error("Error leyendo usuario almacenado:", error);
        localStorage.removeItem("user");
      }
    }

    // Validamos la sesión contra el backend
    try {
      const userData = await authEndpoints.me();

      setUser(userData);

      localStorage.setItem(
        "user",
        JSON.stringify(userData)
      );
    } catch (error) {
      console.error("Sesión inválida:", error);

      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");

      setUser(null);
    }
  }, []);

  /**
   * ============================================================
   * INICIALIZAR AUTENTICACIÓN
   * ============================================================
   */
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem("access_token");

        // No hay sesión
        if (!token) {
          if (mounted) {
            setUser(null);
            setIsLoading(false);
          }

          return;
        }

        // Hay token: validar sesión
        await refreshUser();

        if (mounted) {
          setIsLoading(false);
        }
      } catch (error) {
        console.error(
          "Error inicializando autenticación:",
          error
        );

        if (mounted) {
          setUser(null);
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, [refreshUser]);

  /**
   * ============================================================
   * LOGIN
   * ============================================================
   */
  const login = async (
    credentials: LoginCredentials
  ): Promise<void> => {
    try {
      const response =
        await authEndpoints.login(credentials);

      // Guardar tokens
      localStorage.setItem(
        "access_token",
        response.access_token
      );

      localStorage.setItem(
        "refresh_token",
        response.refresh_token
      );

      // Guardar usuario
      localStorage.setItem(
        "user",
        JSON.stringify(response.user)
      );

      // Actualizar estado inmediatamente
      setUser(response.user);
    } catch (error) {
      console.error("Error en login:", error);

      throw new Error(
        getErrorMessage(error)
      );
    }
  };

  /**
   * ============================================================
   * LOGOUT
   * ============================================================
   */
  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");

    setUser(null);

    authEndpoints
      .logout()
      .catch(() => undefined);
  };

  /**
   * ============================================================
   * PERMISOS
   * ============================================================
   */
  const tienePermiso = (
    permiso: string
  ): boolean => {
    return (
      user?.permissions?.includes(permiso) ?? false
    );
  };

  /**
   * ============================================================
   * ROLES
   * ============================================================
   */
  const tieneRol = (
    rol: string
  ): boolean => {
    return (
      user?.roles?.includes(rol) ?? false
    );
  };

  /**
   * ============================================================
   * PROVIDER
   * ============================================================
   */
  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshUser,
        tienePermiso,
        tieneRol,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/**
 * ============================================================
 * HOOK useAuth
 * ============================================================
 */
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error(
      "useAuth debe ser usado dentro de un AuthProvider"
    );
  }

  return context;
};