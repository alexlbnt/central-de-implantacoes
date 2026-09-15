import React from "react";
import Link from "next/link";
import { getCurrentUser, getCurrentUserContext, getAuthorizedProjectId } from "@/lib/auth/server-session";
import prisma from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import {
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Building2,
  Clock,
  Plus,
  Send,
  Lock,
  Flame,
  FileCheck,
  Zap,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  calculateDeliverableProgress,
  calculateAutonomyIndex,
  calculateOperationalDepartmentsSummary,
} from "@/lib/domain/indicator-calculator";

export default async function TransicaoPage({
  searchParams,
}: {
  searchParams?: Promise<{ projectId?: string }>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;
  const authorizedProjectId = await getAuthorizedProjectId(params?.projectId);

  if (!authorizedProjectId) {
    return <div className="p-8 text-center text-slate-600">Nenhum projeto encontrado ou acesso não autorizado.</div>;
  }

  const project = await prisma.project.findUnique({
    where: { id: authorizedProjectId },
    include: {
      municipality: true,
      readiness: true,
      transitionCycle: true,
      gphInterventions: {
        orderBy: { createdAt: "desc" },
      },
      entities: {
        include: {
          departments: {
            include: {
              criticalProcesses: {
                include: {
                  autonomyReqs: true,
                },
              },
            },
          },
        },
      },
      issues: {
        where: { isOperationalBlocker: true, status: { notIn: ["CONCLUIDA", "CANCELADA"] } },
      },
    },
  });

  if (!project) {
    return <div className="p-8 text-center text-slate-600">Nenhum projeto encontrado.</div>;
  }

  const allDepartments = project.entities.flatMap((e) => e.departments);
  const depSummary = calculateOperationalDepartmentsSummary(allDepartments);
  const allAutonomyReqs = allDepartments.flatMap((d) =>
    d.criticalProcesses.flatMap((p) => p.autonomyReqs)
  );
  const autonomyIndex = calculateAutonomyIndex(allAutonomyReqs);
  const blockersCount = project.issues.length;

  const assessment = project.readiness;
  const cycle = project.transitionCycle;

  // Server Action: Alternar Critério do Portão de Prontidão (Readiness)
  async function toggleReadinessCheckAction(formData: FormData) {
    "use server";
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Não autenticado");
    const currentContext = await getCurrentUserContext();
    if (!currentContext) throw new Error("Sessão inválida");

    const isProjectLeader = currentContext.projectMemberships.some(
      (m) => m.projectId === project!.id && m.role === "LIDER_PROJETO"
    );
    if (currentUser.role !== "ADMIN_GERAL" && !isProjectLeader) {
      throw new Error("Apenas o Líder do Projeto ou Administrador Geral podem alterar critérios do portão de prontidão.");
    }

    const field = formData.get("field") as string;
    const currentValue = formData.get("currentValue") === "true";

    const ALLOWED_READINESS_FIELDS = [
      "initialAccountingValidated",
      "initialFinancialValidated",
      "initialInventoryValidated",
      "transparencyPortalWorking",
      "pncpFirstTransmissionOk",
      "wikiConsolidated",
      "allAutonomyProven",
      "leaderTechnicalVerdict",
    ];

    if (!ALLOWED_READINESS_FIELDS.includes(field)) {
      throw new Error("Campo inválido no portão de prontidão.");
    }

    await prisma.readinessAssessment.upsert({
      where: { projectId: project!.id },
      update: {
        [field]: !currentValue,
        assessedBy: currentUser.name || "Líder de Implantação",
        assessedAt: new Date(),
      },
      create: {
        projectId: project!.id,
        [field]: !currentValue,
        assessedBy: currentUser.name || "Líder de Implantação",
        assessedAt: new Date(),
      },
    });

    revalidatePath("/transicao");
  }

  // Server Action: Iniciar Ciclo Bridge (20 dias úteis de Operação Assistida)
  async function startBridgeCycleAction(formData: FormData) {
    "use server";
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Não autenticado");
    const currentContext = await getCurrentUserContext();
    if (!currentContext) throw new Error("Sessão inválida");

    const isProjectLeader = currentContext.projectMemberships.some(
      (m) => m.projectId === project!.id && m.role === "LIDER_PROJETO"
    );
    if (currentUser.role !== "ADMIN_GERAL" && !isProjectLeader) {
      throw new Error("Apenas o Líder do Projeto ou Administrador Geral podem iniciar a fase de transição Bridge.");
    }

    const crmResponsible = (formData.get("crmResponsible") as string)?.trim();
    const serviceDeskLead = (formData.get("serviceDeskLead") as string)?.trim();

    await prisma.transitionCycle.upsert({
      where: { projectId: project!.id },
      update: {
        bridgeStartedAt: new Date(),
        crmResponsible: crmResponsible || "Analista Bridge CRM",
        serviceDeskLead: serviceDeskLead || "Suporte N2 Centi",
      },
      create: {
        projectId: project!.id,
        bridgeDurationDays: 20,
        bridgeStartedAt: new Date(),
        crmResponsible: crmResponsible || "Analista Bridge CRM",
        serviceDeskLead: serviceDeskLead || "Suporte N2 Centi",
      },
    });

    await prisma.project.update({
      where: { id: project!.id },
      data: { phase: "EM_TRANSICAO", status: "EM_TRANSICAO" },
    });

    revalidatePath("/transicao");
  }

  // Server Action: Concluir Handover Definitivo
  async function completeHandoverAction() {
    "use server";
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Não autenticado");
    const currentContext = await getCurrentUserContext();
    if (!currentContext) throw new Error("Sessão inválida");

    const isProjectLeader = currentContext.projectMemberships.some(
      (m) => m.projectId === project!.id && m.role === "LIDER_PROJETO"
    );
    if (currentUser.role !== "ADMIN_GERAL" && !isProjectLeader) {
      throw new Error("Apenas o Líder do Projeto ou Administrador Geral podem concluir o Handover definitivo.");
    }

    // Validação de bloqueadores ativos impeditivos
    const activeBlockers = await prisma.issue.count({
      where: {
        projectId: project!.id,
        isOperationalBlocker: true,
        status: { notIn: ["CONCLUIDA", "CANCELADA"] },
      },
    });

    if (activeBlockers > 0) {
      throw new Error(`Não é possível concluir o Handover: existem ${activeBlockers} bloqueio(s) operacional(is) não resolvido(s).`);
    }

    await prisma.transitionCycle.update({
      where: { projectId: project!.id },
      data: {
        handoverCompletedAt: new Date(),
        bridgeEndedAt: new Date(),
      },
    });

    await prisma.project.update({
      where: { id: project!.id },
      data: { phase: "ENCERRADO", status: "ENCERRADO" },
    });

    revalidatePath("/transicao");
  }

  // Server Action: Abrir Intervenção GPH (Governança Pós-Homologação)
  async function createGPHInterventionAction(formData: FormData) {
    "use server";
    const tk090Reference = formData.get("tk090Reference") as string;
    const crmEvaluator = formData.get("crmEvaluator") as string;
    const baTechnicalLead = formData.get("baTechnicalLead") as string;
    const dcConvoker = formData.get("dcConvoker") as string;

    await prisma.gPHIntervention.create({
      data: {
        projectId: project!.id,
        tk090Reference: tk090Reference || "TK090-GPH-001",
        crmEvaluator: crmEvaluator || "CRM Especialista",
        baTechnicalLead: baTechnicalLead || "Business Analyst Centi",
        dcConvoker: dcConvoker || "Diretoria de Contas (DC)",
        status: "EM_ANDAMENTO",
        immersionStart: new Date(),
      },
    });

    revalidatePath("/transicao");
  }

  // Server Action: Registrar Resistência Municipal em GPH Ativo
  async function recordResistanceAction(formData: FormData) {
    "use server";
    const gphId = formData.get("gphId") as string;
    const consecutiveDays = Number(formData.get("consecutiveDays") || 1);
    const reason = formData.get("reason") as string;

    await prisma.gPHIntervention.update({
      where: { id: gphId },
      data: {
        hasMunicipalResistance: true,
        resistanceConsecutiveDays: consecutiveDays,
        resistanceReason: reason,
      },
    });

    revalidatePath("/transicao");
  }

  // Server Action: Decretar Caducidade pelo DC (Diretor de Contas)
  async function decreeCaducityAction(formData: FormData) {
    "use server";
    const gphId = formData.get("gphId") as string;
    const reason = formData.get("reason") as string;

    if (!reason) return;

    await prisma.gPHIntervention.update({
      where: { id: gphId },
      data: {
        status: "CADUCO",
        dcCaducityDecreed: true,
        dcCaducityReason: reason,
        dcCaducityDate: new Date(),
      },
    });

    revalidatePath("/transicao");
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Transição para Suporte e Operação Assistida (Bridge & GPH)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Projeto: <strong>{project.name}</strong>  |  Portões de Prontidão (Readiness), Ciclo Bridge de 20 dias e Governança GPH
          </p>
        </div>
        <StatusBadge status={project.phase} />
      </div>

      {/* 3 Cards de Estado da Prontidão */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Departamentos Operacionais</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {depSummary.operational} / {depSummary.total}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {depSummary.total > 0 ? Math.round((depSummary.operational / depSummary.total) * 100) : 0}% aptos à passagem de bastão
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Impedimentos Bloqueadores Ativos</div>
          <div className={`text-2xl font-bold mt-1 ${blockersCount > 0 ? "text-red-600" : "text-emerald-600"}`}>
            {blockersCount} {blockersCount === 1 ? "bloqueador" : "bloqueadores"}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {blockersCount === 0 ? "Critério de zero impedimentos atendido" : "Exige resolução antes da transição"}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Autonomia Comprovada</div>
          <div className={`text-2xl font-bold mt-1 ${autonomyIndex.percentage !== null && autonomyIndex.percentage >= 80 ? "text-emerald-600" : "text-amber-600"}`}>
            {autonomyIndex.displayText}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {autonomyIndex.percentage !== null && autonomyIndex.percentage >= 80 ? "Meta de >= 80% superada" : "Abaixo da meta recomendada (80%)"}
          </p>
        </div>
      </div>

      {/* Grid: Portão de Prontidão & Ciclo Bridge */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Portões de Prontidão Técnica (Readiness Gates) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-centi-800" />
              Critérios de Prontidão Técnica (Readiness Checklist)
            </h2>
            {assessment?.assessedBy && (
              <span className="text-[10px] text-slate-500">
                Avaliado por: {assessment.assessedBy}
              </span>
            )}
          </div>

          <div className="space-y-2.5 text-xs">
            {[
              { id: "initialAccountingValidated", label: "Saldos Contábeis Iniciais Validados e Saneados" },
              { id: "initialFinancialValidated", label: "Conciliação Bancária e Financeira Concluída" },
              { id: "initialInventoryValidated", label: "Saldo Físico e Financeiro de Almoxarifado/Patrimônio" },
              { id: "transparencyPortalWorking", label: "Portal da Transparência em Operação e Dados Atualizados" },
              { id: "pncpFirstTransmissionOk", label: "Primeira Transmissão Oficial ao PNCP Homologada" },
              { id: "wikiConsolidated", label: "Regras Municipais Consolidadas e Pareceres Homologados" },
              { id: "allAutonomyProven", label: "Testes de Autonomia Prática Aprovados nos Setores Críticos" },
              { id: "leaderTechnicalVerdict", label: "Parecer Técnico Favorável do Líder de Implantação" },
            ].map((gate) => {
              const checked = !!(assessment as any)?.[gate.id];
              return (
                <form
                  key={gate.id}
                  action={toggleReadinessCheckAction}
                  className="flex items-center justify-between p-2 rounded-lg border border-slate-100 hover:bg-slate-50"
                >
                  <input type="hidden" name="field" value={gate.id} />
                  <input type="hidden" name="currentValue" value={String(checked)} />

                  <span className="text-slate-800 font-medium">{gate.label}</span>

                  <button
                    type="submit"
                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors ${
                      checked
                        ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    {checked ? "✓ Aprovado" : "Pendente"}
                  </button>
                </form>
              );
            })}
          </div>
        </div>

        {/* Card 2: Operação Assistida (Ciclo Bridge - 20 Dias) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-centi-800" />
              Operação Assistida - Ciclo Bridge (20 Dias)
            </h2>
            <StatusBadge status={cycle?.handoverCompletedAt ? "CONCLUIDA" : cycle?.bridgeStartedAt ? "EM_EXECUCAO" : "PLANEJADA"} />
          </div>

          <div className="text-xs space-y-3">
            <p className="text-slate-600">
              O ciclo Bridge consiste em 20 dias úteis de acompanhamento pós-virada, com presença do analista CRM Bridge e suporte N2 integrado para garantir a estabilidade do primeiro fechamento oficial.
            </p>

            {cycle?.bridgeStartedAt ? (
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between font-bold text-emerald-950">
                  <span>Ciclo Bridge em Andamento</span>
                  <span>Iniciado em: {new Date(cycle.bridgeStartedAt).toLocaleDateString("pt-BR")}</span>
                </div>
                <div className="text-[11px] text-emerald-800">
                  Responsável CRM: <strong>{cycle.crmResponsible || "Não atribuído"}</strong> • Suporte N2: <strong>{cycle.serviceDeskLead || "Não atribuído"}</strong>
                </div>

                {!cycle.handoverCompletedAt && (
                  <form action={completeHandoverAction} className="pt-2">
                    <button
                      type="submit"
                      className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      Assinar Ata de Handover e Concluir Implantação
                    </button>
                  </form>
                )}
              </div>
            ) : (
              <form action={startBridgeCycleAction} className="space-y-3 pt-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Analista CRM Responsável</label>
                  <input
                    type="text"
                    name="crmResponsible"
                    defaultValue="Especialista CRM Bridge Centi"
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Líder do Suporte N2 / Service Desk</label>
                  <input
                    type="text"
                    name="serviceDeskLead"
                    defaultValue="Coordenador de Suporte Centi"
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-centi-800 hover:bg-centi-900 text-white rounded-lg font-bold shadow-xs"
                >
                  Iniciar Ciclo Bridge de 20 Dias
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Governança Pós-Homologação (GPH) & Alerta de Resistência Municipal */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-centi-800" />
              Governança Pós-Homologação (GPH) & Gestão de Crise
            </h2>
            <p className="text-xs text-slate-500">
              Mecanismo oficial para tratamento de resistência municipal crônica ou falhas na operação assistida.
            </p>
          </div>
        </div>

        {/* Lista de Intervenções GPH */}
        <div className="space-y-4">
          {project.gphInterventions.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-2">
              Nenhuma intervenção GPH ativa ou convocada para este projeto.
            </p>
          ) : (
            project.gphInterventions.map((gph) => {
              const isOverResistanceThreshold = gph.hasMunicipalResistance && gph.resistanceConsecutiveDays > 3;

              return (
                <div
                  key={gph.id}
                  className={`p-4 rounded-xl border space-y-3 ${
                    isOverResistanceThreshold
                      ? "border-red-300 bg-red-50/50"
                      : "border-slate-200 bg-slate-50/50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">
                          Intervenção GPH [{gph.tk090Reference || "TK090"}]
                        </span>
                        <StatusBadge status={gph.status} />
                        {gph.dcCaducityDecreed && (
                          <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-purple-100 text-purple-900 border border-purple-300">
                            Caducidade Decretada pelo DC
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Convocante: <strong>{gph.dcConvoker}</strong> • Avaliador CRM: <strong>{gph.crmEvaluator}</strong> • BA: <strong>{gph.baTechnicalLead}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Alerta de Resistência Municipal */}
                  {isOverResistanceThreshold && (
                    <div className="p-3 bg-red-100 border border-red-300 rounded-lg space-y-1.5 text-xs text-red-900">
                      <div className="font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-red-700" />
                        ALERTA DE CADUCIDADE AO DIRETOR DE CONTAS (DC)
                      </div>
                      <p className="text-[11px]">
                        Identificada resistência municipal consecutiva por <strong>{gph.resistanceConsecutiveDays} dias úteis</strong>. Motivo: {gph.resistanceReason || "Não detalhado"}.
                        O sistema <strong>não</strong> decreta caducidade automática; a decretação formal cabe exclusivamente à Diretoria de Contas (DC).
                      </p>

                      {!gph.dcCaducityDecreed && (
                        <form action={decreeCaducityAction} className="pt-2 flex items-center gap-2">
                          <input type="hidden" name="gphId" value={gph.id} />
                          <input
                            type="text"
                            name="reason"
                            required
                            placeholder="Justificativa formal do Diretor de Contas para decretação de caducidade..."
                            className="flex-1 p-1.5 border border-red-300 bg-white rounded text-xs"
                          />
                          <button
                            type="submit"
                            className="px-3 py-1.5 bg-red-800 hover:bg-red-900 text-white rounded text-xs font-bold whitespace-nowrap shadow-xs"
                          >
                            Decretar Caducidade Formal
                          </button>
                        </form>
                      )}
                    </div>
                  )}

                  {/* Form para Atualizar Resistência Municipal */}
                  {!gph.dcCaducityDecreed && gph.status === "EM_ANDAMENTO" && (
                    <form action={recordResistanceAction} className="pt-2 border-t border-slate-200 flex flex-wrap items-center gap-2 text-xs">
                      <input type="hidden" name="gphId" value={gph.id} />
                      <span className="font-semibold text-slate-700">Registrar Resistência:</span>
                      <input
                        type="number"
                        name="consecutiveDays"
                        min="1"
                        defaultValue={gph.resistanceConsecutiveDays + 1}
                        className="w-16 p-1.5 border border-slate-300 rounded text-xs"
                      />
                      <span className="text-slate-600">dias úteis consecutivos.</span>
                      <input
                        type="text"
                        name="reason"
                        required
                        placeholder="Motivo da ausência ou recusa..."
                        className="flex-1 min-w-[200px] p-1.5 border border-slate-300 rounded text-xs"
                      />
                      <button
                        type="submit"
                        className="px-2.5 py-1.5 bg-slate-800 text-white rounded text-xs font-semibold hover:bg-slate-900"
                      >
                        Atualizar Dias
                      </button>
                    </form>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Form para Convocação de Nova Intervenção GPH */}
        <div className="pt-3 border-t border-slate-200">
          <h3 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-centi-800" />
            Convocar Intervenção de Governança Pós-Homologação (GPH)
          </h3>
          <form action={createGPHInterventionAction} className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
            <div>
              <input
                type="text"
                name="tk090Reference"
                required
                placeholder="Chamado de Referência (ex: #TK090)"
                className="w-full p-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <input
                type="text"
                name="crmEvaluator"
                defaultValue="Avaliador CRM Bridge"
                className="w-full p-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <input
                type="text"
                name="baTechnicalLead"
                defaultValue="Business Analyst Centi"
                className="w-full p-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <button
                type="submit"
                className="w-full py-2 bg-centi-800 hover:bg-centi-900 text-white rounded-lg text-xs font-bold"
              >
                Convocar GPH
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
