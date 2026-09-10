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

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Diário de Campo da Implantação
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Projeto: <strong>{project.name}</strong>  |  Registro diário fidedigno de atividades executadas e intercorrências
          </p>
        </div>
      </div>

      {/* Grid: Entradas & Novo Registro */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Registros do Diário */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-centi-800" />
                Histórico de Entradas
              </h2>
              <span className="text-xs text-slate-500">{project.diaries.length} registro(s)</span>
            </div>

            <div className="space-y-4">
              {project.diaries.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4 text-center">
                  Nenhuma entrada no diário de campo registrada ainda.
                </p>
              ) : (
                project.diaries.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 hover:border-slate-300 transition-colors shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">{entry.activity}</span>
                          {entry.department && (
                            <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-blue-50 text-blue-800">
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
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {new Date(entry.entryDate).toLocaleDateString("pt-BR")}
                          </span>
                          <span className="flex items-center gap-1">
                            <UserCheck className="w-3 h-3 text-slate-400" />
                            {entry.author.name}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-xs space-y-2 text-slate-700 bg-slate-50/50 p-3 rounded-lg border border-slate-100">
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
                        <div className="text-amber-900 bg-amber-50/60 p-2 rounded border border-amber-100">
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

                    {/* Botões de Ação na Entrada */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      {entry.status === "RASCUNHO" && (
                        <form action={publishDiaryAction}>
                          <input type="hidden" name="entryId" value={entry.id} />
                          <button
                            type="submit"
                            className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[11px] font-bold"
                          >
                            ✓ Publicar Diário
                          </button>
                        </form>
                      )}

                      <form action={convertToIssueAction}>
                        <input type="hidden" name="entryId" value={entry.id} />
                        <button
                          type="submit"
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded text-[11px] font-bold flex items-center gap-1"
                        >
                          <Zap className="w-3 h-3 text-amber-300" />
                          Gerar Pendência
                        </button>
                      </form>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Form para Nova Entrada no Diário */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
            <Plus className="w-4 h-4 text-centi-800" />
            Nova Entrada no Diário
          </h2>

          <form action={createDiaryAction} className="space-y-3 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Data da Atividade</label>
              <input
                type="date"
                name="entryDate"
                required
                defaultValue={new Date().toISOString().split("T")[0]}
                className="w-full p-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Departamento / Setor</label>
              <select name="departmentId" className="w-full p-2 border border-slate-300 rounded-lg text-xs">
                <option value="">Geral / Sem setor específico</option>
                {allDepartments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Atividade Realizada</label>
              <input
                type="text"
                name="activity"
                required
                placeholder="Ex: Treinamento e saneamento do saldo contábil..."
                className="w-full p-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Conteúdo Trabalhado</label>
              <textarea
                name="workedContent"
                required
                rows={3}
                placeholder="Detalhes dos procedimentos efetuados..."
                className="w-full p-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Resultado Observado</label>
              <textarea
                name="resultObserved"
                rows={2}
                placeholder="O que funcionou com sucesso..."
                className="w-full p-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Achados, Dúvidas e Dificuldades</label>
              <textarea
                name="findings"
                rows={2}
                placeholder="Resistências, inconsistências em planilhas ou dados..."
                className="w-full p-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Próximos Passos</label>
              <input
                type="text"
                name="nextSteps"
                placeholder="Atividades previstas para o dia seguinte..."
                className="w-full p-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div className="flex items-center gap-4 py-1">
              <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                <input type="checkbox" name="publishNow" value="true" defaultChecked className="rounded" />
                Publicar imediatamente
              </label>

              <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                <input type="checkbox" name="isInternal" value="true" className="rounded" />
                Uso interno Centi
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-centi-800 hover:bg-centi-900 text-white rounded-lg font-bold shadow-xs"
            >
              Gravar no Diário
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
