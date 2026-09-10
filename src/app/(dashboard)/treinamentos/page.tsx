import React from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/server-session";
import prisma from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import {
  GraduationCap,
  Users,
  CheckCircle2,
  Clock,
  Plus,
  Award,
  BookOpen,
  Calendar,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { calculateAutonomyIndex } from "@/lib/domain/indicator-calculator";

export default async function TreinamentosPage({
  searchParams,
}: {
  searchParams?: Promise<{ projectId?: string }>;
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
                  autonomyReqs: true,
                },
              },
            },
          },
        },
      },
      trainings: {
        include: {
          attendances: {
            include: {
              person: true,
            },
          },
        },
        orderBy: { scheduledDate: "desc" },
      },
    },
  });

  if (!project) {
    return <div className="p-8 text-center text-slate-600">Nenhum projeto encontrado.</div>;
  }

  const municipalPersons = await prisma.person.findMany({
    where: { isMunicipal: true },
    orderBy: { name: "asc" },
  });

  const allAutonomyReqs = project.entities.flatMap((e) =>
    e.departments.flatMap((d) => d.criticalProcesses.flatMap((p) => p.autonomyReqs))
  );

  const autonomyIndex = calculateAutonomyIndex(allAutonomyReqs);
  const totalTrainings = project.trainings.length;
  const completedTrainings = project.trainings.filter((t) => t.status === "REALIZADO").length;

  const allAttendances = project.trainings.flatMap((t) => t.attendances);
  const presentCount = allAttendances.filter((a) => a.isPresent).length;
  const attendanceRate = allAttendances.length > 0 ? Math.round((presentCount / allAttendances.length) * 100) : 0;

  // Server Action: Criar Treinamento
  async function createTrainingAction(formData: FormData) {
    "use server";
    const subject = formData.get("subject") as string;
    const moduleCode = formData.get("moduleCode") as string;
    const instructorName = formData.get("instructorName") as string;
    const scheduledDateRaw = formData.get("scheduledDate") as string;
    const durationMinutes = Number(formData.get("durationMinutes") || 120);
    const location = formData.get("location") as string;
    const objectives = formData.get("objectives") as string;

    if (!subject || !scheduledDateRaw) return;

    await prisma.training.create({
      data: {
        projectId: project!.id,
        subject,
        moduleCode: moduleCode || "GERAL",
        instructorName: instructorName || "Especialista Centi",
        scheduledDate: new Date(scheduledDateRaw),
        durationMinutes,
        location: location || "Auditório Municipal",
        objectives,
        status: "PLANEJADO",
      },
    });

    revalidatePath("/treinamentos");
  }

  // Server Action: Registrar Presença e Nota de Avaliação Prática
  async function recordAttendanceAction(formData: FormData) {
    "use server";
    const trainingId = formData.get("trainingId") as string;
    const personId = formData.get("personId") as string;
    const isPresent = formData.get("isPresent") === "true";
    const evaluationScoreRaw = formData.get("evaluationScore") as string;
    const notes = formData.get("notes") as string;

    const evaluationScore = evaluationScoreRaw ? parseFloat(evaluationScoreRaw) : null;

    await prisma.trainingAttendance.upsert({
      where: {
        trainingId_personId: {
          trainingId,
          personId,
        },
      },
      update: {
        isPresent,
        evaluationScore,
        notes,
      },
      create: {
        trainingId,
        personId,
        isPresent,
        evaluationScore,
        notes,
      },
    });

    revalidatePath("/treinamentos");
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Treinamentos e Autonomia Operacional
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Projeto: <strong>{project.name}</strong>  |  Capacitação prática por módulo e avaliação individual de servidores
          </p>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Índice Geral de Autonomia</div>
          <div className="text-2xl font-bold text-centi-800 mt-1">{autonomyIndex.displayText}</div>
          <p className="text-[11px] text-slate-500 mt-1">Servidores autônomos em processos críticos</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Treinamentos Realizados</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {completedTrainings} / {totalTrainings}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Sessões teóricas e práticas concluídas</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Taxa de Presença Média</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{attendanceRate}%</div>
          <p className="text-[11px] text-slate-500 mt-1">{presentCount} presenças confirmadas</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Servidores Mapeados</div>
          <div className="text-2xl font-bold text-blue-700 mt-1">
            {municipalPersons.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Pontos focais no município</p>
        </div>
      </div>

      {/* Grid: Lista de Treinamentos & Novo Treinamento */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Treinamentos */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-centi-800" />
              Sessões de Capacitação Agendadas e Realizadas
            </span>
          </h2>

          <div className="space-y-4">
            {project.trainings.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4 text-center">
                Nenhum treinamento registrado neste projeto.
              </p>
            ) : (
              project.trainings.map((tr) => (
                <div key={tr.id} className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{tr.subject}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">
                          {tr.moduleCode}
                        </span>
                        <StatusBadge status={tr.status} />
                      </div>
                      {tr.objectives && <p className="text-xs text-slate-600 mt-1">{tr.objectives}</p>}
                    </div>

                    <div className="text-right text-xs">
                      <span className="font-bold text-slate-900">
                        {new Date(tr.scheduledDate).toLocaleDateString("pt-BR")}
                      </span>
                      <p className="text-[10px] text-slate-500">{tr.durationMinutes} minutos</p>
                    </div>
                  </div>

                  {/* Detalhes de Participação e Notas */}
                  <div className="pt-2 border-t border-slate-200 text-xs">
                    <div className="font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Lista de Presença & Nota Prática:</span>
                      <span className="text-[11px] text-slate-500 font-normal">
                        Instrutor: {tr.instructorName}
                      </span>
                    </div>

                    {tr.attendances.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic">Nenhum servidor vinculado ainda.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-[11px] border border-slate-200 rounded bg-white">
                          <thead className="bg-slate-100 text-slate-600">
                            <tr>
                              <th className="p-1.5">Servidor Municipal</th>
                              <th className="p-1.5">Presença</th>
                              <th className="p-1.5">Nota Prática (0 a 10)</th>
                              <th className="p-1.5">Observações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {tr.attendances.map((att) => (
                              <tr key={att.id}>
                                <td className="p-1.5 font-medium text-slate-900">{att.person.name}</td>
                                <td className="p-1.5">
                                  {att.isPresent ? (
                                    <span className="text-emerald-700 font-bold">✓ Presente</span>
                                  ) : (
                                    <span className="text-red-600 font-medium">Ausente</span>
                                  )}
                                </td>
                                <td className="p-1.5 font-bold text-slate-900">
                                  {att.evaluationScore !== null ? att.evaluationScore.toFixed(1) : "-"}
                                </td>
                                <td className="p-1.5 text-slate-500">{att.notes || "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Formulário Rápido de Presença */}
                    <form action={recordAttendanceAction} className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
                      <input type="hidden" name="trainingId" value={tr.id} />
                      <select name="personId" required className="p-1.5 border border-slate-300 rounded text-xs">
                        <option value="">Selecione o servidor...</option>
                        {municipalPersons.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.roleTitle || "Servidor"})
                          </option>
                        ))}
                      </select>

                      <select name="isPresent" className="p-1.5 border border-slate-300 rounded text-xs">
                        <option value="true">Presente</option>
                        <option value="false">Ausente</option>
                      </select>

                      <input
                        type="number"
                        name="evaluationScore"
                        step="0.1"
                        min="0"
                        max="10"
                        placeholder="Nota (0-10)"
                        className="w-24 p-1.5 border border-slate-300 rounded text-xs"
                      />

                      <button
                        type="submit"
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-semibold"
                      >
                        Lançar
                      </button>
                    </form>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Form para Cadastrar Novo Treinamento */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
            <Plus className="w-4 h-4 text-centi-800" />
            Programar Novo Treinamento
          </h2>

          <form action={createTrainingAction} className="space-y-3 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Módulo / Tema</label>
              <input
                type="text"
                name="subject"
                required
                placeholder="Ex: Folha de Pagamento - eSocial e Rescisões"
                className="w-full p-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Código Módulo</label>
                <input
                  type="text"
                  name="moduleCode"
                  placeholder="Ex: RH-01"
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Duração (minutos)</label>
                <input
                  type="number"
                  name="durationMinutes"
                  defaultValue={120}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Data e Hora da Sessão</label>
              <input
                type="datetime-local"
                name="scheduledDate"
                required
                className="w-full p-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Instrutor Especialista</label>
              <input
                type="text"
                name="instructorName"
                defaultValue="Especialista de Folha Centi"
                className="w-full p-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Local / Sala</label>
              <input
                type="text"
                name="location"
                defaultValue="Sala de Treinamentos da Prefeitura"
                className="w-full p-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Objetivos de Aprendizagem</label>
              <textarea
                name="objectives"
                rows={2}
                placeholder="Capacitar o operador a gerar a folha sem apoio..."
                className="w-full p-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-centi-800 hover:bg-centi-900 text-white rounded-lg font-bold shadow-xs"
            >
              Criar Treinamento
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
