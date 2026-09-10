import React from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/server-session";
import prisma from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import {
  AlertTriangle,
  Flame,
  ShieldCheck,
  Plus,
  ArrowUpRight,
  CheckCircle2,
  FileSpreadsheet,
  Zap,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default async function RiscosPage({
  searchParams,
}: {
  searchParams?: Promise<{ projectId?: string }>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;

  const project = await prisma.project.findFirst({
    where: params?.projectId ? { id: params.projectId } : {},
    include: {
      risks: {
        orderBy: { exposure: "desc" },
      },
      escalations: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!project) {
    return <div className="p-8 text-center text-slate-600">Nenhum projeto encontrado.</div>;
  }

  // Server Action: Criar Risco
  async function createRiskAction(formData: FormData) {
    "use server";
    const description = formData.get("description") as string;
    const cause = formData.get("cause") as string;
    const consequence = formData.get("consequence") as string;
    const probability = Number(formData.get("probability") || 3);
    const impact = Number(formData.get("impact") || 3);
    const responsible = formData.get("responsible") as string;
    const responsePlan = formData.get("responsePlan") as string;
    const contingencyPlan = formData.get("contingencyPlan") as string;

    const exposure = probability * impact;

    await prisma.risk.create({
      data: {
        projectId: project!.id,
        description,
        cause,
        consequence,
        probability,
        impact,
        exposure,
        responsible: responsible || "Líder de Implantação",
        responsePlan,
        contingencyPlan,
        status: "MONITORADO",
      },
    });

    revalidatePath("/riscos");
  }

  // Server Action: Materializar Risco em Pendência Bloqueadora
  async function materializeRiskAction(formData: FormData) {
    "use server";
    const riskId = formData.get("riskId") as string;

    const risk = await prisma.risk.findUnique({ where: { id: riskId } });
    if (!risk) return;

    // Obtém próximo número sequencial de issue para o projeto
    const lastIssue = await prisma.issue.findFirst({
      where: { projectId: project!.id },
      orderBy: { codeNumber: "desc" },
    });
    const nextCode = (lastIssue?.codeNumber || 0) + 1;

    const defaultUser = user || (await prisma.user.findFirst());
    const issue = await prisma.issue.create({
      data: {
        projectId: project!.id,
        authorId: defaultUser!.id,
        codeNumber: nextCode,
        title: `[RISCO MATERIALIZADO] ${risk.description}`,
        description: `Causa: ${risk.cause || "Não detalhada"}\nConsequência: ${risk.consequence || "Não detalhada"}\nPlano de Resposta: ${risk.responsePlan || "Nenhum"}\nContingência: ${risk.contingencyPlan || "Nenhum"}`,
        type: "DEPENDENCIA_MUNICIPAL",
        priority: risk.exposure >= 16 ? "CRITICA" : "ALTA",
        status: "ABERTA",
        isOperationalBlocker: true,
      },
    });

    await prisma.risk.update({
      where: { id: riskId },
      data: {
        status: "MATERIALIZADO",
        materializedIssueId: issue.id,
      },
    });

    revalidatePath("/riscos");
    revalidatePath("/pendencias");
  }

  // Server Action: Registrar Escalação
  async function createEscalationAction(formData: FormData) {
    "use server";
    const level = Number(formData.get("level") || 1);
    const reason = formData.get("reason") as string;
    const recipientRole = formData.get("recipientRole") as any;
    const responsible = formData.get("responsible") as string;

    await prisma.escalation.create({
      data: {
        projectId: project!.id,
        level,
        reason,
        recipientRole: recipientRole || "DC",
        responsible: responsible || "Comitê de Crise",
      },
    });

    revalidatePath("/riscos");
  }

  // Helper para cor do nível de exposição
  function getExposureBadge(exposure: number) {
    if (exposure >= 17) {
      return <span className="px-2 py-0.5 rounded font-bold bg-red-100 text-red-900 border border-red-300">Crítico ({exposure})</span>;
    }
    if (exposure >= 10) {
      return <span className="px-2 py-0.5 rounded font-bold bg-orange-100 text-orange-900 border border-orange-300">Alto ({exposure})</span>;
    }
    if (exposure >= 5) {
      return <span className="px-2 py-0.5 rounded font-bold bg-amber-100 text-amber-900 border border-amber-300">Médio ({exposure})</span>;
    }
    return <span className="px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">Baixo ({exposure})</span>;
  }

  // Prepara matriz 5x5
  const matrix: Record<string, number> = {};
  for (let p = 1; p <= 5; p++) {
    for (let i = 1; i <= 5; i++) {
      matrix[`${p}-${i}`] = 0;
    }
  }
  for (const r of project.risks) {
    const key = `${r.probability}-${r.impact}`;
    if (matrix[key] !== undefined) {
      matrix[key]++;
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Matriz de Riscos da Implantação
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Projeto: <strong>{project.name}</strong>  |  Matriz 5x5 de Probabilidade x Impacto e Escalação de Crise
          </p>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Total de Riscos Mapeados</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{project.risks.length}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Riscos Críticos (17-25)</div>
          <div className="text-2xl font-bold text-red-600 mt-1">
            {project.risks.filter((r) => r.exposure >= 17).length}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Materializados em Impedimentos</div>
          <div className="text-2xl font-bold text-orange-600 mt-1">
            {project.risks.filter((r) => r.status === "MATERIALIZADO").length}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Escalações Registradas</div>
          <div className="text-2xl font-bold text-centi-800 mt-1">{project.escalations.length}</div>
        </div>
      </div>

      {/* Grid: Matriz 5x5 e Novo Risco */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visualizador Matriz 5x5 */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
            <Flame className="w-4 h-4 text-red-600" />
            Matriz Gráfica 5x5 (Probabilidade vs Impacto)
          </h2>

          <div className="overflow-x-auto">
            <div className="min-w-[480px]">
              <div className="flex items-center mb-2">
                <span className="text-xs font-bold text-slate-700 w-28">Probabilidade ↓</span>
                <span className="text-xs font-bold text-slate-700 text-center flex-1">Impacto →</span>
              </div>

              {/* Linhas da Matriz (Probabilidade 5 decrescendo até 1) */}
              {[5, 4, 3, 2, 1].map((prob) => (
                <div key={prob} className="flex items-center gap-2 mb-1.5">
                  <div className="w-28 text-[11px] font-semibold text-slate-600">
                    P{prob} ({prob === 5 ? "Muito Alta" : prob === 4 ? "Alta" : prob === 3 ? "Média" : prob === 2 ? "Baixa" : "Muito Baixa"})
                  </div>

                  <div className="flex-1 grid grid-cols-5 gap-1.5">
                    {[1, 2, 3, 4, 5].map((imp) => {
                      const exp = prob * imp;
                      const count = matrix[`${prob}-${imp}`] || 0;

                      let cellBg = "bg-emerald-50 text-emerald-800 border-emerald-200";
                      if (exp >= 17) cellBg = "bg-red-100 text-red-900 border-red-300 font-bold";
                      else if (exp >= 10) cellBg = "bg-orange-100 text-orange-900 border-orange-300 font-bold";
                      else if (exp >= 5) cellBg = "bg-amber-50 text-amber-900 border-amber-200";

                      return (
                        <div
                          key={imp}
                          className={`h-12 border rounded-lg flex flex-col items-center justify-center text-xs transition-transform hover:scale-105 ${cellBg}`}
                        >
                          <span className="text-[10px] opacity-75">I{imp} (Score {exp})</span>
                          <span className="text-sm font-bold">{count} {count === 1 ? "risco" : "riscos"}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Form para Adicionar Risco */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
            <Plus className="w-4 h-4 text-centi-800" />
            Cadastrar Novo Risco
          </h2>

          <form action={createRiskAction} className="space-y-3 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Descrição do Risco</label>
              <textarea
                name="description"
                required
                rows={2}
                placeholder="Ex: Resistência dos servidores da Saúde no preenchimento de prontuário..."
                className="w-full p-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Probabilidade (1 a 5)</label>
                <select name="probability" className="w-full p-2 border border-slate-300 rounded-lg text-xs">
                  <option value="1">1 - Muito Baixa</option>
                  <option value="2">2 - Baixa</option>
                  <option value="3">3 - Média</option>
                  <option value="4">4 - Alta</option>
                  <option value="5">5 - Muito Alta</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Impacto (1 a 5)</label>
                <select name="impact" className="w-full p-2 border border-slate-300 rounded-lg text-xs">
                  <option value="1">1 - Muito Baixo</option>
                  <option value="2">2 - Baixo</option>
                  <option value="3">3 - Médio</option>
                  <option value="4">4 - Alto</option>
                  <option value="5">5 - Crítico</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Responsável pelo Monitoramento</label>
              <input
                type="text"
                name="responsible"
                required
                defaultValue="Líder de Implantação"
                className="w-full p-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Plano de Resposta / Mitigação</label>
              <input
                type="text"
                name="responsePlan"
                placeholder="Ação preventiva..."
                className="w-full p-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Plano de Contingência</label>
              <input
                type="text"
                name="contingencyPlan"
                placeholder="Se o risco ocorrer..."
                className="w-full p-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-centi-800 hover:bg-centi-900 text-white rounded-lg font-bold shadow-xs"
            >
              Registrar Risco na Matriz
            </button>
          </form>
        </div>
      </div>

      {/* Tabela de Riscos Detalhados */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center justify-between pb-2 border-b border-slate-100">
          <span>Riscos Registrados e Ações de Mitigação</span>
          <span className="text-xs text-slate-500 font-normal">Ordenados por Exposição decrescente</span>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-200 rounded-lg">
            <thead className="bg-slate-100 text-slate-700 font-semibold text-[11px]">
              <tr>
                <th className="p-3">Exposição</th>
                <th className="p-3">Descrição do Risco</th>
                <th className="p-3">Probabilidade x Impacto</th>
                <th className="p-3">Responsável</th>
                <th className="p-3">Status</th>
                <th className="p-3">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {project.risks.map((risk) => (
                <tr key={risk.id} className="hover:bg-slate-50">
                  <td className="p-3 whitespace-nowrap">{getExposureBadge(risk.exposure)}</td>
                  <td className="p-3">
                    <div className="font-semibold text-slate-900">{risk.description}</div>
                    {risk.responsePlan && (
                      <div className="text-[11px] text-slate-600 mt-0.5">
                        <strong>Mitigação:</strong> {risk.responsePlan}
                      </div>
                    )}
                  </td>
                  <td className="p-3 whitespace-nowrap text-slate-700">
                    P{risk.probability} x I{risk.impact} = {risk.exposure}
                  </td>
                  <td className="p-3 whitespace-nowrap text-slate-700">{risk.responsible}</td>
                  <td className="p-3 whitespace-nowrap">
                    <StatusBadge status={risk.status} />
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    {risk.status !== "MATERIALIZADO" ? (
                      <form action={materializeRiskAction}>
                        <input type="hidden" name="riskId" value={risk.id} />
                        <button
                          type="submit"
                          className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-bold flex items-center gap-1 shadow-xs"
                        >
                          <Zap className="w-3 h-3" />
                          Materializar
                        </button>
                      </form>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-medium">Materializado</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
