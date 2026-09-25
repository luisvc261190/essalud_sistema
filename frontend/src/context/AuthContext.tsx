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

  const refreshUser = useCallback(async () => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem("user");
      }
    }
    const token = localStorage.getItem("access_token");
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const userData = await authEndpoints.me();
      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
    } catch {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    const token = localStorage.getItem("access_token");

    if (stored && token) {
      // Hay sesión cacheada: se pinta al instante y se valida en segundo plano.
      setIsLoading(false);
      refreshUser();
      return;
    }
    if (token) {
      // Hay token pero no usuario cacheado: esperar a /me para no mostrar datos falsos.
      refreshUser().then(() => setIsLoading(false));
      return;
    }
    setIsLoading(false);
  }, [refreshUser]);

  const login = async (credentials: LoginCredentials) => {
    try {
      const response = await authEndpoints.login(credentials);

      localStorage.setItem("access_token", response.access_token);
      localStorage.setItem("refresh_token", response.refresh_token);
      localStorage.setItem("user", JSON.stringify(response.user));

      setUser(response.user);
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    setUser(null);
    authEndpoints.logout().catch(() => undefined);
  };

  const tienePermiso = (permiso: string): boolean => {
    return user?.permissions?.includes(permiso) || false;
  };

  const tieneRol = (rol: string): boolean => {
    return user?.roles?.includes(rol) || false;
  };

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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth debe ser usado dentro de un AuthProvider");
  }
  return context;
};