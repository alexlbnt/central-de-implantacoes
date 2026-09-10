import React from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/server-session";
import prisma from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { FileSpreadsheet, Plus, Download, FileText, CheckCircle2, Shield } from "lucide-react";

export default async function GovernancaPage({
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
      meetings: {
        include: {
          snapshot: true,
          decisions: { include: { tasks: true } },
        },
        orderBy: { meetingDate: "desc" },
      },
    },
  });

  if (!project) {
    return <div className="p-8 text-center text-slate-600">Nenhum projeto selecionado.</div>;
  }

  // Server Action para Criar Ata Semanal
  async function createMeetingAction(formData: FormData) {
    "use server";
    const meetingDateRaw = formData.get("meetingDate") as string;
    const startTime = (formData.get("startTime") as string) || "09:00";
    const endTime = (formData.get("endTime") as string) || "10:30";
    const location = (formData.get("location") as string) || "Gabinete / Remoto";
    const executionLeader = (formData.get("executionLeader") as string) || "Líder de Implantação Centi";
    const section1 = formData.get("section1") as string;
    const section2 = formData.get("section2") as string;
    const section3 = formData.get("section3") as string;
    const section5 = formData.get("section5") as string;

    await prisma.meeting.create({
      data: {
        projectId: project!.id,
        meetingDate: new Date(meetingDateRaw),
        startTime,
        endTime,
        location,
        executionLeader,
        participantsCenti: "Líder de Implantação; Business Analyst; QA",
        participantsClient: "Secretário Municipal; Coordenador de TI; Gestores Setoriais",
        section1ScheduleStatus: section1 || "Evolução do cronograma semanal conforme previsto.",
        section2CriticalPoints: section2 || "Sem pontos críticos impeditivos registrados.",
        section3StrategicRealignments: section3 || "Manter cronograma de homologação e testes de autonomia.",
        section5GeneralSafeguards: section5 || "Salvaguardas técnicas da Centi Soluções.",
        status: "RASCUNHO",
      },
    });

    revalidatePath("/governanca");
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Governança Semanal e Atas Oficiais
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Projeto: <strong>{project.name}</strong>  |  Modelo Corporativo Centi Soluções (NOP 001/2026).
          </p>
        </div>
      </div>

      {/* Formulário Rápido de Criação de Ata */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Plus className="w-4 h-4 text-centi-800" />
          Abertura de Nova Ata Semanal de Governança
        </h2>

        <form action={createMeetingAction} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Data da Reunião</label>
            <input
              type="date"
              name="meetingDate"
              required
              defaultValue={new Date().toISOString().split("T")[0]}
              className="w-full p-2 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Horário (Início às Término)</label>
            <div className="flex items-center gap-1">
              <input
                type="text"
                name="startTime"
                defaultValue="09:00"
                className="w-full p-2 border border-slate-300 rounded-lg text-xs"
              />
              <span className="text-slate-400">às</span>
              <input
                type="text"
                name="endTime"
                defaultValue="10:30"
                className="w-full p-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Local / Canal</label>
            <input
              type="text"
              name="location"
              defaultValue="Prefeitura e Sala Virtual (Teams)"
              className="w-full p-2 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Responsável pela Execução</label>
            <input
              type="text"
              name="executionLeader"
              defaultValue={user?.name || "Líder de Implantação"}
              className="w-full p-2 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-4 flex justify-end pt-2">
            <button
              type="submit"
              className="py-2 px-4 bg-centi-900 hover:bg-centi-950 text-white rounded-lg font-medium text-xs shadow-xs"
            >
              Criar Rascunho da Ata
            </button>
          </div>
        </form>
      </div>

      {/* Lista de Atas */}
      <div className="space-y-4">
        {project.meetings.map((meeting) => (
          <div
            key={meeting.id}
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <Link
                  href={`/governanca/${meeting.id}`}
                  className="font-bold text-sm text-slate-900 hover:text-centi-800"
                >
                  {meeting.title}
                </Link>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                    meeting.status === "EMITIDA" || meeting.status === "ASSINADA"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                      : "bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  {meeting.status}
                </span>

                {meeting.snapshot && (
                  <span className="text-[11px] text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded">
                    Snapshot Congelado v{meeting.versionNumber}
                  </span>
                )}
              </div>

              <div className="text-xs text-slate-500 flex items-center gap-3">
                <span>Data: <strong className="text-slate-700">{meeting.meetingDate.toLocaleDateString("pt-BR")}</strong></span>
                <span>Horário: <strong className="text-slate-700">{meeting.startTime} às {meeting.endTime}</strong></span>
                <span>Local: <strong className="text-slate-700">{meeting.location}</strong></span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`/governanca/${meeting.id}`}
                className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors"
              >
                Abrir / Editar
              </Link>

              {/* Botão de Download DOCX */}
              <a
                href={`/api/exports/docx/${meeting.id}`}
                download
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-centi-900 hover:bg-centi-950 text-white text-xs font-semibold transition-colors shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar DOCX</span>
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
