import React, { useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import "./Layout.css";

const MOBILE_BREAKPOINT = 768;

export const Layout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const contentRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, left: 0 });
    window.scrollTo({ top: 0, left: 0 });
  }, [pathname]);

  useEffect(() => {
    let wasMobile = window.innerWidth <= MOBILE_BREAKPOINT;

    const handleResize = () => {
      const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
      if (isMobile === wasMobile) return;

      wasMobile = isMobile;
      setSidebarCollapsed(false);
      setMobileSidebarOpen(false);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!mobileSidebarOpen) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileSidebarOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileSidebarOpen]);

  const toggleSidebar = () => {
    if (window.innerWidth <= MOBILE_BREAKPOINT) {
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
          aria-hidden="true"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}
      
      <div className={`layout-main ${sidebarCollapsed ? "layout-main-expanded" : ""}`}>
        <Header
          sidebarOpen={mobileSidebarOpen}
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