import React from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/server-session";
import prisma from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import {
  FileText,
  Plus,
  CheckCircle2,
  Calendar,
  UserCheck,
  Building2,
  ArrowRight,
  Zap,
  Lock,
  Eye,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ModuleNavTabs } from "@/components/layout/ModuleNavTabs";
import { NewDiaryEntryModal } from "@/components/diario/NewDiaryEntryModal";

export default async function DiarioCampoPage({
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
          departments: true,
        },
      },
      diaries: {
        include: {
          author: true,
          department: true,
        },
        orderBy: { entryDate: "desc" },
      },
    },
  });

  if (!project) {
    return <div className="p-8 text-center text-slate-600">Nenhum projeto encontrado.</div>;
  }

  const allDepartments = project.entities.flatMap((e) => e.departments);

  // Server Action: Criar Entrada no Diário de Campo
  async function createDiaryAction(formData: FormData) {
    "use server";
    const departmentId = formData.get("departmentId") as string;
    const entryDateRaw = formData.get("entryDate") as string;
    const activity = formData.get("activity") as string;
    const workedContent = formData.get("workedContent") as string;
    const resultObserved = formData.get("resultObserved") as string;
    const findings = formData.get("findings") as string;
    const nextSteps = formData.get("nextSteps") as string;
    const isInternal = formData.get("isInternal") === "true";
    const publishNow = formData.get("publishNow") === "true";

    if (!activity || !workedContent) return;

    await prisma.diaryEntry.create({
      data: {
        projectId: project!.id,
        departmentId: departmentId || null,
        authorId: user!.id,
        entryDate: entryDateRaw ? new Date(entryDateRaw) : new Date(),
        activity,
        workedContent,
        resultObserved: resultObserved || "Atividade executada conforme planejamento.",
        findings,
        nextSteps,
        isInternal,
        status: publishNow ? "PUBLICADO" : "RASCUNHO",
      },
    });

    revalidatePath("/diario");
  }

  // Server Action: Publicar Diário
  async function publishDiaryAction(formData: FormData) {
    "use server";
    const entryId = formData.get("entryId") as string;

    await prisma.diaryEntry.update({
      where: { id: entryId },
      data: { status: "PUBLICADO" },
    });

    revalidatePath("/diario");
  }

  // Server Action: Converter Apontamento do Diário em Pendência
  async function convertToIssueAction(formData: FormData) {
    "use server";
    const entryId = formData.get("entryId") as string;

    const entry = await prisma.diaryEntry.findUnique({
      where: { id: entryId },
      include: { department: true },
    });
    if (!entry) return;

    const lastIssue = await prisma.issue.findFirst({
      where: { projectId: project!.id },
      orderBy: { codeNumber: "desc" },
    });
    const nextCode = (lastIssue?.codeNumber || 0) + 1;

    const defaultUser = user || (await prisma.user.findFirst());
    await prisma.issue.create({
      data: {
        projectId: project!.id,
        departmentId: entry.departmentId,
        authorId: defaultUser!.id,
        codeNumber: nextCode,
        title: `[DIÁRIO] ${entry.activity}`,
        description: `Origem: Diário de Campo de ${entry.entryDate.toLocaleDateString("pt-BR")}.\n\nConteúdo Trabalhado:\n${entry.workedContent}\n\nAchados e Dificuldades:\n${entry.findings || "Não especificados"}\n\nPróximos Passos:\n${entry.nextSteps || "Não especificados"}`,
        type: "DUVIDA",
        priority: "ALTA",
        status: "ABERTA",
        isOperationalBlocker: false,
      },
    });

    revalidatePath("/diario");
    revalidatePath("/pendencias");
  }

  const totalEntries = project.diaries.length;
  const publishedCount = project.diaries.filter((d) => d.status === "PUBLICADO").length;
  const draftCount = project.diaries.filter((d) => d.status === "RASCUNHO").length;
  const coveredDepartmentsCount = new Set(project.diaries.map((d) => d.departmentId).filter(Boolean)).size;

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Diário de Campo da Implantação
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Projeto: <strong>{project.name}</strong> &bull; Registro fidedigno de atividades executadas e intercorrências
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NewDiaryEntryModal departments={allDepartments} createAction={createDiaryAction} />
        </div>
      </div>

      {/* Navegação contextual do módulo */}
      <ModuleNavTabs module="rotina" />

      {/* Métricas do Diário de Campo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Registrado</div>
          <div className="text-2xl font-bold text-slate-900 mt-0.5">{totalEntries}</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Publicados</div>
          <div className="text-2xl font-bold text-centi-800 mt-0.5">{publishedCount}</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Rascunhos</div>
          <div className="text-2xl font-bold text-amber-700 mt-0.5">{draftCount}</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Setores Cobertos</div>
          <div className="text-2xl font-bold text-slate-900 mt-0.5">{coveredDepartmentsCount} / {allDepartments.length}</div>
        </div>
      </div>

      {/* Linha do Tempo de Apontamentos (Full Width) */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-centi-800" />
            <h2 className="text-sm font-bold text-slate-900">Histórico Cronológico de Atividades</h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">{project.diaries.length} apontamento(s)</span>
        </div>

        <div className="space-y-4">
          {project.diaries.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">Nenhum apontamento registrado ainda</p>
              <p className="text-xs text-slate-400 mt-1">Utilize o botão &quot;Novo Apontamento&quot; acima para registrar a primeira atividade de campo.</p>
            </div>
          ) : (
            project.diaries.map((entry) => (
              <div
                key={entry.id}
                className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 hover:border-slate-300 transition-colors shadow-2xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{entry.activity}</span>
                      {entry.department && (
                        <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-centi-100 text-centi-900 border border-centi-300">
                          {entry.department.name}
                        </span>
                      )}
                      <StatusBadge status={entry.status} />
                      {entry.isInternal && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                          Interno Centi
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(entry.entryDate).toLocaleDateString("pt-BR")}
                      </span>
                      <span className="flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                        {entry.author.name}
                      </span>
                    </div>
                  </div>

                  {/* Botões de Ação na Entrada */}
                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    {entry.status === "RASCUNHO" && (
                      <form action={publishDiaryAction}>
                        <input type="hidden" name="entryId" value={entry.id} />
                        <button
                          type="submit"
                          className="px-2.5 py-1 bg-centi-800 hover:bg-centi-900 text-white rounded text-[11px] font-bold transition-colors shadow-2xs"
                        >
                          ✓ Publicar
                        </button>
                      </form>
                    )}

                    <form action={convertToIssueAction}>
                      <input type="hidden" name="entryId" value={entry.id} />
                      <button
                        type="submit"
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded text-[11px] font-bold flex items-center gap-1 shadow-2xs"
                      >
                        <Zap className="w-3 h-3 text-amber-300" />
                        Gerar Pendência
                      </button>
                    </form>
                  </div>
                </div>

                <div className="text-xs space-y-2 text-slate-700 bg-slate-50/70 p-3.5 rounded-lg border border-slate-100">
                  <div>
                    <strong className="text-slate-900">Conteúdo Trabalhado: </strong>
                    {entry.workedContent}
                  </div>

                  {entry.resultObserved && (
                    <div>
                      <strong className="text-slate-900">Resultado Observado: </strong>
                      {entry.resultObserved}
                    </div>
                  )}

                  {entry.findings && (
                    <div className="text-amber-900 bg-amber-50/70 p-2 rounded border border-amber-200">
                      <strong>Intercorrências / Achados: </strong>
                      {entry.findings}
                    </div>
                  )}

                  {entry.nextSteps && (
                    <div>
                      <strong className="text-slate-900">Próximos Passos: </strong>
                      {entry.nextSteps}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
