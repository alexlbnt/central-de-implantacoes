"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  FileText,
  CheckSquare,
  AlertTriangle,
  Building2,
  GraduationCap,
  GitPullRequest,
  BookOpen,
  FileSpreadsheet,
  FolderArchive,
  ArrowRightLeft,
  ExternalLink,
} from "lucide-react";

export type ModuleCategory = "rotina" | "pendencias" | "setores" | "governanca";

interface TabConfig {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const MODULE_TABS: Record<ModuleCategory, TabConfig[]> = {
  rotina: [
    { label: "Planner Semanal", href: "/agenda", icon: Calendar },
    { label: "Diário de Campo", href: "/diario", icon: FileText },
  ],
  pendencias: [
    { label: "Pendências & Ações", href: "/pendencias", icon: CheckSquare },
    { label: "Matriz de Riscos", href: "/riscos", icon: AlertTriangle },
  ],
  setores: [
    { label: "Departamentos & Instâncias", href: "/departamentos", icon: Building2 },
    { label: "Treinamentos & Autonomia", href: "/treinamentos", icon: GraduationCap },
    { label: "Processos & Entregas (DAG)", href: "/processos", icon: GitPullRequest },
    { label: "Regras do Município (Wiki)", href: "/wiki", icon: BookOpen },
  ],
  governanca: [
    { label: "Atas Semanais NOP", href: "/governanca", icon: FileSpreadsheet },
    { label: "Documentos Custodiados", href: "/documentos", icon: FolderArchive },
    { label: "Transição Bridge", href: "/transicao", icon: ArrowRightLeft },
    { label: "Integração TK059", href: "/conciliacao", icon: ExternalLink },
  ],
};

interface ModuleNavTabsProps {
  module: ModuleCategory;
  className?: string;
}

export function ModuleNavTabs({ module, className = "" }: ModuleNavTabsProps) {
  const pathname = usePathname();
  const tabs = MODULE_TABS[module] || [];

  return (
    <nav
      aria-label="Navegação do Módulo"
      className={`flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 overflow-x-auto no-scrollbar ${className}`}
    >
      {tabs.map((tab) => {
        const isActive =
          pathname === tab.href ||
          (tab.href !== "/" && pathname.startsWith(`${tab.href}/`));
        const Icon = tab.icon;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              isActive
                ? "bg-white text-centi-950 shadow-xs ring-1 ring-centi-400/40 border border-centi-200/80 font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            <Icon
              className={`w-3.5 h-3.5 ${
                isActive ? "text-centi-700" : "text-slate-500"
              }`}
            />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
