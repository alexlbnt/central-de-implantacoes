"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderGit2,
  Building2,
  GitPullRequest,
  CheckSquare,
  AlertTriangle,
  Calendar,
  GraduationCap,
  Users,
  BookOpen,
  FileText,
  FileSpreadsheet,
  FolderArchive,
  ArrowRightLeft,
  ExternalLink,
  Settings,
  Shield,
  X,
} from "lucide-react";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const NAVIGATION_ITEMS = [
  { label: "Visão geral", href: "/", icon: LayoutDashboard },
  { label: "Projetos", href: "/projetos", icon: FolderGit2 },
  { label: "Departamentos", href: "/departamentos", icon: Building2 },
  { label: "Processos e entregas", href: "/processos", icon: GitPullRequest },
  { label: "Pendências", href: "/pendencias", icon: CheckSquare },
  { label: "Riscos", href: "/riscos", icon: AlertTriangle },
  { label: "Agenda", href: "/agenda", icon: Calendar },
  { label: "Treinamentos e autonomia", href: "/treinamentos", icon: GraduationCap },
  { label: "Equipe", href: "/equipe", icon: Users },
  { label: "Regras do município", href: "/wiki", icon: BookOpen },
  { label: "Diário de campo", href: "/diario", icon: FileText },
  { label: "Governança e atas", href: "/governanca", icon: FileSpreadsheet },
  { label: "Documentos", href: "/documentos", icon: FolderArchive },
  { label: "Transição", href: "/transicao", icon: ArrowRightLeft },
  { label: "Registros oficiais", href: "/conciliacao", icon: ExternalLink },
  { label: "Configurações", href: "/configuracoes", icon: Settings },
];

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Backdrop para mobile */}
      {isOpen && onClose && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 lg:hidden backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-centi-950 text-slate-100 flex flex-col border-r border-slate-800 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header da Sidebar */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80 bg-centi-900/50">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-centi-600 flex items-center justify-center text-white font-bold shadow-sm">
              <Shield className="w-5 h-5 text-blue-100" />
            </div>
            <div>
              <div className="font-bold text-sm leading-none text-white">Central Centi</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Gestão de Implantações</div>
            </div>
          </Link>

          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              aria-label="Fechar menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Links de Navegação */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAVIGATION_ITEMS.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-centi-600 text-white shadow-sm font-semibold"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Rodapé da Sidebar */}
        <div className="p-3 border-t border-slate-800/80 bg-centi-950/80 text-[11px] text-slate-400">
          <div className="flex items-center justify-between">
            <span>NOP 001/2026 v12.5</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Online
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
