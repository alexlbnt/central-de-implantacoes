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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAVIGATION_GROUPS: NavGroup[] = [
  {
    title: "Rotina Diária",
    items: [
      { label: "Visão Geral", href: "/", icon: LayoutDashboard },
      { label: "Planner Semanal", href: "/agenda", icon: Calendar },
      { label: "Diário de Campo", href: "/diario", icon: FileText },
    ],
  },
  {
    title: "Setores & Módulos",
    items: [
      { label: "Departamentos", href: "/departamentos", icon: Building2 },
      { label: "Processos & Entregas", href: "/processos", icon: GitPullRequest },
      { label: "Treinamentos & Autonomia", href: "/treinamentos", icon: GraduationCap },
      { label: "Regras do Município", href: "/wiki", icon: BookOpen },
    ],
  },
  {
    title: "Bloqueios & Ação",
    items: [
      { label: "Pendências & Kanban", href: "/pendencias", icon: CheckSquare },
      { label: "Matriz de Riscos", href: "/riscos", icon: AlertTriangle },
    ],
  },
  {
    title: "Governança & Docs",
    items: [
      { label: "Atas de Reunião", href: "/governanca", icon: FileSpreadsheet },
      { label: "Documentos", href: "/documentos", icon: FolderArchive },
      { label: "Transição Bridge", href: "/transicao", icon: ArrowRightLeft },
      { label: "Registros TK059", href: "/conciliacao", icon: ExternalLink },
    ],
  },
];

const UTILITY_ITEMS: NavItem[] = [
  { label: "Equipe & Contatos", href: "/equipe", icon: Users },
  { label: "Projetos", href: "/projetos", icon: FolderGit2 },
  { label: "Configurações", href: "/configuracoes", icon: Settings },
];

