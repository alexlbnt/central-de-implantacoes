"use client";

import React, { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import {
  Menu,
  ChevronDown,
  LogOut,
  User as UserIcon,
  Building,
  Sparkles,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

interface HeaderProps {
  onMenuToggle: () => void;
  projects?: Array<{ id: string; name: string; isDemo: boolean }>;
  currentProjectId?: string;
}

export function Header({
  onMenuToggle,
  projects = [],
  currentProjectId,
}: HeaderProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);

  const selectedProject =
    projects.find((p) => p.id === currentProjectId) || projects[0];

  const handleSelectProject = (projectId: string) => {
    // Redireciona mantendo query param de projeto
    const url = new URL(window.location.href);
    url.searchParams.set("projectId", projectId);
    router.push(url.pathname + url.search);
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 shadow-sm">
      {/* Botão de Menu Mobile e Seletor de Projeto */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none"
          aria-label="Abrir menu lateral"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Seletor de Projeto Ativo */}
        <div className="flex items-center gap-2">
          <Building className="w-4 h-4 text-slate-400 hidden sm:block" />
          <div className="relative">
            <select
              value={selectedProject?.id || ""}
              onChange={(e) => handleSelectProject(e.target.value)}
              className="appearance-none bg-slate-50 border border-slate-300 rounded-lg py-1.5 pl-3 pr-8 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-centi-600 cursor-pointer shadow-xs max-w-[200px] sm:max-w-[280px] truncate"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.isDemo ? `[DEMO] ${p.name}` : p.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {selectedProject?.isDemo && (
            <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
              <Sparkles className="w-3 h-3 text-amber-700" />
              DEMO
            </span>
          )}
        </div>
      </div>

      {/* Perfil e Ações do Usuário */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors text-left"
            aria-expanded={profileOpen}
            aria-haspopup="true"
          >
            <div className="w-8 h-8 rounded-full bg-centi-900 text-white flex items-center justify-center font-bold text-xs">
              {session?.user?.name ? session.user.name[0].toUpperCase() : "U"}
            </div>
            <div className="hidden sm:block text-xs leading-tight">
              <div className="font-semibold text-slate-800 truncate max-w-[150px]">
                {session?.user?.name || "Usuário Centi"}
              </div>
              <div className="text-[10px] text-slate-500 truncate max-w-[150px]">
                {(session?.user as { role?: string })?.role || "Líder"}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 text-xs text-slate-700">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="font-semibold text-slate-900">{session?.user?.name}</p>
                <p className="text-slate-500 text-[11px] truncate">{session?.user?.email}</p>
              </div>

              <div className="py-1">
                <a
                  href="/configuracoes"
                  className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50"
                  onClick={() => setProfileOpen(false)}
                >
                  <UserIcon className="w-4 h-4 text-slate-400" />
                  Minha Conta e Permissões
                </a>
              </div>

              <div className="pt-1 border-t border-slate-100">
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="w-full flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 text-left font-medium"
                >
                  <LogOut className="w-4 h-4 text-red-600" />
                  Encerrar Sessão
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
