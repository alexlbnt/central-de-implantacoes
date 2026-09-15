import React from "react";
import Link from "next/link";
import { getCurrentUser, getAuthorizedProjectId } from "@/lib/auth/server-session";
import prisma from "@/lib/db/prisma";
import { createIssueAction } from "@/lib/actions/issue-actions";
import { IssueStatusSelect } from "@/components/issues/IssueStatusSelect";
import {
  CheckSquare,
  Plus,
  AlertOctagon,
  Clock,
  Download,
  Filter,
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

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Pendências e Ações de Campo
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Projeto: <strong>{project.name}</strong>  |  Gestão unificada em Lista e Kanban.
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

      {/* Visualização em Lista ou Kanban */}
      {isKanban ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {(["ABERTA", "EM_ANALISE", "EM_EXECUCAO", "AGUARDANDO_VALIDACAO", "CONCLUIDA"] as const).map((colStatus) => {
            const colIssues = issues.filter((i) => i.status === colStatus);

            return (
              <div key={colStatus} className="bg-slate-100/80 rounded-xl p-3 border border-slate-200">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-700">{colStatus}</span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white text-slate-600">
                    {colIssues.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {colIssues.map((issue) => (
                    <div
                      key={issue.id}
                      className={`p-3 rounded-lg bg-white border shadow-xs text-xs space-y-1.5 ${
                        issue.isOperationalBlocker ? "border-red-300 bg-red-50/30" : "border-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between font-mono text-[10px] text-slate-500">
                        <span>{project.codePrefix}-{String(issue.codeNumber).padStart(3, "0")}</span>
                        {issue.isOperationalBlocker && (
                          <span className="text-red-700 font-bold flex items-center gap-0.5">
                            <AlertOctagon className="w-3 h-3" /> BLOQUEIO
                          </span>
                        )}
                      </div>

                      <div className="font-semibold text-slate-900 line-clamp-2">
                        {issue.title}
                      </div>

                      <div className="text-[11px] text-slate-500">
                        {issue.department?.name || "Geral"}
                      </div>

                      <div className="pt-2 border-t border-slate-100">
                        <IssueStatusSelect
                          issueId={issue.id}
                          currentStatus={issue.status}
                          className="w-full text-[10px] p-1 border border-slate-200 rounded bg-slate-50"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-3">Código / Título</th>
                  <th className="py-2.5 px-3">Departamento</th>
                  <th className="py-2.5 px-3">Prioridade</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Prazo Fatal</th>
                  <th className="py-2.5 px-3">Espera</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {issues.map((issue) => (
                  <tr key={issue.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500">
                        <span>{project.codePrefix}-{String(issue.codeNumber).padStart(3, "0")}</span>
                        {issue.isOperationalBlocker && (
                          <span className="text-red-700 font-bold px-1.5 py-0.2 rounded bg-red-100 text-[10px]">
                            BLOQUEIO
                          </span>
                        )}
                      </div>
                      <div className="font-semibold text-slate-900 mt-0.5">{issue.title}</div>
                    </td>

                    <td className="py-3 px-3 text-slate-600">
                      {issue.department?.name || "Geral do Projeto"}
                    </td>

                    <td className="py-3 px-3 font-semibold">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] ${
                          issue.priority === "CRITICA"
                            ? "bg-red-100 text-red-800"
                            : issue.priority === "ALTA"
                            ? "bg-orange-100 text-orange-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {issue.priority}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <IssueStatusSelect
                        issueId={issue.id}
                        currentStatus={issue.status}
                        className="text-xs p-1 border border-slate-300 rounded bg-white"
                      />
                    </td>

                    <td className="py-3 px-3 font-mono text-slate-600">
                      {issue.dueDate ? issue.dueDate.toLocaleDateString("pt-BR") : "A definir"}
                    </td>

                    <td className="py-3 px-3 text-[11px]">
                      {issue.waitingCondition !== "NENHUMA" ? (
                        <span className="inline-flex items-center gap-1 text-amber-800 font-medium px-2 py-0.5 rounded bg-amber-50 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" />
                          {issue.waitingCondition}
                        </span>
                      ) : (
                        <span className="text-slate-400">Ativa</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
