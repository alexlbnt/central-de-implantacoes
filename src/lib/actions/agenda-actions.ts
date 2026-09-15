"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/server-session";
import prisma from "@/lib/db/prisma";
import { parseDateTimeInAppTimezone } from "@/lib/date-utils";

export async function createAgendaEventAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Não autenticado: Faça login para agendar eventos.");
  }

  const projectId = formData.get("projectId") as string;
  if (!projectId) {
    throw new Error("Identificador do projeto é obrigatório.");
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: user.organizationId },
  });
  if (!project) {
    throw new Error("Projeto não encontrado ou não pertence à sua organização.");
  }

  const title = (formData.get("title") as string)?.trim();
  const type = (formData.get("type") as string) || "REUNIAO_GOVERNANCA";
  const date = (formData.get("date") as string)?.trim();
  const startTime = (formData.get("startTime") as string)?.trim();
  const endTime = (formData.get("endTime") as string)?.trim();
  const location = (formData.get("location") as string)?.trim() || "Presencial / Gabinete";
  const responsibleName = (formData.get("responsibleName") as string)?.trim() || user.name;
  const participants = (formData.get("participants") as string)?.trim() || null;
  const notes = (formData.get("notes") as string)?.trim() || null;

  if (!title) {
    throw new Error("O título do compromisso é obrigatório.");
  }
  if (!date || !startTime || !endTime) {
    throw new Error("Data, horário de início e horário de término são obrigatórios.");
  }

  const startDateTime = parseDateTimeInAppTimezone(date, startTime);
  const endDateTime = parseDateTimeInAppTimezone(date, endTime);

  if (endDateTime <= startDateTime) {
    throw new Error("O horário de término deve ser posterior ao horário de início.");
  }

  const event = await prisma.agendaEvent.create({
    data: {
      projectId,
      title,
      type,
      startDateTime,
      endDateTime,
      location,
      responsibleName,
      participants,
      notes,
    },
  });

  revalidatePath("/agenda");
  revalidatePath("/");
  return { success: true, eventId: event.id };
}

export async function deleteAgendaEventAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Não autenticado: Faça login para remover eventos.");
  }

  const eventId = formData.get("eventId") as string;

  if (!eventId) {
    throw new Error("Identificador do evento é obrigatório.");
  }

  const existing = await prisma.agendaEvent.findUnique({
    where: { id: eventId },
    include: { project: true },
  });

  if (!existing) {
    throw new Error("Evento não encontrado.");
  }

  if (existing.project && existing.project.organizationId !== user.organizationId) {
    throw new Error("Acesso não autorizado para excluir este compromisso.");
  }

  await prisma.agendaEvent.delete({
    where: { id: eventId },
  });

  revalidatePath("/agenda");
  revalidatePath("/");
  return { success: true };
}

export async function updateAgendaEventAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Não autenticado: Faça login para editar eventos.");
  }

  const eventId = formData.get("eventId") as string;
  if (!eventId) {
    throw new Error("Identificador do evento é obrigatório.");
  }

  const existing = await prisma.agendaEvent.findUnique({
    where: { id: eventId },
    include: { project: true },
  });

  if (!existing) {
    throw new Error("Evento não encontrado.");
  }

  if (existing.project && existing.project.organizationId !== user.organizationId) {
    throw new Error("Acesso não autorizado para editar este compromisso.");
  }

  const title = (formData.get("title") as string)?.trim();
  const type = (formData.get("type") as string) || existing.type;
  const date = (formData.get("date") as string)?.trim();
  const startTime = (formData.get("startTime") as string)?.trim();
  const endTime = (formData.get("endTime") as string)?.trim();
  const location = (formData.get("location") as string)?.trim() || "Presencial / Gabinete";
  const responsibleName = (formData.get("responsibleName") as string)?.trim() || user.name;
  const participants = (formData.get("participants") as string)?.trim() || null;
  const notes = (formData.get("notes") as string)?.trim() || null;

  if (!title) {
    throw new Error("O título do compromisso é obrigatório.");
  }
  if (!date || !startTime || !endTime) {
    throw new Error("Data, horário de início e horário de término são obrigatórios.");
  }

  const startDateTime = parseDateTimeInAppTimezone(date, startTime);
  const endDateTime = parseDateTimeInAppTimezone(date, endTime);

  if (endDateTime <= startDateTime) {
    throw new Error("O horário de término deve ser posterior ao horário de início.");
  }

  const updated = await prisma.agendaEvent.update({
    where: { id: eventId },
    data: {
      title,
      type,
      startDateTime,
      endDateTime,
      location,
      responsibleName,
      participants,
      notes,
    },
  });

  revalidatePath("/agenda");
  revalidatePath("/");
  return { success: true, eventId: updated.id };
}

