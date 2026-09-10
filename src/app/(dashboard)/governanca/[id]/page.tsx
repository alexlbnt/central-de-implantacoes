import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server-session";
import prisma from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import {
  FileSpreadsheet,
  Download,
  CheckCircle2,
  Lock,
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  UserCheck,
  AlertTriangle,
  Plus,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { buildMeetingSnapshot } from "@/lib/domain/governance-snapshot";
import {
  calculateDeliverableProgress,
  calculateAutonomyIndex,
  calculateOperationalDepartmentsSummary,
} from "@/lib/domain/indicator-calculator";
import { checkOptimisticLock } from "@/lib/domain/concurrency";

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  const { id } = await params;

  const meeting = await prisma.meeting.findUnique({
    where: { id },
    include: {
      project: {
        include: {
          municipality: true,
          entities: {
            include: {
              departments: {
                include: {
                  criticalProcesses: {
                    include: {
                      testExecutions: { orderBy: { executedAt: "desc" }, take: 1 },
                      autonomyReqs: true,
                    },
                  },
                  deliverables: true,
                  issues: { where: { status: { notIn: ["CONCLUIDA", "CANCELADA"] } } },
                },
              },
            },
          },
          issues: {
            where: { isOperationalBlocker: true, status: { notIn: ["CONCLUIDA", "CANCELADA"] } },
          },
          memberships: {
            include: { user: true },
          },
        },
      },
      snapshot: true,
      decisions: {
        orderBy: { number: "asc" },
        include: {
          tasks: true,
        },
      },
    },
  });

  if (!meeting) {
    notFound();
  }

  const isFrozen = meeting.status !== "RASCUNHO" && !!meeting.snapshot;
  const project = meeting.project;

  // Server Action: Salvar Edições nas Seções da Ata
  async function updateMeetingAction(formData: FormData) {
    "use server";
    const currentVersion = Number(formData.get("version"));
    const section1 = formData.get("section1") as string;
    const section2 = formData.get("section2") as string;
    const section3 = formData.get("section3") as string;
    const section4 = formData.get("section4") as string;
    const section5 = formData.get("section5") as string;
    const participantsCenti = formData.get("participantsCenti") as string;
    const participantsClient = formData.get("participantsClient") as string;

    const dbMeeting = await prisma.meeting.findUnique({ where: { id } });
    if (!dbMeeting) throw new Error("Ata não encontrada.");

    checkOptimisticLock(dbMeeting.version, currentVersion, "Meeting");

    await prisma.meeting.update({
      where: { id },
      data: {
        section1ScheduleStatus: section1,
        section2CriticalPoints: section2,
        section3StrategicRealignments: section3,
        section4ActionPlanSummary: section4,
        section5GeneralSafeguards: section5,
        participantsCenti,
        participantsClient,
        version: { increment: 1 },
      },
    });

    revalidatePath(`/governanca/${id}`);
  }

  // Server Action: Adicionar Decisão à Ata
  async function addDecisionAction(formData: FormData) {
    "use server";
    const description = formData.get("description") as string;
    if (!description) return;

    const count = await prisma.meetingDecision.count({ where: { meetingId: id } });

    await prisma.meetingDecision.create({
      data: {
        meetingId: id,
        number: count + 1,
        description,
      },
    });

    revalidatePath(`/governanca/${id}`);
  }

  // Server Action: Adicionar Tarefa a uma Decisão
  async function addTaskAction(formData: FormData) {
    "use server";
    const decisionId = formData.get("decisionId") as string;
    const title = formData.get("title") as string;
    const dueDateRaw = formData.get("dueDateFatal") as string;
    const responsibleName = formData.get("responsibleName") as string;

    if (!title || !dueDateRaw) return;

    await prisma.task.create({
      data: {
        originDecisionId: decisionId,
        title,
        dueDateFatal: new Date(dueDateRaw),
        responsibleName: responsibleName || user?.name || "A definir",
      },
    });

    revalidatePath(`/governanca/${id}`);
  }

  // Server Action: Emitir Ata Oficial (Congela Snapshot Imutável e Gera Tarefas)
  async function emitOfficialMeetingAction() {
    "use server";

    const currentMeeting = await prisma.meeting.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            municipality: true,
            entities: {
              include: {
                departments: {
                  include: {
                    criticalProcesses: {
                      include: {
                        testExecutions: { orderBy: { executedAt: "desc" }, take: 1 },
                        autonomyReqs: true,
                      },
                    },
                    deliverables: true,
                  },
                },
              },
            },
            issues: {
              where: { isOperationalBlocker: true, status: { notIn: ["CONCLUIDA", "CANCELADA"] } },
            },
          },
        },
        decisions: {
          orderBy: { number: "asc" },
          include: { tasks: true },
        },
      },
    });

    if (!currentMeeting) throw new Error("Ata não encontrada.");

    const currentProj = currentMeeting.project;
    const allDepartments = currentProj.entities.flatMap((e) => e.departments);
    const allDeliverables = allDepartments.flatMap((d) => d.deliverables);
    const allAutonomyReqs = allDepartments.flatMap((d) =>
      d.criticalProcesses.flatMap((p) => p.autonomyReqs)
    );

    const depSummary = calculateOperationalDepartmentsSummary(allDepartments);
    const progressPerc = calculateDeliverableProgress(allDeliverables);
    const autonomyPerc = calculateAutonomyIndex(allAutonomyReqs);

    const actionPlan: Array<{ taskId?: string; title: string; responsibleName: string; dueDateFatal: Date }> = [];
    for (const d of currentMeeting.decisions) {
      for (const t of d.tasks) {
        actionPlan.push({
          taskId: t.id,
          title: t.title,
          responsibleName: t.responsibleName || "A definir",
          dueDateFatal: t.dueDateFatal,
        });
      }
    }

    const snapshotData = buildMeetingSnapshot(
      currentMeeting,
      {
        name: currentProj.name,
        municipalityName: currentProj.municipality.name,
      },
      {
        progressPercentage: progressPerc.percentage,
        autonomyPercentage: autonomyPerc.percentage,
        operationalDepartments: depSummary.operational,
        totalDepartments: depSummary.total,
        activeBlockersCount: currentProj.issues.length,
      },
      currentMeeting.decisions.map((d) => ({ number: d.number, description: d.description })),
      actionPlan,
      []
    );

    await prisma.$transaction([
      prisma.meetingSnapshot.upsert({
        where: { meetingId: id },
        update: {
          snapshotDataJson: JSON.stringify(snapshotData),
          frozenAt: new Date(),
          frozenBy: user?.name || "Líder de Implantação",
        },
        create: {
          meetingId: id,
          snapshotDataJson: JSON.stringify(snapshotData),
          frozenBy: user?.name || "Líder de Implantação",
        },
      }),
      prisma.meeting.update({
        where: { id },
        data: {
          status: "EMITIDA",
          version: { increment: 1 },
        },
      }),
      prisma.auditLog.create({
        data: {
          organizationId: currentProj.organizationId,
          projectId: currentProj.id,
          actorId: user?.id || (await prisma.user.findFirst())!.id,
          actorName: user?.name || "Líder de Implantação",
          action: "EMIT",
          targetType: "Meeting",
          targetId: id,
          justification: `Ata semanal oficial emitida e snapshot imutável congelado com ${currentMeeting.decisions.length} decisões.`,
        },
      }),
    ]);

    revalidatePath(`/governanca/${id}`);
    revalidatePath("/governanca");
  }

  return (
    <div className="space-y-6">
      {/* Topo / Voltar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            href="/governanca"
            className="p-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {meeting.title}
              </h1>
              <StatusBadge status={meeting.status} />
              {isFrozen && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <Lock className="w-3 h-3 text-emerald-700" />
                  SNAPSHOT IMUTÁVEL CONGELADO
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Projeto: <strong>{project.name}</strong>  |  NOP 001/2026 v12.5
            </p>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center gap-2">
          <a
            href={`/api/exports/docx/${meeting.id}`}
            download
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            Baixar DOCX Oficial
          </a>

          {!isFrozen && (
            <form action={emitOfficialMeetingAction}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <ShieldCheck className="w-4 h-4" />
                Emitir e Congelar Ata Oficial
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Metadados da Reunião */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <div>
            <p className="text-slate-500 font-medium">Data</p>
            <p className="font-semibold text-slate-900">
              {new Date(meeting.meetingDate).toLocaleDateString("pt-BR")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" />
          <div>
            <p className="text-slate-500 font-medium">Horário</p>
            <p className="font-semibold text-slate-900">
              {meeting.startTime} às {meeting.endTime}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-slate-400" />
          <div>
            <p className="text-slate-500 font-medium">Local</p>
            <p className="font-semibold text-slate-900">{meeting.location}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-slate-400" />
          <div>
            <p className="text-slate-500 font-medium">Líder Responsável</p>
            <p className="font-semibold text-slate-900">{meeting.executionLeader}</p>
          </div>
        </div>
      </div>

      {/* Seções da Ata Corporativa (NOP 001/2026) */}
      <form action={updateMeetingAction} className="space-y-6">
        <input type="hidden" name="version" value={meeting.version} />

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">
              Conteúdo Oficial da Ata (Seções Padronizadas NOP 001/2026)
            </h2>
            {isFrozen && (
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                Edição bloqueada pós-emissão
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Participantes da Contratada (Centi Soluções)
              </label>
              <textarea
                name="participantsCenti"
                rows={2}
                disabled={isFrozen}
                defaultValue={meeting.participantsCenti}
                className="w-full p-2.5 border border-slate-300 rounded-lg text-xs disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Participantes da Contratante (Município)
              </label>
              <textarea
                name="participantsClient"
                rows={2}
                disabled={isFrozen}
                defaultValue={meeting.participantsClient}
                className="w-full p-2.5 border border-slate-300 rounded-lg text-xs disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              1. Status Atual do Cronograma e Entregas
            </label>
            <textarea
              name="section1"
              rows={3}
              disabled={isFrozen}
              defaultValue={meeting.section1ScheduleStatus}
              className="w-full p-2.5 border border-slate-300 rounded-lg text-xs disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              2. Pontos Críticos e Impedimentos Identificados
            </label>
            <textarea
              name="section2"
              rows={3}
              disabled={isFrozen}
              defaultValue={meeting.section2CriticalPoints}
              className="w-full p-2.5 border border-slate-300 rounded-lg text-xs disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              3. Decisões e Realinhamentos Estratégicos
            </label>
            <textarea
              name="section3"
              rows={3}
              disabled={isFrozen}
              defaultValue={meeting.section3StrategicRealignments}
              className="w-full p-2.5 border border-slate-300 rounded-lg text-xs disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              4. Resumo do Plano de Ação para a Próxima Semana
            </label>
            <textarea
              name="section4"
              rows={2}
              disabled={isFrozen}
              defaultValue={meeting.section4ActionPlanSummary || ""}
              className="w-full p-2.5 border border-slate-300 rounded-lg text-xs disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              5. Observações Gerais e Salvaguardas Contratuais
            </label>
            <textarea
              name="section5"
              rows={3}
              disabled={isFrozen}
              defaultValue={meeting.section5GeneralSafeguards}
              className="w-full p-2.5 border border-slate-300 rounded-lg text-xs disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>

          {!isFrozen && (
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-centi-800 hover:bg-centi-900 text-white text-xs font-bold rounded-lg shadow-sm"
              >
                Salvar Alterações nas Seções
              </button>
            </div>
          )}
        </div>
      </form>

      {/* Decisões e Plano de Ação */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Decisões Deliberadas e Tarefas Vinculadas
            </h2>
            <p className="text-xs text-slate-500">
              As ações registradas aqui compõem a Tabela 4.1 do documento DOCX oficial.
            </p>
          </div>
        </div>

        {/* Lista de Decisões */}
        <div className="space-y-4">
          {meeting.decisions.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-2">
              Nenhuma decisão numerada cadastrada nesta ata.
            </p>
          ) : (
            meeting.decisions.map((decision) => (
              <div
                key={decision.id}
                className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-centi-900 text-white text-xs font-bold flex items-center justify-center">
                      {decision.number}
                    </span>
                    <h3 className="text-xs font-bold text-slate-900">{decision.description}</h3>
                  </div>
                </div>

                {/* Tarefas da Decisão */}
                <div className="pl-8 space-y-2">
                  <div className="text-[11px] font-semibold text-slate-600">Tarefas Vinculadas:</div>
                  {decision.tasks.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic">Sem tarefas adicionadas.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border border-slate-200 rounded-lg bg-white">
                        <thead className="bg-slate-100 text-slate-700 text-[11px]">
                          <tr>
                            <th className="p-2">Ação / O quê</th>
                            <th className="p-2">Responsável / Quem</th>
                            <th className="p-2">Prazo Fatal / Quando</th>
                            <th className="p-2">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {decision.tasks.map((task) => (
                            <tr key={task.id} className="hover:bg-slate-50">
                              <td className="p-2 font-medium text-slate-900">{task.title}</td>
                              <td className="p-2 text-slate-700">{task.responsibleName}</td>
                              <td className="p-2 font-semibold text-slate-900">
                                {new Date(task.dueDateFatal).toLocaleDateString("pt-BR")}
                              </td>
                              <td className="p-2">
                                <StatusBadge status={task.isCompleted ? "CONCLUIDA" : "PENDENTE"} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Form para Adicionar Tarefa à Decisão */}
                  {!isFrozen && (
                    <form action={addTaskAction} className="pt-2 flex flex-wrap items-center gap-2">
                      <input type="hidden" name="decisionId" value={decision.id} />
                      <input
                        type="text"
                        name="title"
                        required
                        placeholder="Nova ação acordada..."
                        className="flex-1 min-w-[200px] p-1.5 border border-slate-300 rounded text-xs"
                      />
                      <input
                        type="date"
                        name="dueDateFatal"
                        required
                        defaultValue={new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]}
                        className="p-1.5 border border-slate-300 rounded text-xs"
                      />
                      <input
                        type="text"
                        name="responsibleName"
                        placeholder="Responsável / Quem"
                        defaultValue={user?.name || ""}
                        className="p-1.5 border border-slate-300 rounded text-xs"
                      />
                      <button
                        type="submit"
                        className="px-2.5 py-1.5 bg-slate-800 text-white rounded text-xs font-semibold hover:bg-slate-900"
                      >
                        + Tarefa
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Form para Adicionar Nova Decisão */}
        {!isFrozen && (
          <form action={addDecisionAction} className="pt-3 border-t border-slate-200 flex gap-2">
            <input
              type="text"
              name="description"
              required
              placeholder="Descreva a nova decisão deliberada em reunião..."
              className="flex-1 p-2 border border-slate-300 rounded-lg text-xs"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-centi-800 hover:bg-centi-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar Decisão
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
