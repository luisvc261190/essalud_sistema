import React from "react";
import "./ErrorBoundary.css";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

const SESSION_KEYS = ["access_token", "refresh_token", "user"];

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary capturó un error:", error, info.componentStack);
  }

  private clearSessionAndReload = () => {
    SESSION_KEYS.forEach((key) => localStorage.removeItem(key));
    window.location.reload();
  };

  private reload = () => {
    window.location.reload();
  };

  render() {
    const { error } = this.state;

    if (!error) {
      return this.props.children;
    }

    return (
      <div className="error-boundary">
        <div className="error-boundary-card">
          <h1 className="error-boundary-title">No se pudo cargar la aplicación</h1>
          <p className="error-boundary-text">
            Ocurrió un error inesperado. Recarga la página para intentarlo de nuevo.
            Si el problema continúa, limpia la sesión del sitio.
          </p>
          <pre className="error-boundary-message">{error.message}</pre>
          <div className="error-boundary-actions">
            <button
              type="button"
              className="btn btn-primary btn-md"
              onClick={this.clearSessionAndReload}
            >
              Limpiar sesión y recargar
            </button>
            <button
              type="button"
              className="btn btn-outline btn-md"
              onClick={this.reload}
            >
              Solo recargar
            </button>
          </div>
        </div>
      </div>
    );
  }
}
