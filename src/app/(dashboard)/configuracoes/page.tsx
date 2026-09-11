import React from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/server-session";
import prisma from "@/lib/db/prisma";
import {
  Settings,
  Database,
  HardDrive,
  Shield,
  Calendar,
  UserPlus,
  Users,
  CheckCircle2,
  Clock,
  KeyRound,
  FileCheck,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { storageService } from "@/lib/storage/storage-service";
import { addHolidayAction, createUserAction } from "@/lib/actions/config-actions";

export default async function ConfiguracoesPage({
  searchParams,
}: {
  searchParams?: Promise<{ projectId?: string }>;
}) {
  const currentUser = await getCurrentUser();
  const params = await searchParams;

  let project = null;
  try {
    project = await prisma.project.findFirst({
      where: params?.projectId ? { id: params.projectId } : {},
      include: {
        municipality: true,
        holidays: {
          orderBy: { date: "asc" },
        },
      },
    });
  } catch (err) {
    console.error("Erro ao buscar projeto para configurações:", err);
  }

  let users: any[] = [];
  try {
    users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: { organization: true },
    });
  } catch (err) {
    console.error("Erro ao buscar usuários do sistema:", err);
  }

  const activeDriver = storageService.getActiveDriver();
  const dbUrl = process.env.DATABASE_URL || "";
  const isPostgres = dbUrl.startsWith("postgresql://") || dbUrl.startsWith("postgres://");
  const dbType = isPostgres ? "PostgreSQL 16 (Relacional Produção)" : "SQLite (Local Standalone)";


  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Configurações e Diagnóstico do Sistema
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Diagnóstico de infraestrutura, calendário de feriados de {project?.municipality?.name || "Município"} e governança de usuários
          </p>
        </div>
      </div>

      {/* Cards de Diagnóstico Técnico */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
            <Database className="w-4 h-4 text-centi-800" />
            Banco de Dados
          </div>
          <div className="text-sm font-bold text-slate-900 mt-2">{dbType}</div>
          <p className="text-[10px] text-emerald-600 font-medium mt-1">Conexão Prisma ativa</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
            <HardDrive className="w-4 h-4 text-emerald-700" />
            Repositório de Arquivos
          </div>
          <div className="text-sm font-bold text-slate-900 mt-2">
            {activeDriver === "s3" ? "S3 / MinIO (Privado)" : "Local Storage (data/storage)"}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Validação SHA-256 e MIME Type</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-purple-700" />
            Sessão Ativa
          </div>
          <div className="text-sm font-bold text-slate-900 mt-2 truncate">{currentUser?.name || "Usuário não autenticado"}</div>
          <p className="text-[10px] text-purple-700 font-semibold mt-1">Perfil: {currentUser?.role || "N/A"}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
            <FileCheck className="w-4 h-4 text-emerald-700" />
            Rotina de Backup
          </div>
          <div className="text-sm font-bold text-slate-900 mt-2">Manifesto SHA-256</div>
          <p className="text-[10px] text-slate-500 mt-1">scripts/backup.ps1 e restore.ps1</p>
        </div>
      </div>

      {/* Grid: Calendário de Feriados & Gestão de Usuários */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendário Municipal e Feriados */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-centi-800" />
              Calendário de Feriados ({project?.municipality?.name || "Município"})
            </h2>
            <span className="text-xs text-slate-500">{project?.holidays?.length || 0} feriado(s)</span>
          </div>

          <p className="text-xs text-slate-600">
            Os dias cadastrados aqui são considerados não úteis no cálculo de prazos fatais e alertas de resistência municipal.
          </p>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {!project?.holidays || project.holidays.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">
                {project ? "Nenhum feriado específico cadastrado." : "Nenhum projeto ativo selecionado."}
              </p>
            ) : (
              project.holidays.map((h: any) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between p-2 rounded-lg border border-slate-100 bg-slate-50 text-xs"
                >
                  <span className="font-semibold text-slate-900">{h.description}</span>
                  <span className="text-slate-600 font-mono">
                    {h.date ? new Date(h.date).toLocaleDateString("pt-BR") : "Data não informada"}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Form para Adicionar Feriado */}
          {project ? (
            <form action={addHolidayAction} className="pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <input type="hidden" name="projectId" value={project.id} />
              <div>
                <input
                  type="date"
                  name="date"
                  required
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div className="sm:col-span-2 flex gap-2">
                <input
                  type="text"
                  name="description"
                  required
                  placeholder="Descrição (ex: Aniversário da Cidade)"
                  className="flex-1 p-2 border border-slate-300 rounded-lg text-xs"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-centi-800 hover:bg-centi-900 text-white rounded-lg font-bold text-xs"
                >
                  Adicionar
                </button>
              </div>
            </form>
          ) : (
            <div className="pt-3 border-t border-slate-200 text-xs text-slate-500 italic">
              Selecione um projeto para cadastrar feriados municipais.
            </div>
          )}
        </div>

        {/* Gestão de Usuários */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-centi-800" />
              Usuários e Perfis de Acesso
            </h2>
            <span className="text-xs text-slate-500">{users.length} usuário(s)</span>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-white hover:bg-slate-50 text-xs"
              >
                <div>
                  <div className="font-bold text-slate-900">{u.name}</div>
                  <div className="text-[11px] text-slate-500">{u.email}</div>
                </div>
                <StatusBadge status={u.role} />
              </div>
            ))}
          </div>

          {/* Form para Criar Novo Usuário (Restrito a Admin) */}
          {currentUser?.role === "ADMIN_GERAL" && (
            <form action={createUserAction} className="pt-3 border-t border-slate-200 space-y-2 text-xs">
              <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5 text-centi-800" />
                Criar Novo Usuário
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="Nome completo"
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="E-mail de acesso"
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="password"
                  name="password"
                  required
                  placeholder="Senha provisória"
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
                <select name="role" className="w-full p-2 border border-slate-300 rounded-lg text-xs">
                  <option value="ANALISTA">Analista</option>
                  <option value="LIDER_PROJETO">Líder de Projeto</option>
                  <option value="BA">Business Analyst</option>
                  <option value="QA">QA / Homologador</option>
                  <option value="CRM_BRIDGE">CRM Bridge</option>
                  <option value="DC">Diretor de Contas (DC)</option>
                  <option value="ADMIN_GERAL">Administrador Geral</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-centi-800 hover:bg-centi-900 text-white rounded-lg font-bold text-xs shadow-xs"
              >
                Cadastrar Usuário
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
