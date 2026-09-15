import React from "react";
import Link from "next/link";
import { getCurrentUser, getAuthorizedProjectId } from "@/lib/auth/server-session";
import prisma from "@/lib/db/prisma";
import { createIssueAction } from "@/lib/actions/issue-actions";
import { IssuesViewManager } from "@/components/issues/IssuesViewManager";
import {
  Plus,
  Download,
  Kanban,
  List,
} from "lucide-react";

export default async function PendenciasPage({
  searchParams,
}: {
  searchParams?: Promise<{ projectId?: string; view?: string; filtro?: string }>;
}) {
  const user = await getCurrentUser();
  const params = searchParams ? await searchParams : undefined;
  const authorizedProjectId = await getAuthorizedProjectId(params?.projectId);

  if (!authorizedProjectId) {
    return <div className="p-8 text-center text-slate-600">Nenhum projeto encontrado ou acesso não autorizado.</div>;
  }

  let project = null;
  let issues: any[] = [];

  try {
    project = await prisma.project.findUnique({
      where: { id: authorizedProjectId },
      include: {
        entities: {
          include: {
            departments: true,
          },
        },
        memberships: {
          include: {
            user: {
              select: { id: true, name: true, role: true },
            },
          },
        },
      },
    });

    if (project) {
      issues = await prisma.issue.findMany({
        where: {
          projectId: project.id,
          ...(params?.filtro === "bloqueios"
            ? { isOperationalBlocker: true, status: { notIn: ["CONCLUIDA", "CANCELADA"] } }
            : {}),
          ...(params?.filtro === "vencidas"
            ? { dueDate: { lt: new Date() }, status: { notIn: ["CONCLUIDA", "CANCELADA"] } }
            : {}),
          ...(params?.filtro === "aguardando_municipio"
            ? { waitingCondition: "AGUARDANDO_MUNICIPIO" }
            : {}),
          // Restrição para usuários com perfil LEITOR: não veem notas e pendências estritamente internas Centi
          ...(user?.role === "LEITOR" ? { isInternal: false } : {}),
        },
        include: {
          department: true,
          assignee: true,
          author: true,
        },
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      });
    }
  } catch (err) {
    console.error("Erro ao carregar projeto ou pendências:", err);
    return (
      <div className="p-8 text-center text-slate-600">
        Não foi possível carregar as pendências deste projeto no momento.
      </div>
    );
  }

  if (!project) {
    return <div className="p-8 text-center text-slate-600">Nenhum projeto selecionado.</div>;
  }

  const isKanban = params?.view === "kanban";
  const allDepts = project.entities?.flatMap((e) => e.departments) || [];

  const departments = allDepts.map((d) => ({
    id: d.id,
    name: d.name,
  }));

  const teamMembers =
    project.memberships?.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      role: m.user.role,
    })) || [];

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Pendências e Ações de Campo
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Projeto: <strong>{project.name}</strong>  |  Gestão unificada em Lista e Kanban com edição completa.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Alternador Lista / Kanban */}
          <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-slate-100 text-xs">
            <Link
              href={`/pendencias?projectId=${project.id}&view=lista`}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium ${
                !isKanban ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Lista</span>
            </Link>
            <Link
              href={`/pendencias?projectId=${project.id}&view=kanban`}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium ${
                isKanban ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </Link>
          </div>

          {/* Exportar CSV */}
          <a
            href={`/api/exports/csv/issues?projectId=${project.id}`}
            download
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Exportar CSV</span>
          </a>
        </div>
      </div>

      {/* Formulário Rápido de Nova Pendência */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Plus className="w-4 h-4 text-centi-800" />
          Registrar Nova Pendência / Ação
        </h2>

        <form action={createIssueAction} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
          <input type="hidden" name="projectId" value={project.id} />

          <div className="lg:col-span-2">
            <label className="block font-medium text-slate-700 mb-1">Título da Pendência</label>
            <input
              type="text"
              name="title"
              required
              placeholder="Ex: Divergência na tabela salarial"
              className="w-full p-2 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Departamento</label>
            <select name="departmentId" className="w-full p-2 border border-slate-300 rounded-lg text-xs">
              <option value="">Geral do Projeto</option>
              {allDepts.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Prioridade</label>
            <select name="priority" defaultValue="MEDIA" className="w-full p-2 border border-slate-300 rounded-lg text-xs">
              <option value="BAIXA">Baixa</option>
              <option value="MEDIA">Média</option>
              <option value="ALTA">Alta</option>
              <option value="CRITICA">Crítica</option>
            </select>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Prazo Fatal</label>
            <input
              type="date"
              name="dueDate"
              className="w-full p-2 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div className="flex flex-col justify-end">
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-red-700 mb-2 cursor-pointer">
              <input
                type="checkbox"
                name="isOperationalBlocker"
                value="true"
                className="rounded border-red-300 text-red-600 focus:ring-red-500"
              />
              <span>Bloqueio Operacional</span>
            </label>
            <button
              type="submit"
              className="w-full py-2 px-3 bg-centi-900 hover:bg-centi-950 text-white rounded-lg font-medium text-xs shadow-xs"
            >
              Registrar
            </button>
          </div>
        </form>
      </div>

      {/* Visualização Gerenciada: Lista e Kanban com Edição Completa */}
      <IssuesViewManager
        project={{
          id: project.id,
          name: project.name,
          codePrefix: project.codePrefix,
        }}
        issues={issues}
        departments={departments}
        teamMembers={teamMembers}
        isKanban={isKanban}
      />
    </div>
  );
}
