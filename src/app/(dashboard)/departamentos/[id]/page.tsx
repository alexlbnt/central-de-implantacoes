import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server-session";
import prisma from "@/lib/db/prisma";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { evaluateDepartmentOperationalStatus } from "@/lib/domain/operational-status";
import { revalidatePath } from "next/cache";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Plus,
  Play,
  UserCheck,
  AlertOctagon,
} from "lucide-react";
import {
  DepartmentEntityAdminProvider,
  DepartmentDetailAdminButtons,
} from "@/components/departments/DepartmentEntityAdminManager";

export default async function DepartmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  const { id } = await params;

  const dept = await prisma.department.findUnique({
    where: { id },
    include: {
      entity: {
        include: {
          project: {
            include: {
              memberships: true,
            },
          },
        },
      },
      municipalResponsible: true,
      municipalSubstitute: true,
      criticalProcesses: {
        include: {
          testExecutions: { orderBy: { executedAt: "desc" } },
          autonomyReqs: { include: { person: true } },
        },
      },
      modules: true,
      deliverables: true,
      issues: {
        where: { status: { notIn: ["CONCLUIDA", "CANCELADA"] } },
        include: { author: true },
      },
      diaries: { take: 5, orderBy: { entryDate: "desc" } },
    },
  });

  if (!dept) {
    notFound();
  }

  const isAdmin = user?.role === "ADMIN_GERAL";
  const isLeader = dept.entity.project.memberships.some(
    (m) => m.userId === user?.id && m.role === "LIDER_PROJETO"
  ) || isAdmin;

  const [moduleCatalog, persons, allEntities] = await Promise.all([
    isAdmin
      ? prisma.moduleCatalog.findMany({
          select: { id: true, name: true, code: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    isAdmin
      ? prisma.person.findMany({
          select: { id: true, name: true, roleTitle: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    isAdmin
      ? prisma.entity.findMany({
          where: { projectId: dept.entity.projectId },
          select: { id: true, name: true, type: true, identifier: true, notes: true },
        })
      : Promise.resolve([]),
  ]);

  // Server Action para registrar novo Processo Crítico
  async function addCriticalProcessAction(formData: FormData) {
    "use server";
    const name = formData.get("name") as string;
    const objective = formData.get("objective") as string;

    await prisma.criticalProcess.create({
      data: {
        departmentId: id,
        name,
        objective,
      },
    });

    revalidatePath(`/departamentos/${id}`);
    revalidatePath("/departamentos");
    revalidatePath("/");
  }

  // Server Action para registrar Teste Funcional / Autônomo
  async function recordTestAction(formData: FormData) {
    "use server";
    const processId = formData.get("processId") as string;
    const executorName = formData.get("executorName") as string;
    const evaluatorName = formData.get("evaluatorName") as string;
    const modality = formData.get("modality") as "ASSISTIDA" | "AUTONOMA";
    const result = formData.get("result") as "APROVADO" | "REPROVADO";
    const observedResult = formData.get("observedResult") as string;
    const personId = formData.get("personId") as string | null;

    const testExec = await prisma.testExecution.create({
      data: {
        processId,
        executorName,
        evaluatorName,
        modality,
        result,
        observedResult,
      },
    });

    // Se foi teste autônomo aprovado para usuário-chave, atualiza o requisito de autonomia
    if (modality === "AUTONOMA" && result === "APROVADO" && personId) {
      await prisma.autonomyRequirement.updateMany({
        where: { processId, personId },
        data: { isApproved: true, approvedAt: new Date() },
      });
    }

    // Recalcula o status operacional do departamento
    const updatedDept = await prisma.department.findUnique({
      where: { id },
      include: {
        criticalProcesses: {
          include: {
            testExecutions: { orderBy: { executedAt: "desc" }, take: 1 },
            autonomyReqs: { include: { person: true } },
          },
        },
        issues: { where: { isOperationalBlocker: true, status: { notIn: ["CONCLUIDA", "CANCELADA"] } } },
      },
    });

    if (updatedDept) {
      const evalResult = evaluateDepartmentOperationalStatus({
        hasDiagnosis: !!updatedDept.lastDiagnosisAt,
        lastDiagnosisAt: updatedDept.lastDiagnosisAt,
        isDataMigrationValidated: updatedDept.isDataMigrationValidated,
        isParametrizationValidated: updatedDept.isParametrizationValidated,
        isTrainingCompleted: updatedDept.isTrainingCompleted,
        isLeaderValidated: updatedDept.isLeaderValidated,
        criticalProcesses: updatedDept.criticalProcesses.map((p) => ({
          id: p.id,
          name: p.name,
          evidenceRequired: p.evidenceRequired,
          latestTest: p.testExecutions[0] ? {
            id: p.testExecutions[0].id,
            result: p.testExecutions[0].result,
            executedAt: p.testExecutions[0].executedAt,
            modality: p.testExecutions[0].modality,
          } : null,
        })),
        autonomyRequirements: updatedDept.criticalProcesses.flatMap((p) =>
          p.autonomyReqs.map((a) => ({
            id: a.id,
            processId: a.processId,
            personId: a.personId,
            isApproved: a.isApproved,
          }))
        ),
        activeBlockers: updatedDept.issues.map((i) => ({
          id: i.id,
          codeNumber: i.codeNumber,
          title: i.title,
          criticalProcessId: i.criticalProcessId,
        })),
      });

      await prisma.department.update({
        where: { id },
        data: {
          operationalStatus: evalResult.status,
          revalidationRequired: evalResult.revalidationRequired,
          revalidationReason: evalResult.revalidationReasons.join("; ") || null,
        },
      });
    }

    revalidatePath(`/departamentos/${id}`);
    revalidatePath("/departamentos");
    revalidatePath("/");
  }

  // Server Action para Validação Técnica do Líder
  async function validateLeaderAction(formData: FormData) {
    "use server";
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Não autenticado");

    await prisma.department.update({
      where: { id },
      data: {
        isLeaderValidated: true,
        leaderValidatedAt: new Date(),
        leaderValidatorName: currentUser.name,
      },
    });

    // Registra auditoria
    await prisma.auditLog.create({
      data: {
        organizationId: currentUser.organizationId,
        projectId: dept?.entity.projectId,
        actorId: currentUser.id,
        actorName: currentUser.name,
        action: "VALIDATE",
        targetType: "Department",
        targetId: id,
        justification: "Validação técnica formal de prontidão concedida pelo Líder.",
      },
    });

    revalidatePath(`/departamentos/${id}`);
    revalidatePath("/departamentos");
    revalidatePath("/");
  }

  // Server Action para Alternar Critérios Prévios (Migração, Parametrização, Treinamento)
  async function toggleCriterionAction(formData: FormData) {
    "use server";
    const field = formData.get("field") as string;
    const value = formData.get("value") === "true";

    const updateData: Record<string, unknown> = { [field]: value };
    if (field === "isDataMigrationValidated") updateData.dataMigrationValidatedAt = value ? new Date() : null;
    if (field === "isParametrizationValidated") updateData.parametrizationValidatedAt = value ? new Date() : null;
    if (field === "isTrainingCompleted") updateData.trainingCompletedAt = value ? new Date() : null;

    await prisma.department.update({
      where: { id },
      data: updateData,
    });

    revalidatePath(`/departamentos/${id}`);
    revalidatePath("/departamentos");
    revalidatePath("/");
  }

  return (
    <DepartmentEntityAdminProvider
      projectId={dept.entity.projectId}
      isAdmin={isAdmin}
      entities={allEntities}
      moduleCatalog={moduleCatalog}
      persons={persons}
    >
      <div className="space-y-6">
        {/* Botão de Retorno e Cabeçalho */}
        <div>
          <Link
            href="/departamentos"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar para Departamentos
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  {dept.name}
                </h1>
                <StatusBadge
                  status={dept.operationalStatus}
                  revalidationRequired={dept.revalidationRequired}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Entidade: <strong className="text-slate-700">{dept.entity.name}</strong>  |  Projeto: <strong className="text-slate-700">{dept.entity.project.name}</strong>
              </p>
            </div>

            <DepartmentDetailAdminButtons
              dept={{
                id: dept.id,
                entityId: dept.entityId,
                name: dept.name,
                criticality: dept.criticality,
                municipalResponsibleId: dept.municipalResponsibleId,
                moduleIds: dept.modules.map((m) => m.moduleId),
              }}
            />
          </div>
        </div>

      {/* Grid de 2 Colunas: Checklist dos 5 Critérios + Ações */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1 e 2: Checklist dos 5 Critérios Cumulativos e Processos */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card dos 5 Critérios para Operacional */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-centi-800" />
              Checklist Cumulativo de Prontidão Operacional
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Para atingir o estado "Operacional", todos os 5 critérios abaixo precisam estar atestados simultaneamente.
            </p>

            <div className="space-y-3 text-xs">
              {/* Critério 1: Migração de Dados */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50">
                <div>
                  <div className="font-semibold text-slate-800">1. Migração de Dados Legados</div>
                  <div className="text-[11px] text-slate-500">
                    Saldos iniciais e cadastros do legado conferidos e validados.
                  </div>
                </div>
                <form action={toggleCriterionAction}>
                  <input type="hidden" name="field" value="isDataMigrationValidated" />
                  <input type="hidden" name="value" value={dept.isDataMigrationValidated ? "false" : "true"} />
                  <button
                    type="submit"
                    className={`px-3 py-1 rounded-md text-xs font-semibold ${
                      dept.isDataMigrationValidated
                        ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                        : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                    }`}
                  >
                    {dept.isDataMigrationValidated ? "Validada" : "Pendente"}
                  </button>
                </form>
              </div>

              {/* Critério 2: Parametrização */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50">
                <div>
                  <div className="font-semibold text-slate-800">2. Parametrização do ERP Centi</div>
                  <div className="text-[11px] text-slate-500">
                    Regras fiscais, contábeis e tabelas locais configuradas.
                  </div>
                </div>
                <form action={toggleCriterionAction}>
                  <input type="hidden" name="field" value="isParametrizationValidated" />
                  <input type="hidden" name="value" value={dept.isParametrizationValidated ? "false" : "true"} />
                  <button
                    type="submit"
                    className={`px-3 py-1 rounded-md text-xs font-semibold ${
                      dept.isParametrizationValidated
                        ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                        : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                    }`}
                  >
                    {dept.isParametrizationValidated ? "Validada" : "Pendente"}
                  </button>
                </form>
              </div>

              {/* Critério 3: Capacitação */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50">
                <div>
                  <div className="font-semibold text-slate-800">3. Capacitação e Treinamento</div>
                  <div className="text-[11px] text-slate-500">
                    Treinamentos teóricos e práticos ministrados aos operadores.
                  </div>
                </div>
                <form action={toggleCriterionAction}>
                  <input type="hidden" name="field" value="isTrainingCompleted" />
                  <input type="hidden" name="value" value={dept.isTrainingCompleted ? "false" : "true"} />
                  <button
                    type="submit"
                    className={`px-3 py-1 rounded-md text-xs font-semibold ${
                      dept.isTrainingCompleted
                        ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                        : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                    }`}
                  >
                    {dept.isTrainingCompleted ? "Comprovada" : "Pendente"}
                  </button>
                </form>
              </div>

              {/* Critério 4: Processos Críticos e Autonomia */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50">
                <div>
                  <div className="font-semibold text-slate-800">4. Testes e Autonomia Comprovada</div>
                  <div className="text-[11px] text-slate-500">
                    Todos os processos críticos aprovados e usuários-chave com teste autônomo válido.
                  </div>
                </div>
                <span className="text-xs font-semibold text-slate-600">
                  {dept.criticalProcesses.length} processos
                </span>
              </div>

              {/* Critério 5: Validação Técnica do Líder */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50">
                <div>
                  <div className="font-semibold text-slate-800">5. Validação Técnica Formal do Líder</div>
                  <div className="text-[11px] text-slate-500">
                    Ateste técnico irrevogável de que o setor consegue operar em produção.
                  </div>
                </div>
                {dept.isLeaderValidated ? (
                  <span className="px-3 py-1 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300">
                    Homologado por {dept.leaderValidatorName || "Líder"}
                  </span>
                ) : isLeader ? (
                  <form action={validateLeaderAction}>
                    <button
                      type="submit"
                      className="px-3 py-1 rounded-md text-xs font-semibold bg-centi-900 text-white hover:bg-centi-950 transition-colors shadow-xs"
                    >
                      Homologar como Líder
                    </button>
                  </form>
                ) : (
                  <span className="text-xs text-slate-500 italic">
                    Requer permissão de Líder
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Processos Críticos do Departamento */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Processos Críticos Cadastrados</h2>
                <p className="text-xs text-slate-500">Rotinas operacionais que exigem homologação prática.</p>
              </div>
            </div>

            {dept.criticalProcesses.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-3 text-center">
                Nenhum processo crítico cadastrado para este departamento.
              </p>
            ) : (
              <div className="space-y-4">
                {dept.criticalProcesses.map((proc) => {
                  const latestTest = proc.testExecutions[0];

                  return (
                    <div
                      key={proc.id}
                      className="p-4 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-sm text-slate-900">{proc.name}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{proc.objective || "Sem objetivo cadastrado"}</div>
                        </div>

                        {latestTest ? (
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                              latestTest.result === "APROVADO"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-red-50 text-red-800 border-red-200"
                            }`}
                          >
                            {latestTest.result} ({latestTest.modality})
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            Sem teste
                          </span>
                        )}
                      </div>

                      {/* Formulário Rápido para Registrar Execução de Teste */}
                      <div className="pt-3 border-t border-slate-100">
                        <form action={recordTestAction} className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                          <input type="hidden" name="processId" value={proc.id} />
                          <input type="hidden" name="evaluatorName" value={user?.name || "Líder Centi"} />
                          <input type="hidden" name="executorName" value={dept.municipalResponsible?.name || "Servidor Municipal"} />
                          <input type="hidden" name="personId" value={dept.municipalResponsibleId || ""} />

                          <div>
                            <select name="modality" className="w-full p-1.5 border border-slate-300 rounded text-xs">
                              <option value="AUTONOMA">Teste Autônomo</option>
                              <option value="ASSISTIDA">Operação Assistida</option>
                            </select>
                          </div>

                          <div>
                            <select name="result" className="w-full p-1.5 border border-slate-300 rounded text-xs">
                              <option value="APROVADO">Aprovado</option>
                              <option value="REPROVADO">Reprovado</option>
                            </select>
                          </div>

                          <div>
                            <input
                              type="text"
                              name="observedResult"
                              required
                              placeholder="Resultado observado no teste"
                              className="w-full p-1.5 border border-slate-300 rounded text-xs"
                            />
                          </div>

                          <div>
                            <button
                              type="submit"
                              className="w-full py-1.5 px-3 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded text-xs transition-colors"
                            >
                              Salvar Teste
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Formulário para Adicionar Novo Processo Crítico */}
            <form action={addCriticalProcessAction} className="mt-5 pt-4 border-t border-slate-200 flex gap-2">
              <input
                type="text"
                name="name"
                required
                placeholder="Nome do novo processo crítico (ex: Ordem de Pagamento)"
                className="flex-1 p-2 border border-slate-300 rounded-lg text-xs"
              />
              <button
                type="submit"
                className="py-2 px-4 bg-centi-900 hover:bg-centi-950 text-white font-medium rounded-lg text-xs transition-colors"
              >
                Adicionar Processo
              </button>
            </form>
          </div>
        </div>

        {/* Coluna 3: Responsáveis, Bloqueios e Ações */}
        <div className="space-y-6">
          {/* Card de Responsáveis */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm text-xs space-y-3">
            <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-centi-800" />
              Pessoas e Responsáveis
            </h3>

            <div>
              <div className="text-slate-500">Responsável Municipal:</div>
              <div className="font-semibold text-slate-800">
                {dept.municipalResponsible?.name || "A definir"}
              </div>
              <div className="text-[11px] text-slate-500">
                {dept.municipalResponsible?.roleTitle || "Servidor do setor"}
              </div>
            </div>

            <div>
              <div className="text-slate-500">Substituto Municipal:</div>
              <div className="font-semibold text-slate-800">
                {dept.municipalSubstitute?.name || "Nenhum cadastrado"}
              </div>
            </div>
          </div>

          {/* Bloqueios Operacionais Ativos */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm text-xs">
            <h3 className="font-bold text-red-900 border-b border-red-100 pb-2 flex items-center gap-1.5">
              <AlertOctagon className="w-4 h-4 text-red-600" />
              Bloqueios Operacionais Ativos ({dept.issues.length})
            </h3>

            {dept.issues.length === 0 ? (
              <p className="text-slate-500 italic mt-3">Nenhum impedimento ativo neste setor.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {dept.issues.map((i) => (
                  <div key={i.id} className="p-2.5 rounded-lg bg-red-50 border border-red-200">
                    <div className="font-semibold text-red-900">SP-{String(i.codeNumber).padStart(3, "0")}</div>
                    <div className="text-slate-700 mt-1">{i.title}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </DepartmentEntityAdminProvider>
  );
}
