import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import "./Layout.css";

export const Layout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    if (window.innerWidth <= 768) {
      setMobileSidebarOpen(!mobileSidebarOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  return (
    <div className="layout">
      <Sidebar 
        collapsed={sidebarCollapsed} 
        open={mobileSidebarOpen}
        onToggle={toggleSidebar}
      />
      
      {/* Overlay para mobile */}
      {mobileSidebarOpen && (
        <div 
          className="layout-overlay"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}
      
      <div className={`layout-main ${sidebarCollapsed ? "layout-main-expanded" : ""}`}>
        <Header
          onToggleSidebar={toggleSidebar}
        />
        
        <main className="layout-content">
          <div className="layout-container">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};