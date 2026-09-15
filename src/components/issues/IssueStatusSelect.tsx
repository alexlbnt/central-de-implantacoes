"use client";

import React, { useTransition } from "react";
import { updateIssueStatusAction } from "@/lib/actions/issue-actions";

interface IssueStatusSelectProps {
  issueId: string;
  currentStatus: string;
  className?: string;
}

export function IssueStatusSelect({
  issueId,
  currentStatus,
  className = "w-full text-[10px] p-1 border border-slate-200 rounded bg-slate-50",
}: IssueStatusSelectProps) {
  const [isPending, startTransition] = useTransition();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("issueId", issueId);
        formData.set("status", newStatus);
        await updateIssueStatusAction(formData);
      } catch (err: unknown) {
        console.error("Erro ao atualizar status da pendência:", err);
        alert(err instanceof Error ? err.message : "Erro ao atualizar status");
      }
    });
  };

  return (
    <div className={`relative ${isPending ? "opacity-50 pointer-events-none" : ""}`}>
      <select
        defaultValue={currentStatus}
        disabled={isPending}
        onChange={handleChange}
        className={className}
      >
        <option value="ABERTA">Aberta</option>
        <option value="EM_ANALISE">Em Análise</option>
        <option value="EM_EXECUCAO">Em Execução</option>
        <option value="AGUARDANDO_VALIDACAO">Aguardando Validação</option>
        <option value="CONCLUIDA">Concluída</option>
      </select>
    </div>
  );
}
