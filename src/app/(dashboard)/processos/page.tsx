import React from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/server-session";
import prisma from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import {
  GitPullRequest,
  CheckCircle2,
  AlertOctagon,
  ArrowRight,
  Plus,
  Network,
  ListFilter,
  CheckSquare,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ProcessDagValidator } from "@/lib/domain/dag-validator";

export default async function ProcessosPage({
  searchParams,
}: {
  searchParams?: Promise<{ projectId?: string; selectedProcessId?: string }>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;

  const project = await prisma.project.findFirst({
    where: params?.projectId ? { id: params.projectId } : {},
    include: {
      municipality: true,
      entities: {
        include: {
          departments: {
            include: {
              criticalProcesses: {
                include: {
                  department: true,
                  dependencies: {
                    include: {
                      dependsOn: { include: { department: true } },
                    },
                  },
                  dependents: {
                    include: {
                      process: { include: { department: true } },
                    },
                  },
                  testExecutions: {
                    orderBy: { executedAt: "desc" },
                    take: 1,
                  },
                  autonomyReqs: true,
                },
              },
              deliverables: {
                include: { department: true },
              },
            },
          },
        },
      },
    },
  });

  if (!project) {
    return <div className="p-8 text-center text-slate-600">Nenhum projeto encontrado.</div>;
  }

  const allDepartments = project.entities.flatMap((e) => e.departments);
  const allProcesses = allDepartments.flatMap((d) => d.criticalProcesses);
  const allDeliverables = allDepartments.flatMap((d) => d.deliverables);

  // Instancia o validador DAG
  const nodes = allProcesses.map((p) => ({
    id: p.id,
    name: p.name,
    departmentId: p.departmentId,
    projectId: project.id,
  }));

  const edges: Array<{ processId: string; dependsOnId: string; reason?: string | null }> = [];
  for (const p of allProcesses) {
    for (const dep of p.dependencies) {
      edges.push({
        processId: dep.processId,
        dependsOnId: dep.dependsOnId,
        reason: dep.reason,
      });
    }
  }

  const dagValidator = new ProcessDagValidator(nodes, edges);

  // Calcula impacto a jusante se houver um processo selecionado
  const selectedProcId = params?.selectedProcessId || allProcesses[0]?.id;
  const selectedProc = allProcesses.find((p) => p.id === selectedProcId);
  const downstreamImpact = selectedProcId ? dagValidator.getDownstreamImpact(selectedProcId) : null;

  // Server Action: Criar Processo Crítico
  async function createProcessAction(formData: FormData) {
    "use server";
    const departmentId = formData.get("departmentId") as string;
    const name = formData.get("name") as string;
    const criticality = formData.get("criticality") as "BAIXA" | "MEDIA" | "ALTA" | "CRITICA";
    const objective = formData.get("objective") as string;
    const expectedResult = formData.get("expectedResult") as string;

    if (!departmentId || !name) return;

    await prisma.criticalProcess.create({
      data: {
        departmentId,
        name,
        criticality: criticality || "ALTA",
        objective,
        expectedResult,
      },
    });

    revalidatePath("/processos");
  }

  // Server Action: Vincular Dependência Pré-requisito (com verificação de ciclos)
  async function addDependencyAction(formData: FormData) {
    "use server";
    const processId = formData.get("processId") as string;
    const dependsOnId = formData.get("dependsOnId") as string;
    const reason = formData.get("reason") as string;

    if (!processId || !dependsOnId || processId === dependsOnId) return;

    // Valida ciclo instanciando a classe diretamente na ação a partir das listas planas
    const validator = new ProcessDagValidator(nodes, edges);
    const cycleCheck = validator.wouldCreateCycle(processId, dependsOnId);
    if (cycleCheck.hasCycle) {
      throw new Error(`Dependência rejeitada: criaria ciclo direcionado: ${cycleCheck.cycleNames.join(" -> ")}`);
    }

    await prisma.processDependency.upsert({
      where: {
        processId_dependsOnId: {
          processId,
          dependsOnId,
        },
      },
      update: { reason },
      create: {
        processId,
        dependsOnId,
        reason,
      },
    });

    revalidatePath("/processos");
  }

  // Server Action: Alternar Status de Entrega (Deliverable)
  async function toggleDeliverableAction(formData: FormData) {
    "use server";
    const deliverableId = formData.get("deliverableId") as string;
    const isValidated = formData.get("isValidated") === "true";

    await prisma.deliverable.update({
      where: { id: deliverableId },
      data: {
        isValidated: !isValidated,
        validatedAt: !isValidated ? new Date() : null,
        validatedBy: !isValidated ? user?.name || "Líder" : null,
      },
    });

    revalidatePath("/processos");
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Processos Críticos, Entregas e Dependências (DAG)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Projeto: <strong>{project.name}</strong>  |  Precedência lógica entre processos e entregas obrigatórias
          </p>
        </div>
      </div>

      {/* Top Cards: Resumo de Métricas de Processos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Total de Processos Críticos</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{allProcesses.length}</div>
          <p className="text-[11px] text-slate-500 mt-1">Distribuídos em {allDepartments.length} departamentos</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Dependências Ativas no Grafo</div>
          <div className="text-2xl font-bold text-centi-800 mt-1">{edges.length}</div>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">Grafo Acíclico Válido (Zero ciclos)</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Entregas Validadas</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">
            {allDeliverables.filter((d) => d.isValidated).length} / {allDeliverables.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {allDeliverables.length > 0
              ? `${Math.round((allDeliverables.filter((d) => d.isValidated).length / allDeliverables.length) * 100)}% concluídas`
              : "0%"}
          </p>
        </div>
      </div>

      {/* Seção Principal: Grafo & Simulador de Impacto a Jusante */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1 & 2: Lista de Processos e Precedências */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
              <Network className="w-4 h-4 text-centi-800" />
              Mapeamento de Precedências (DAG)
            </h2>

            <div className="space-y-3">
              {allProcesses.map((proc) => {
                const isSelected = proc.id === selectedProcId;
                const hasBlocker = proc.testExecutions[0]?.result === "REPROVADO";

                return (
                  <div
                    key={proc.id}
                    className={`p-3.5 rounded-lg border transition-all ${
                      isSelected
                        ? "border-centi-600 bg-emerald-50/40 ring-1 ring-centi-600"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{proc.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-slate-100 text-slate-700">
                            {proc.department?.name}
                          </span>
                          <StatusBadge status={proc.criticality} />
                        </div>
                        {proc.objective && (
                          <p className="text-xs text-slate-600 mt-1">{proc.objective}</p>
                        )}
                      </div>

                      <Link
                        href={`/processos?projectId=${project.id}&selectedProcessId=${proc.id}`}
                        className={`px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap ${
                          isSelected
                            ? "bg-centi-800 text-white"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        Simular Impacto
                      </Link>
                    </div>

                    {/* Pre-requisitos e Dependentes */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="font-semibold text-slate-600">Depende de (Pré-requisitos):</span>
                        {proc.dependencies.length === 0 ? (
                          <span className="text-slate-400 italic ml-1">Nenhum (independente)</span>
                        ) : (
                          <ul className="mt-1 space-y-0.5">
                            {proc.dependencies.map((d) => (
                              <li key={d.id} className="text-slate-700 flex items-center gap-1">
                                <ArrowRight className="w-3 h-3 text-slate-400" />
                                <strong>{d.dependsOn.name}</strong> ({d.dependsOn.department.name})
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div>
                        <span className="font-semibold text-slate-600">Necessário para (Dependentes):</span>
                        {proc.dependents.length === 0 ? (
                          <span className="text-slate-400 italic ml-1">Nenhum processo a jusante</span>
                        ) : (
                          <ul className="mt-1 space-y-0.5">
                            {proc.dependents.map((dep) => (
                              <li key={dep.id} className="text-slate-700 flex items-center gap-1">
                                <ArrowRight className="w-3 h-3 text-emerald-600" />
                                <strong>{dep.process.name}</strong> ({dep.process.department.name})
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Form para Adicionar Nova Dependência */}
            <div className="mt-4 pt-4 border-t border-slate-200">
              <h3 className="text-xs font-bold text-slate-900 mb-2">Vincular Nova Relação de Precedência</h3>
              <form action={addDependencyAction} className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">Processo Dependente</label>
                  <select name="processId" required className="w-full p-2 border border-slate-300 rounded-lg text-xs">
                    <option value="">Selecione o processo...</option>
                    {allProcesses.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.department.name})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">Exige como Pré-requisito</label>
                  <select name="dependsOnId" required className="w-full p-2 border border-slate-300 rounded-lg text-xs">
                    <option value="">Selecione o pré-requisito...</option>
                    {allProcesses.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.department.name})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full p-2 bg-centi-800 hover:bg-centi-900 text-white rounded-lg text-xs font-bold"
                  >
                    Salvar Dependência
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Coluna 3: Simulador de Impacto e Checklist de Entregas */}
        <div className="space-y-4">
          {/* Card de Impacto a Jusante */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              Simulador de Impacto a Jusante
            </h2>

            {selectedProc ? (
              <div className="text-xs space-y-2">
                <p className="text-slate-600">
                  Se o processo <strong>{selectedProc.name}</strong> for bloqueado ou atrasado:
                </p>

                {downstreamImpact && downstreamImpact.impactedProcessIds.length > 0 ? (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-2">
                    <div className="font-bold text-red-900 flex items-center gap-1.5">
                      <AlertOctagon className="w-4 h-4 text-red-600" />
                      {downstreamImpact.impactedProcessIds.length} processo(s) paralisado(s) em cascata:
                    </div>
                    <ul className="space-y-1 pl-2">
                      {downstreamImpact.impactedProcessNames.map((name, idx) => (
                        <li key={idx} className="text-red-800 font-medium list-disc list-inside">
                          {name}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 font-medium">
                    Nenhum outro processo depende diretamente deste. Bloqueio isolado.
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500">Selecione um processo para analisar a cadeia de impacto.</p>
            )}
          </div>

          {/* Checklist de Entregas Obrigatórias */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-centi-800" />
              Checklist de Entregas (Deliverables)
            </h2>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-1 text-xs">
              {allDeliverables.map((del) => (
                <form
                  key={del.id}
                  action={toggleDeliverableAction}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50"
                >
                  <input type="hidden" name="deliverableId" value={del.id} />
                  <input type="hidden" name="isValidated" value={String(del.isValidated)} />

                  <div className="pr-2">
                    <div className="font-medium text-slate-900">{del.name}</div>
                    <div className="text-[10px] text-slate-500">
                      {del.department.name} {del.isMandatory ? "• Obrigatória" : "• Opcional"}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className={`px-2 py-1 rounded text-[11px] font-bold transition-colors ${
                      del.isValidated
                        ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                        : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                    }`}
                  >
                    {del.isValidated ? "✓ Validada" : "Pendente"}
                  </button>
                </form>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
