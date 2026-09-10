"use client";

import React, { useState } from "react";
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Banner de Demonstração quando aplicável */}
      {isDemoProject && <BannerDemo projectName={projectName} />}

      <div className="flex flex-1">
        {/* Sidebar fixa para desktop e drawer para mobile */}
        <Sidebar
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />

        {/* Conteúdo Principal à Direita da Sidebar */}
        <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
          <Header
            onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
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
