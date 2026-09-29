"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
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
  matchPrefixes?: string[];
  sublabel?: string;
}

const PRIMARY_ITEMS: NavItem[] = [
  {
    label: "Painel Geral",
    href: "/",
    icon: LayoutDashboard,
    sublabel: "Saúde & Foco de Hoje",
  },
  {
    label: "Rotina & Campo",
    href: "/agenda",
    icon: Calendar,
    matchPrefixes: ["/agenda", "/diario"],
    sublabel: "Agenda & Diário",
  },
  {
    label: "Ações & Pendências",
    href: "/pendencias",
    icon: CheckSquare,
    matchPrefixes: ["/pendencias", "/riscos"],
    sublabel: "Kanban & Bloqueios",
  },
  {
    label: "Setores & Autonomia",
    href: "/departamentos",
    icon: Building2,
    matchPrefixes: ["/departamentos", "/processos", "/treinamentos", "/wiki"],
    sublabel: "Departamentos & NOP",
  },
  {
    label: "Governança & Docs",
    href: "/governanca",
    icon: FileSpreadsheet,
    matchPrefixes: ["/governanca", "/documentos", "/transicao", "/conciliacao"],
    sublabel: "Atas & Documentos",
  },
];

const UTILITY_ITEMS: NavItem[] = [
  { label: "Equipe & Contatos", href: "/equipe", icon: Users },
  { label: "Meus Projetos", href: "/projetos", icon: FolderGit2 },
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
        : item.matchPrefixes
        ? item.matchPrefixes.some(
            (p) => pathname === p || pathname.startsWith(`${p}/`)
          )
        : pathname === item.href || pathname.startsWith(`${item.href}/`);
    const Icon = item.icon;

    return (
      <div key={item.href} className="relative group">
        <Link
          href={item.href}
          onClick={onClose}
          className={`flex items-center transition-all group/link ${
            isCollapsed
              ? "justify-between px-3.5 py-2.5 lg:justify-center lg:w-10 lg:h-10 lg:p-0 mx-auto"
              : "justify-between px-3.5 py-2.5 lg:py-2"
          } rounded-xl text-xs font-semibold ${
            isActive
              ? "bg-white text-slate-900 shadow-sm font-bold ring-1 ring-black/5"
              : "text-slate-900 hover:text-slate-950 hover:bg-white/20 active:bg-white/30"
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Icon
              className={`w-4 h-4 flex-shrink-0 ${
                isActive ? "text-slate-900" : "text-slate-800 group-hover/link:text-slate-950"
              }`}
            />
            <span
              className={`truncate text-xs ${
                isCollapsed ? "inline-block lg:hidden" : "inline-block"
              }`}
            >
              {item.label}
            </span>
          </div>

          {item.sublabel && !isActive && (
            <span
              className={`text-[10px] text-slate-800/80 font-normal truncate pl-1 ${
                isCollapsed ? "inline-block lg:hidden" : "hidden xl:inline-block"
              }`}
            >
              {item.sublabel}
            </span>
          )}
        </Link>

        {/* Tooltip flutuante exclusivo para Desktop quando retraído */}
        {isCollapsed && (
          <div className="hidden lg:group-hover:flex absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-white text-slate-950 text-xs font-semibold rounded-lg shadow-2xl border border-slate-200 whitespace-nowrap z-50 pointer-events-none items-center gap-2 animate-in fade-in zoom-in-95 duration-150">
            {groupTitle && (
              <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">
                {groupTitle} ›
              </span>
            )}
            <span>{item.label}</span>
            {isActive && (
              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-900 border border-slate-200">
                Ativo
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  // Fecha o menu mobile ao navegar ou pressionar Esc
  React.useEffect(() => {
    if (isOpen && onClose) {
      onClose();
    }
  }, [pathname, isOpen, onClose]);

  React.useEffect(() => {
    if (!isOpen || !onClose) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop para mobile com desfoque */}
      {isOpen && onClose && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 lg:hidden backdrop-blur-xs animate-in fade-in duration-200"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 bg-[#A2BB40] text-slate-950 flex flex-col border-r border-[#8fa735] shadow-2xl lg:shadow-none transition-all duration-300 ease-in-out w-72 max-w-[85vw] ${
          isCollapsed ? "lg:w-16" : "lg:w-64"
        } ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Header da Sidebar: Completo no mobile, retrátil no desktop */}
        <div className="h-16 flex items-center border-b border-[#8fa735] bg-[#95ad38] px-3.5">
          {/* Header Completo: Sempre visível no mobile, e no desktop quando NÃO colapsado */}
          <div className={`flex items-center justify-between w-full ${isCollapsed ? "flex lg:hidden" : "flex"}`}>
            <Link href="/" onClick={onClose} className="flex items-center gap-2.5 min-w-0 group">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm ring-1 ring-black/5 flex-shrink-0 hover:bg-slate-50 transition-colors p-1.5">
                <Image
                  src="/centi-logo.png"
                  alt="Logo Centi"
                  width={20}
                  height={20}
                  className="w-5 h-5 object-contain"
                />
              </div>
              <div className="truncate">
                <div className="font-bold text-sm leading-none text-slate-950 truncate">Central Centi</div>
                <div className="text-[10px] text-slate-800 mt-1 truncate font-medium">Gestão de Implantações</div>
              </div>
            </Link>

            <div className="flex items-center gap-1">
              {/* Botão recolher no desktop */}
              {onToggleCollapse && (
                <button
                  onClick={onToggleCollapse}
                  className="hidden lg:flex p-1.5 rounded-lg text-slate-800 hover:text-slate-950 hover:bg-white/20 transition-colors"
                  title="Recolher menu lateral (Ctrl+B)"
                  aria-label="Recolher menu lateral"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}

              {/* Botão Fechar no Mobile (Grande, visível e com alto contraste) */}
              {onClose && (
                <button
                  onClick={onClose}
                  className="lg:hidden p-2 rounded-lg text-slate-950 hover:bg-white/20 active:bg-white/30 transition-colors"
                  aria-label="Fechar menu lateral"
                  title="Fechar menu lateral"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Botão Compacto: Exclusivo do Desktop quando colapsado */}
          {isCollapsed && (
            <div className="hidden lg:flex items-center justify-center w-full">
              <button
                onClick={onToggleCollapse}
                className="w-10 h-10 rounded-lg bg-white hover:bg-slate-50 text-slate-900 flex items-center justify-center shadow-sm transition-all group relative ring-1 ring-black/5 p-2"
                title="Expandir menu lateral (Ctrl+B)"
                aria-label="Expandir menu lateral"
              >
                <Image
                  src="/centi-logo.png"
                  alt="Logo Centi"
                  width={20}
                  height={20}
                  className="w-5 h-5 object-contain group-hover:hidden transition-transform"
                />
                <ChevronRight className="w-5 h-5 text-slate-900 hidden group-hover:block transition-transform animate-in fade-in" />

                {/* Tooltip flutuante */}
                <div className="hidden lg:group-hover:flex absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-white text-slate-950 text-xs font-semibold rounded-md shadow-xl border border-slate-200 whitespace-nowrap z-50 pointer-events-none items-center gap-1.5">
                  <span>Expandir menu lateral</span>
                  <kbd className="px-1 py-0.5 rounded bg-slate-100 text-[10px] text-slate-700 font-mono border border-slate-300">Ctrl+B</kbd>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Links de Navegação Agrupados com rolagem suave */}
        <div
          className={`flex-1 overflow-y-auto no-scrollbar p-3 space-y-4`}
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {/* 5 Pilares Fundamentais de Operação Diária */}
          <div className="space-y-1">
            <div className={`px-2 pt-1 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-950 select-none ${isCollapsed ? "block lg:hidden" : "block"}`}>
              Operação Principal
            </div>
            <div className="space-y-1">
              {PRIMARY_ITEMS.map((item) => renderLink(item, "Operação"))}
            </div>
          </div>

          {/* Divisor para ferramentas de apoio */}
          <div className="pt-2 border-t border-[#8fa735]">
            <div className={`px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-900 select-none ${isCollapsed ? "block lg:hidden" : "block"}`}>
              Apoio & Sistema
            </div>
            <div className="space-y-1">
              {UTILITY_ITEMS.map((item) => renderLink(item, "Apoio"))}
            </div>
          </div>
        </div>

        {/* Rodapé da Sidebar */}
        <div className="border-t border-[#8fa735] bg-[#95ad38]">
          {/* Rodapé Completo: Sempre visível no mobile, e no desktop quando NÃO colapsado */}
          <div className={`p-3 text-[11px] text-slate-800 ${isCollapsed ? "flex lg:hidden" : "flex"} items-center justify-between`}>
            <span className="font-medium">NOP 001/2026 v12.5</span>
            <span className="text-slate-950 flex items-center gap-1 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs" />
              Online
            </span>
          </div>

          {/* Rodapé Compacto: Exclusivo para Desktop quando colapsado */}
          {isCollapsed && (
            <div className="hidden lg:flex p-3 items-center justify-center relative group">
              <div className="w-3 h-3 rounded-full bg-white/40 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]" />
              </div>
              <div className="hidden lg:group-hover:flex absolute left-full bottom-2 ml-3 px-3 py-1.5 bg-white text-slate-950 text-[11px] font-medium rounded-lg shadow-2xl border border-slate-200 whitespace-nowrap z-50 pointer-events-none flex-col">
                <span className="text-slate-950 font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#A2BB40]" />
                  Online
                </span>
                <span className="text-slate-600 text-[10px] mt-0.5">NOP 001/2026 v12.5</span>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
