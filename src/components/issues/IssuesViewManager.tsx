"use client";

import React, { useState } from "react";
import {
  AlertOctagon,
  Clock,
  Pencil,
  User,
  Building2,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import { IssueStatusSelect } from "./IssueStatusSelect";
import { EditIssueModal, IssueItem } from "./EditIssueModal";

interface IssuesViewManagerProps {
  project: {
    id: string;
    name: string;
    codePrefix: string;
  };
  issues: IssueItem[];
  departments: Array<{ id: string; name: string }>;
  teamMembers: Array<{ id: string; name: string; role?: string | null }>;
  isKanban: boolean;
}

const KANBAN_STATUSES = [
  { key: "ABERTA", label: "Aberta" },
  { key: "EM_ANALISE", label: "Em Análise" },
  { key: "EM_EXECUCAO", label: "Em Execução" },
  { key: "AGUARDANDO_VALIDACAO", label: "Aguardando Validação" },
  { key: "CONCLUIDA", label: "Concluída" },
] as const;

export function IssuesViewManager({
  project,
  issues,
  departments,
  teamMembers,
  isKanban,
}: IssuesViewManagerProps) {
  const [editingIssue, setEditingIssue] = useState<IssueItem | null>(null);

  return (
    <>
      {isKanban ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {KANBAN_STATUSES.map((col) => {
            const colIssues = issues.filter((i) => i.status === col.key);

            return (
              <div key={col.key} className="bg-slate-100/80 rounded-xl p-3 border border-slate-200">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-700">{col.label}</span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200">
                    {colIssues.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {colIssues.length === 0 ? (
                    <div className="py-6 text-center text-[11px] text-slate-400 italic">
                      Nenhuma pendência
                    </div>
                  ) : (
                    colIssues.map((issue) => (
                      <div
                        key={issue.id}
                        className={`p-3 rounded-lg bg-white border shadow-xs text-xs space-y-2 transition-all hover:border-slate-300 ${
                          issue.isOperationalBlocker
                            ? "border-red-300 bg-red-50/25"
                            : "border-slate-200"
                        }`}
                      >
                        {/* Código & Tag de Bloqueio */}
                        <div className="flex items-center justify-between font-mono text-[10px] text-slate-500">
                          <span>
                            {project.codePrefix}-{String(issue.codeNumber).padStart(3, "0")}
                          </span>
                          {issue.isOperationalBlocker && (
                            <span className="text-red-700 font-bold flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-red-100 text-[10px]">
                              <AlertOctagon className="w-3 h-3" /> BLOQUEIO
                            </span>
                          )}
                        </div>

                        {/* Título */}
                        <div className="font-semibold text-slate-900 line-clamp-2 leading-snug">
                          {issue.title}
                        </div>

                        {/* Informações Auxiliares */}
                        <div className="space-y-1 text-[11px] text-slate-500">
                          {issue.department && (
                            <div className="flex items-center gap-1 text-slate-600 truncate">
                              <Building2 className="w-3 h-3 shrink-0 text-slate-400" />
                              <span className="truncate">{issue.department.name}</span>
                            </div>
                          )}

                          {issue.assignee && (
                            <div className="flex items-center gap-1 text-slate-600 truncate">
                              <User className="w-3 h-3 shrink-0 text-slate-400" />
                              <span className="truncate">{issue.assignee.name}</span>
                            </div>
                          )}

                          {issue.dueDate && (
                            <div className="flex items-center gap-1 text-slate-500">
                              <Calendar className="w-3 h-3 shrink-0 text-slate-400" />
                              <span>{new Date(issue.dueDate).toLocaleDateString("pt-BR")}</span>
                            </div>
                          )}
                        </div>

                        {/* Seletor Rápido e Botão Editar */}
                        <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5">
                          <div className="flex-1">
                            <IssueStatusSelect
                              issueId={issue.id}
                              currentStatus={issue.status}
                              className="w-full text-[10px] p-1 border border-slate-200 rounded bg-slate-50"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => setEditingIssue(issue)}
                            title="Editar pendência"
                            className="p-1 text-slate-500 hover:text-centi-800 hover:bg-slate-100 rounded transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
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
                  <th className="py-2.5 px-3">Responsável</th>
                  <th className="py-2.5 px-3">Prioridade</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Prazo Fatal</th>
                  <th className="py-2.5 px-3">Espera</th>
                  <th className="py-2.5 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {issues.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-xs text-slate-400 italic">
                      Nenhuma pendência encontrada.
                    </td>
                  </tr>
                ) : (
                  issues.map((issue) => (
                    <tr key={issue.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500">
                          <span>
                            {project.codePrefix}-{String(issue.codeNumber).padStart(3, "0")}
                          </span>
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

                      <td className="py-3 px-3 text-slate-600">
                        {issue.assignee?.name || "—"}
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
                        {issue.dueDate
                          ? new Date(issue.dueDate).toLocaleDateString("pt-BR")
                          : "A definir"}
                      </td>

                      <td className="py-3 px-3 text-[11px]">
                        {issue.waitingCondition && issue.waitingCondition !== "NENHUMA" ? (
                          <span className="inline-flex items-center gap-1 text-amber-800 font-medium px-2 py-0.5 rounded bg-amber-50 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" />
                            {issue.waitingCondition}
                          </span>
                        ) : (
                          <span className="text-slate-400">Ativa</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setEditingIssue(issue)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5 text-slate-600" />
                          <span>Editar</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Edição de Pendência */}
      <EditIssueModal
        isOpen={!!editingIssue}
        onClose={() => setEditingIssue(null)}
        issue={editingIssue}
        departments={departments}
        teamMembers={teamMembers}
        projectCodePrefix={project.codePrefix}
      />
    </>
  );
}
