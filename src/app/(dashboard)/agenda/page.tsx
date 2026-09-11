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

import { WeeklyPlanner } from "@/components/agenda/WeeklyPlanner";

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

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Agenda e Rituais Operacionais
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Projeto: <strong>{project.name}</strong> | Planejamento semanal, reuniões, treinamentos, visitas e rituais de campo
          </p>
        </div>
      </div>

      {/* Rituais Diários de Campo (Compacto) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
        <div className="flex items-center gap-2 font-bold text-slate-700 text-xs">
          <Clock className="w-4 h-4 text-emerald-700" />
          <span>Rituais Diários de Campo:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200">
            <Sunrise className="w-3.5 h-3.5 text-amber-600" />
            <span><strong>08:00</strong> Daily Centi (Alinhamento)</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200">
            <Sun className="w-3.5 h-3.5 text-emerald-700" />
            <span><strong>12:00</strong> Checkpoint (Prefeitura)</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-900 border border-purple-200">
            <Sunset className="w-3.5 h-3.5 text-purple-600" />
            <span><strong>17:00</strong> Diário & Pendências</span>
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

      {/* Planner Semanal Interativo (Colunas Segunda a Sexta-feira & Lista) */}
      <WeeklyPlanner
        projectId={project.id}
        events={project.agendaEvents}
        defaultResponsibleName={user?.name || "Líder de Implantação"}
      />
    </div>
  );
}