export function Sidebar({
  isOpen = true,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();

  const renderLink = (item: NavItem, groupTitle?: string) => {
    const isActive =
      item.href === "/"
        ? pathname === "/"
        : pathname === item.href || pathname.startsWith(`${item.href}/`);
    const Icon = item.icon;

    if (isCollapsed) {
      return (
        <div key={item.href} className="relative group flex justify-center">
          <Link
            href={item.href}
            onClick={onClose}
            title={item.label}
            className={`flex items-center justify-center w-10 h-10 rounded-lg transition-all ${
              isActive
                ? "bg-centi-600 text-white shadow-md font-semibold ring-1 ring-emerald-400/40"
                : "text-slate-300 hover:text-white hover:bg-slate-800/80"
            }`}
          >
            <Icon
              className={`w-5 h-5 flex-shrink-0 ${
                isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"
              }`}
            />
          </Link>

          {/* Tooltip flutuante com nome e grupo */}
          <div className="hidden lg:group-hover:flex absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg shadow-2xl border border-slate-700 whitespace-nowrap z-50 pointer-events-none items-center gap-2 animate-in fade-in zoom-in-95 duration-150">
            {groupTitle && (
              <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
                {groupTitle} ›
              </span>
            )}
            <span>{item.label}</span>
            {isActive && (
              <span className="px-1.5 py-0.5 rounded bg-centi-600 text-[10px] font-semibold text-white">
                Ativo
              </span>
            )}
          </div>
        </div>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClose}
        className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
          isActive
            ? "bg-centi-600 text-white shadow-xs font-semibold"
            : "text-slate-300 hover:text-white hover:bg-slate-800/60"
        }`}
      >
        <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
        <span className="truncate">{item.label}</span>
      </Link>
    );
  };

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
        className={`fixed top-0 bottom-0 left-0 z-50 bg-centi-950 text-slate-100 flex flex-col border-r border-slate-800 transition-all duration-300 ease-in-out ${
          isCollapsed ? "w-64 lg:w-16" : "w-64"
        } ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Header da Sidebar */}
        {isCollapsed ? (
          <div className="h-16 flex items-center justify-center px-2 border-b border-slate-800/80 bg-centi-900/50">
            <button
              onClick={onToggleCollapse}
              className="w-10 h-10 rounded-lg bg-centi-600 hover:bg-centi-500 text-white flex items-center justify-center shadow-sm transition-all group relative"
              title="Expandir menu lateral (Ctrl+B)"
              aria-label="Expandir menu lateral"
            >
              <Shield className="w-5 h-5 text-emerald-100 group-hover:hidden transition-transform" />
              <ChevronRight className="w-5 h-5 text-white hidden group-hover:block transition-transform animate-in fade-in" />

              {/* Tooltip flutuante ao passar o mouse */}
              <div className="hidden lg:group-hover:flex absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-md shadow-xl border border-slate-700 whitespace-nowrap z-50 pointer-events-none items-center gap-1.5">
                <span>Expandir menu lateral</span>
                <kbd className="px-1 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 font-mono border border-slate-700">Ctrl+B</kbd>
              </div>
            </button>
          </div>
        ) : (
          <div className="h-16 flex items-center justify-between px-3.5 border-b border-slate-800/80 bg-centi-900/50">
            <Link href="/" className="flex items-center gap-2.5 min-w-0 group">
              <div className="w-8 h-8 rounded-lg bg-centi-600 flex items-center justify-center text-white font-bold shadow-sm flex-shrink-0 group-hover:bg-centi-500 transition-colors">
                <Shield className="w-5 h-5 text-emerald-100" />
              </div>
              <div className="truncate">
                <div className="font-bold text-sm leading-none text-white truncate">Central Centi</div>
                <div className="text-[10px] text-slate-400 mt-0.5 truncate">Gestão de Implantações</div>
              </div>
            </Link>

            <div className="flex items-center gap-1">
              {onToggleCollapse && (
                <button
                  onClick={onToggleCollapse}
                  className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Recolher menu lateral (Ctrl+B)"
                  aria-label="Recolher menu lateral"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}

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
          </div>
        )}

        {/* Links de Navegação Agrupados com rolagem suave e sem barra visual */}
        <div
          className={`flex-1 overflow-y-auto no-scrollbar ${isCollapsed ? "px-2" : "px-3"} py-3 space-y-4`}
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {NAVIGATION_GROUPS.map((group, groupIdx) => (
            <div key={group.title} className="space-y-1">
              {!isCollapsed ? (
                <div className="px-2 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400/70 select-none">
                  {group.title}
                </div>
              ) : groupIdx > 0 ? (
                <div className="my-2 border-t border-slate-800/80" />
              ) : null}

              <div className="space-y-1">
                {group.items.map((item) => renderLink(item, group.title))}
              </div>
            </div>
          ))}

          {/* Divisor para ferramentas de apoio */}
          <div className="pt-2 border-t border-slate-800/80">
            {!isCollapsed && (
              <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 select-none">
                Apoio & Sistema
              </div>
            )}
            <div className="space-y-1">
              {UTILITY_ITEMS.map((item) => renderLink(item, "Apoio"))}
            </div>
          </div>
        </div>

        {/* Rodapé da Sidebar */}
        {isCollapsed ? (
          <div className="p-3 border-t border-slate-800/80 bg-centi-950/80 flex items-center justify-center relative group">
            <div className="w-3 h-3 rounded-full bg-emerald-400/20 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            </div>
            <div className="hidden lg:group-hover:flex absolute left-full bottom-2 ml-3 px-3 py-1.5 bg-slate-900 text-white text-[11px] font-medium rounded-lg shadow-2xl border border-slate-700 whitespace-nowrap z-50 pointer-events-none flex-col">
              <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Online
              </span>
              <span className="text-slate-400 text-[10px] mt-0.5">NOP 001/2026 v12.5</span>
            </div>
          </div>
        ) : (
          <div className="p-3 border-t border-slate-800/80 bg-centi-950/80 text-[11px] text-slate-400">
            <div className="flex items-center justify-between">
              <span>NOP 001/2026 v12.5</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Online
              </span>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
