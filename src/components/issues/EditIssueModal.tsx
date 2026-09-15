"use client";

import React, { useState, useTransition } from "react";
import {
  X,
  Pencil,
  Trash2,
  AlertOctagon,
  Building2,
  Calendar,
  User,
  Clock,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { updateIssueAction, deleteIssueAction } from "@/lib/actions/issue-actions";

export interface IssueItem {
  id: string;
  projectId: string;
  codeNumber: number;
  title: string;
  description: string;
  departmentId?: string | null;
  priority: string;
  type: string;
  status: string;
  isOperationalBlocker: boolean;
  dueDate?: string | Date | null;
  nextAction?: string | null;
  waitingCondition?: string | null;
  waitingReason?: string | null;
  assigneeId?: string | null;
  department?: { id: string; name: string } | null;
  author?: { id: string; name: string } | null;
  assignee?: { id: string; name: string } | null;
}

interface EditIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  issue: IssueItem | null;
  departments: Array<{ id: string; name: string }>;
  teamMembers: Array<{ id: string; name: string; role?: string | null }>;
  projectCodePrefix?: string;
}

export function EditIssueModal({
  isOpen,
  onClose,
  issue,
  departments,
  teamMembers,
  projectCodePrefix = "SP",
}: EditIssueModalProps) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [selectedWaitingCondition, setSelectedWaitingCondition] = useState<string>(
    issue?.waitingCondition || "NENHUMA"
  );
  const [isBlocker, setIsBlocker] = useState<boolean>(issue?.isOperationalBlocker || false);

  // Sincroniza estados caso mude a issue selecionada
  React.useEffect(() => {
    if (issue) {
      setSelectedWaitingCondition(issue.waitingCondition || "NENHUMA");
      setIsBlocker(issue.isOperationalBlocker);
      setErrorMsg(null);
    }
  }, [issue]);

  if (!isOpen || !issue) return null;

  const formattedDueDate = issue.dueDate
    ? new Date(issue.dueDate).toISOString().split("T")[0]
    : "";

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      try {
        await updateIssueAction(formData);
        onClose();
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : "Erro ao atualizar pendência.");
      }
    });
  }

  async function handleDelete() {
    if (!issue) return;
    if (!confirm("Tem certeza que deseja excluir definitivamente esta pendência?")) return;

    setErrorMsg(null);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("issueId", issue.id);
        await deleteIssueAction(formData);
        onClose();
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : "Erro ao excluir pendência.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Cabeçalho */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-centi-50 text-centi-800 rounded-lg">
              <Pencil className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Editar Pendência / Ação de Campo</h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold">
                  {projectCodePrefix}-{String(issue.codeNumber).padStart(3, "0")}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Ajuste os dados cadastrais, responsável, prazos e bloqueio operacional
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário de Edição */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          <input type="hidden" name="issueId" value={issue.id} />

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Título */}
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Título da Pendência <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              required
              defaultValue={issue.title}
              className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-centi-500 focus:outline-none"
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Descrição Detalhada / Contexto
            </label>
            <textarea
              name="description"
              rows={3}
              defaultValue={issue.description || ""}
              placeholder="Detalhes operacionais, impactos e histórico da pendência..."
              className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-centi-500 focus:outline-none"
            />
          </div>

          {/* Grid 1: Departamento e Responsável */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-centi-700" />
                Departamento Vinculado
              </label>
              <select
                name="departmentId"
                defaultValue={issue.departmentId || ""}
                className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-centi-500 focus:outline-none"
              >
                <option value="">Geral do Projeto</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-centi-700" />
                Responsável Designado
              </label>
              <select
                name="assigneeId"
                defaultValue={issue.assigneeId || ""}
                className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-centi-500 focus:outline-none"
              >
                <option value="">Não atribuído</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} {m.role ? `(${m.role})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Grid 2: Prioridade, Tipo e Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Prioridade</label>
              <select
                name="priority"
                defaultValue={issue.priority}
                className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-centi-500 focus:outline-none"
              >
                <option value="BAIXA">Baixa</option>
                <option value="MEDIA">Média</option>
                <option value="ALTA">Alta</option>
                <option value="CRITICA">Crítica</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Tipo de Pendência</label>
              <select
                name="type"
                defaultValue={issue.type}
                className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-centi-500 focus:outline-none"
              >
                <option value="DUVIDA">Dúvida Operacional</option>
                <option value="PARAMETRIZACAO">Parametrização de Sistema</option>
                <option value="MIGRACAO">Migração de Dados</option>
                <option value="MELHORIA">Melhoria / Solicitação</option>
                <option value="ERRO">Erro / Inconformidade</option>
                <option value="INFRAESTRUTURA">Infraestrutura</option>
                <option value="DEPENDENCIA_MUNICIPAL">Dependência Municipal</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Status de Resolução</label>
              <select
                name="status"
                defaultValue={issue.status}
                className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-centi-500 focus:outline-none"
              >
                <option value="ABERTA">Aberta</option>
                <option value="EM_ANALISE">Em Análise</option>
                <option value="EM_EXECUCAO">Em Execução</option>
                <option value="AGUARDANDO_VALIDACAO">Aguardando Validação</option>
                <option value="CONCLUIDA">Concluída</option>
                <option value="CANCELADA">Cancelada</option>
              </select>
            </div>
          </div>

          {/* Grid 3: Prazo Fatal e Próxima Ação */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-centi-700" />
                Prazo Fatal (Data Limite)
              </label>
              <input
                type="date"
                name="dueDate"
                defaultValue={formattedDueDate}
                className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-centi-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Próxima Ação Imediata
              </label>
              <input
                type="text"
                name="nextAction"
                defaultValue={issue.nextAction || ""}
                placeholder="Ex: Cobrar envio do layout de folha"
                className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-centi-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Destaque: Bloqueio Operacional */}
          <div
            className={`p-3.5 rounded-xl border transition-colors ${
              isBlocker
                ? "bg-red-50/80 border-red-300"
                : "bg-slate-50 border-slate-200"
            }`}
          >
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                name="isOperationalBlocker"
                value="true"
                checked={isBlocker}
                onChange={(e) => setIsBlocker(e.target.checked)}
                className="rounded border-red-300 text-red-600 focus:ring-red-500 w-4 h-4"
              />
              <div className="flex items-center gap-1.5">
                <AlertOctagon className={`w-4 h-4 ${isBlocker ? "text-red-700" : "text-slate-500"}`} />
                <span className={`font-bold text-xs ${isBlocker ? "text-red-900" : "text-slate-800"}`}>
                  Bloqueio Operacional Real
                </span>
              </div>
            </label>
            <p className="text-[11px] text-slate-600 mt-1 pl-6">
              Quando marcado, impede que o departamento vinculado atinja o status <strong>Operacional</strong> até que seja resolvido.
            </p>
          </div>

          {/* Condição de Espera */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-amber-50/40 space-y-2">
            <label className="block font-semibold text-amber-950 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-700" />
              Condição de Espera Independente
            </label>
            <select
              name="waitingCondition"
              value={selectedWaitingCondition}
              onChange={(e) => setSelectedWaitingCondition(e.target.value)}
              className="w-full p-2 border border-amber-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
            >
              <option value="NENHUMA">Nenhuma (Ativa / Em andamento normal)</option>
              <option value="AGUARDANDO_MUNICIPIO">Aguardando Retorno do Município</option>
              <option value="AGUARDANDO_EQUIPE_INTERNA">Aguardando Equipe Interna Centi</option>
              <option value="AGUARDANDO_TERCEIRO">Aguardando Fornecedor / Terceiro</option>
            </select>

            {selectedWaitingCondition !== "NENHUMA" && (
              <div>
                <label className="block font-medium text-amber-900 mb-1">
                  Motivo da Espera / Detalhes do Bloqueio
                </label>
                <input
                  type="text"
                  name="waitingReason"
                  defaultValue={issue.waitingReason || ""}
                  placeholder="Ex: Aguardando o Secretário assinar o termo de adesão ao banco"
                  className="w-full p-2 border border-amber-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Rodapé de Ações */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <button
              type="button"
              disabled={isPending}
              onClick={handleDelete}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-700 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Excluir Pendência</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-5 py-2 bg-centi-800 hover:bg-centi-900 text-white font-bold rounded-lg shadow-sm transition-colors disabled:opacity-50 text-xs flex items-center gap-1.5"
              >
                {isPending ? "Salvando..." : "Salvar Alterações"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
