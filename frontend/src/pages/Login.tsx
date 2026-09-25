import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  LogIn,
  User,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../services/api";
import type { LoginCredentials } from "../types";
import "./Login.css";

const loginSchema = z.object({
  username: z
    .string()
    .min(1, "El usuario es obligatorio")
    .max(50, "El usuario no puede exceder 50 caracteres"),
  password: z
    .string()
    .min(1, "La contraseña es obligatoria")
    .max(128, "La contraseña es demasiado larga"),
});

type LoginForm = z.infer<typeof loginSchema>;

interface LocationState {
  from?: { pathname?: string };
}

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);

  const from =
    (location.state as LocationState | null)?.from?.pathname || "/dashboard";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
    mode: "onSubmit",
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      setLoading(true);
      setError("");
      await login(data as LoginCredentials);
      navigate(from, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setCapsLockOn(e.getModifierState("CapsLock"));
  };

  return (
    <div className="login-page">
      {/* Panel izquierdo: marca */}
      <div className="login-brand">
        <div className="login-brand-content">
          <div className="login-brand-logo">
            <img src="/essalud-logo.png" alt="EsSalud" />

          </div>

        </div>
      </div>

      {/* Panel derecho: formulario */}
      <div className="login-form-panel">
        <div className="login-form-wrap">
          <div className="login-form-mobile-logo">
            <img src="/essalud-logo.png" alt="EsSalud" />
          </div>

          <div className="login-form-header text-center">
            <h2>Bienvenido</h2>
            <p>Ingrese sus credenciales para acceder al sistema</p>
          </div>

          {error && (
            <div className="login-error" role="alert">
              <span className="login-error-icon">!</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="login-field">
              <label htmlFor="username">Usuario</label>
              <div className="login-input-wrap">
                <span className="login-input-icon">
                  <User size={20} />
                </span>
                <input
                  id="username"
                  type="text"
                  placeholder="Ingrese su usuario"
                  autoComplete="username"
                  className={errors.username ? "login-input-error" : ""}
                  {...register("username")}
                />
              </div>
              {errors.username && (
                <span className="login-field-error">
                  {errors.username.message}
                </span>
              )}
            </div>

            <div className="login-field">
              <label htmlFor="password">Contraseña</label>
              <div className="login-input-wrap">
                <span className="login-input-icon">
                  <Lock size={20} />
                </span>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Ingrese su contraseña"
                  autoComplete="current-password"
                  className={errors.password ? "login-input-error" : ""}
                  onKeyUp={handleKeyUp}
                  {...register("password")}
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {capsLockOn && (
                <span className="login-caps-warning">
                  ⚠️ La tecla Bloq Mayús está activada
                </span>
              )}
              {errors.password && (
                <span className="login-field-error">
                  {errors.password.message}
                </span>
              )}
            </div>

            <button
              type="submit"
              className="login-submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="login-spinner"></span>
                  Verificando...
                </>
              ) : (
                <>
                  <LogIn size={20} />
                  Iniciar Sesión
                </>
              )}
            </button>
          </form>

          <div className="login-form-security">
            <ShieldCheck size={16} />
            <span>Acceso protegido · Sus credenciales son confidenciales</span>
          </div>
        </div>

        <div className="login-form-footer">
          <p>© {new Date().getFullYear()} EsSalud · Todos los derechos reservados</p>
        </div>
      </div>
    </div>
  );
};