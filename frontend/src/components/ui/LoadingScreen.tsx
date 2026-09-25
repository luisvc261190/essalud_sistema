import React from "react";
import "./LoadingScreen.css";

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = "Cargando...",
}) => {
  return (
    <div className="loading-screen">
      <div className="loading-screen-spinner"></div>
      <p>{message}</p>
    </div>
  );
};