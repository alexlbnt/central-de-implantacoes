"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { BannerDemo } from "../ui/BannerDemo";

interface AppLayoutProps {
  children: React.ReactNode;
  projects?: Array<{ id: string; name: string; isDemo: boolean }>;
  currentProjectId?: string;
  isDemoProject?: boolean;
  projectName?: string;
}

export function AppLayout({
  children,
  projects = [],
  currentProjectId,
  isDemoProject = false,
  projectName,
}: AppLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Carrega a preferência de retrair a aba salva pelo usuário
  useEffect(() => {
    try {
      const saved = localStorage.getItem("centi_sidebar_collapsed");
      if (saved !== null) {
        setIsCollapsed(saved === "true");
      }
    } catch {
      // Ignora erro em ambientes restritos
    }
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("centi_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  // Atalho de teclado Ctrl+B para alternar menu lateral
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleCollapse();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Banner de Demonstração quando aplicável */}
      {isDemoProject && <BannerDemo projectName={projectName} />}

      <div className="flex flex-1">
        {/* Sidebar retrátil para desktop e drawer para mobile */}
        <Sidebar
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          isCollapsed={isCollapsed}
          onToggleCollapse={toggleCollapse}
        />

        {/* Conteúdo Principal à Direita da Sidebar com transição suave de largura */}
        <div
          className={`flex-1 flex flex-col transition-all duration-300 ease-in-out min-w-0 ${
            isCollapsed ? "lg:pl-16" : "lg:pl-64"
          }`}
        >
          <Header
            onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
            onToggleCollapse={toggleCollapse}
            isCollapsed={isCollapsed}
            projects={projects}
            currentProjectId={currentProjectId}
          />

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
