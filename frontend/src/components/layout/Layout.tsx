import React, { useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import "./Layout.css";

export const Layout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const contentRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, left: 0 });
    window.scrollTo({ top: 0, left: 0 });
  }, [pathname]);

  const toggleSidebar = () => {
    if (window.innerWidth <= 768) {
      setMobileSidebarOpen((isOpen) => !isOpen);
    } else {
      setSidebarCollapsed((isCollapsed) => !isCollapsed);
    }
  };

  const closeMobileSidebar = () => {
    setMobileSidebarOpen(false);
  };

  return (
    <div className="layout">
      <Sidebar 
        collapsed={sidebarCollapsed} 
        open={mobileSidebarOpen}
        onToggle={toggleSidebar}
        onNavigate={closeMobileSidebar}
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
        
        <main ref={contentRef} className="layout-content">
          <div className="layout-container">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};