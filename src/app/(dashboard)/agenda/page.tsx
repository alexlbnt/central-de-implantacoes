import React from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/server-session";
import prisma from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Sun,
  Sunset,
  Sunrise,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default async function AgendaPage({
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
      agendaEvents: {
        orderBy: { startDateTime: "asc" },
      },
    },
  });

  if (!project) {
    return <div className="p-8 text-center text-slate-600">Nenhum projeto encontrado.</div>;
  }

  // Detector de Conflitos de Agenda
  const conflicts: Array<{ event1: any; event2: any; reason: string }> = [];
  const events = project.agendaEvents;

  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const e1 = events[i];
      const e2 = events[j];

      const overlap = e1.startDateTime < e2.endDateTime && e1.endDateTime > e2.startDateTime;
      if (overlap) {
        if (e1.responsibleName && e2.responsibleName && e1.responsibleName.toLowerCase() === e2.responsibleName.toLowerCase()) {
          conflicts.push({
            event1: e1,
            event2: e2,
            reason: `Responsável '${e1.responsibleName}' alocado em dois eventos simultâneos.`,
          });
        } else if (e1.location && e2.location && e1.location === e2.location && e1.location !== "Remoto") {
          conflicts.push({
            event1: e1,
            event2: e2,
            reason: `Local '${e1.location}' reservado para dois eventos simultâneos.`,
          });
        }
      }
    }
  }

  // Server Action: Criar Evento
  async function createEventAction(formData: FormData) {
    "use server";
    const title = formData.get("title") as string;
    const type = formData.get("type") as string;
    const date = formData.get("date") as string;
    const startTime = formData.get("startTime") as string;
    const endTime = formData.get("endTime") as string;
    const location = formData.get("location") as string;
    const responsibleName = formData.get("responsibleName") as string;
    const participants = formData.get("participants") as string;
    const notes = formData.get("notes") as string;

    if (!title || !date || !startTime || !endTime) return;

    const startDateTime = new Date(`${date}T${startTime}:00`);
    const endDateTime = new Date(`${date}T${endTime}:00`);

    await prisma.agendaEvent.create({
      data: {
        projectId: project!.id,
        title,
        type: type || "REUNIAO_GOVERNANCA",
        startDateTime,
        endDateTime,
        location: location || "Presencial / Gabinete",
        responsibleName: responsibleName || "Líder de Implantação",
        participants,
        notes,
      },
    });

    revalidatePath("/agenda");
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Agenda e Rituais Operacionais
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Projeto: <strong>{project.name}</strong>  |  Cronograma de reuniões, treinamentos, visitas e rituais diários
          </p>
        </div>
      </div>

      {/* Rituais Diários Centi */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Rituais Obrigatórios de Campo (Centi NOP 001/2026)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <Sunrise className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">08:00 - Alinhamento Matinal (Daily Centi)</div>
              <p className="text-[11px] text-slate-500 mt-1">
                Alinhamento interno de 15 min: metas prioritárias do dia, desbloqueio de acessos e mitigação de impedimentos.
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">12:00 - Checkpoint Intermediário</div>
              <p className="text-[11px] text-slate-500 mt-1">
                Verificação de entregas com os pontos focais da prefeitura. Desbloqueio de dados legados e assinaturas pendentes.
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-start gap-3">
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <Sunset className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">17:00 - Fechamento & Diário de Campo</div>
              <p className="text-[11px] text-slate-500 mt-1">
                Consolidação dos testes realizados, registro formal no diário de campo e atualização do quadro de pendências.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Alerta de Conflito de Agenda (se houver) */}
      {conflicts.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            Atenção: Identificados {conflicts.length} conflito(s) de alocação de agenda!
          </div>
          <ul className="text-xs text-amber-800 pl-4 space-y-1">
            {conflicts.map((c, i) => (
              <li key={i} className="list-disc">
                <strong>{c.event1.title}</strong> e <strong>{c.event2.title}</strong>: {c.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Grid: Calendário de Eventos & Agendamento */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Eventos Agendados */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-centi-800" />
              Eventos Programados
            </span>
            <span className="text-xs text-slate-500 font-normal">
              {events.length} compromisso(s) registrados
            </span>
          </h2>

          <div className="space-y-3">
            {events.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4 text-center">
                Nenhum evento agendado para este projeto.
              </p>
            ) : (
              events.map((ev) => (
                <div
                  key={ev.id}
                  className="p-3.5 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors space-y-2 bg-white"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{ev.title}</span>
                        <StatusBadge status={ev.type} />
                      </div>
                      {ev.notes && <p className="text-xs text-slate-600 mt-0.5">{ev.notes}</p>}
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-900">
                        {new Date(ev.startDateTime).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {new Date(ev.startDateTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} às{" "}
                      {new Date(ev.endDateTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </span>

                    {ev.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {ev.location}
                      </span>
                    )}

                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      Resp: {ev.responsibleName}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Form para Agendar Evento */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
            <Plus className="w-4 h-4 text-centi-800" />
            Agendar Novo Evento
          </h2>

          <form action={createEventAction} className="space-y-3 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Título do Evento</label>
              <input
                type="text"
                name="title"
                required
                placeholder="Ex: Treinamento Módulo Folha..."
                className="w-full p-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Tipo de Evento</label>
              <select name="type" className="w-full p-2 border border-slate-300 rounded-lg text-xs">
                <option value="TREINAMENTO">Treinamento</option>
                <option value="REUNIAO_GOVERNANCA">Reunião de Governança</option>
                <option value="TESTE">Teste de Homologação / Autonomia</option>
                <option value="VISITA_CAMPO">Visita de Campo</option>
                <option value="RITUAL">Ritual Diário</option>
                <option value="MARCO">Marco Contratual</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Data</label>
              <input
                type="date"
                name="date"
                required
                defaultValue={new Date().toISOString().split("T")[0]}
                className="w-full p-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Horário Início</label>
                <input
                  type="time"
                  name="startTime"
                  required
                  defaultValue="09:00"
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Horário Fim</label>
                <input
                  type="time"
                  name="endTime"
                  required
                  defaultValue="11:00"
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Local / Sala</label>
              <input
                type="text"
                name="location"
                defaultValue="Gabinete / Sala de Treinamentos"
                className="w-full p-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Responsável Centi</label>
              <input
                type="text"
                name="responsibleName"
                defaultValue="Líder de Implantação"
                className="w-full p-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Observações / Pauta</label>
              <textarea
                name="notes"
                rows={2}
                placeholder="Detalhes ou requisitos..."
                className="w-full p-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-centi-800 hover:bg-centi-900 text-white rounded-lg font-bold shadow-xs"
            >
              Agendar no Calendário
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
