"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/server-session";
import prisma from "@/lib/db/prisma";
import { recalculateDepartmentOperationalStatus } from "@/lib/domain/operational-status";
import { IssuePriority, IssueStatus, IssueType } from "@prisma/client";

/**
 * Cria uma nova pendência ou ação de campo.
 */
export async function createIssueAction(formData: FormData) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error("Não autenticado: Faça login para registrar pendências.");
  }

  const projectId = (formData.get("projectId") as string)?.trim();
  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim();
  const departmentIdRaw = (formData.get("departmentId") as string)?.trim();
  const priorityRaw = formData.get("priority") as IssuePriority;
  const typeRaw = formData.get("type") as IssueType;
  const isOperationalBlocker = formData.get("isOperationalBlocker") === "true";
  const dueDateRaw = (formData.get("dueDate") as string)?.trim();
  const nextAction = (formData.get("nextAction") as string)?.trim() || null;

  if (!projectId) {
    throw new Error("Identificador do projeto é obrigatório.");
  }
  if (!title) {
    throw new Error("O título da pendência é obrigatório.");
  }

  // Verifica pertencimento do projeto à organização do usuário
  const project = await prisma.project.findFirst({
    where: { id: projectId, ...(currentUser.role === "ADMIN_GERAL" ? {} : { organizationId: currentUser.organizationId }) },
  });
  if (!project) {
    throw new Error("Projeto não encontrado ou acesso não autorizado.");
  }

  const departmentId = departmentIdRaw && departmentIdRaw !== "" ? departmentIdRaw : null;

  // Próximo número sequencial seguro (evita colisão de chave única @@unique([projectId, codeNumber]))
  const lastIssue = await prisma.issue.findFirst({
    where: { projectId },
    orderBy: { codeNumber: "desc" },
    select: { codeNumber: true },
  });
  const codeNumber = (lastIssue?.codeNumber ?? 0) + 1;

  const created = await prisma.issue.create({
    data: {
      projectId,
      codeNumber,
      title,
      description: description || title,
      departmentId,
      priority: priorityRaw || IssuePriority.MEDIA,
      type: typeRaw || IssueType.DUVIDA,
      isOperationalBlocker,
      authorId: currentUser.id,
      dueDate: dueDateRaw ? new Date(dueDateRaw) : null,
      nextAction,
    },
  });

  // Se a pendência é um bloqueador operacional vinculado a um departamento, recalcula o status do setor
  if (isOperationalBlocker && created.departmentId) {
    await recalculateDepartmentOperationalStatus(created.departmentId);
  }

  // Registra trilha de auditoria
  await prisma.auditLog.create({
    data: {
      organizationId: currentUser.organizationId,
      projectId,
      actorId: currentUser.id,
      actorName: currentUser.name,
      action: "CREATE",
      targetType: "Issue",
      targetId: created.id,
      changedFields: JSON.stringify({
        codeNumber,
        title,
        priority: created.priority,
        isOperationalBlocker,
        departmentId,
      }),
      justification: "Registro de nova pendência / ação de campo",
    },
  });

  revalidatePath("/pendencias");
  revalidatePath("/departamentos");
  revalidatePath("/");
}

/**
 * Atualiza o status de uma pendência (ex: ABERTA -> EM_EXECUCAO -> CONCLUIDA).
 */
export async function updateIssueStatusAction(formData: FormData) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error("Não autenticado: Faça login para atualizar pendências.");
  }

  const issueId = (formData.get("issueId") as string)?.trim();
  const newStatus = (formData.get("status") as IssueStatus);

  if (!issueId || !newStatus) {
    throw new Error("Identificador da pendência e novo status são obrigatórios.");
  }

  const existingIssue = await prisma.issue.findUnique({
    where: { id: issueId },
    include: { project: true },
  });

  if (!existingIssue) {
    throw new Error("Pendência não encontrada.");
  }

  const isResolved = newStatus === IssueStatus.CONCLUIDA;

  const updatedIssue = await prisma.issue.update({
    where: { id: issueId },
    data: {
      status: newStatus,
      resolvedAt: isResolved ? new Date() : null,
      resolvedBy: isResolved ? currentUser.name : null,
      version: { increment: 1 },
    },
  });

  // Registra histórico de mudança de status
  await prisma.issueStatusHistory.create({
    data: {
      issueId,
      fromStatus: existingIssue.status,
      toStatus: newStatus,
      changedBy: currentUser.name,
    },
  });

  // Se a pendência for ou era um bloqueador de setor, recalcula o status do departamento
  if (updatedIssue.isOperationalBlocker && updatedIssue.departmentId) {
    await recalculateDepartmentOperationalStatus(updatedIssue.departmentId);
  }

  revalidatePath("/pendencias");
  revalidatePath("/departamentos");
  revalidatePath("/");
}
