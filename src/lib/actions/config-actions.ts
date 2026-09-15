"use server";

import prisma from "@/lib/db/prisma";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { getCurrentUser, getCurrentUserContext } from "@/lib/auth/server-session";
import { AuthGuard } from "@/lib/auth/auth-guards";
import { UserRole } from "@prisma/client";

/**
 * Server Action para Adicionar Feriado Municipal
 */
export async function addHolidayAction(formData: FormData) {
  const currentUser = await getCurrentUser();
  const context = await getCurrentUserContext();
  if (!currentUser || !context) {
    throw new Error("Não autenticado.");
  }

  const projectId = formData.get("projectId") as string;
  const dateRaw = formData.get("date") as string;
  const description = (formData.get("description") as string)?.trim();

  if (!projectId || !dateRaw || !description) {
    throw new Error("Preencha todos os campos obrigatórios do feriado.");
  }

  const access = AuthGuard.canAccessProject(context, projectId);
  if (!access.allowed) {
    throw new Error(access.reason || "Acesso negado a este projeto.");
  }

  const isProjectLeader = context.projectMemberships.some(
    (m) => m.projectId === projectId && m.role === UserRole.LIDER_PROJETO
  );
  if (currentUser.role !== UserRole.ADMIN_GERAL && !isProjectLeader) {
    throw new Error("Apenas o Administrador Geral ou o Líder do Projeto podem cadastrar feriados municipais.");
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new Error("Projeto não encontrado.");
  }

  const holidayDate = new Date(dateRaw);
  if (isNaN(holidayDate.getTime())) {
    throw new Error("Data de feriado inválida.");
  }

  await prisma.holidayCalendar.upsert({
    where: {
      projectId_date: {
        projectId: project.id,
        date: holidayDate,
      },
    },
    update: { description },
    create: {
      projectId: project.id,
      date: holidayDate,
      description,
    },
  });

  revalidatePath("/configuracoes");
}

/**
 * Server Action para Criar Novo Usuário Interno Centi (Restrito a ADMIN_GERAL)
 */
export async function createUserAction(formData: FormData) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "ADMIN_GERAL") {
    throw new Error("Apenas o Administrador Geral pode cadastrar novos usuários.");
  }

  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.toLowerCase().trim();
  const password = formData.get("password") as string;
  const role = (formData.get("role") as string) as UserRole;

  if (!name || !email || !password) {
    throw new Error("Nome, e-mail e senha são obrigatórios.");
  }

  // Validação: apenas e-mails corporativos Centi são permitidos
  if (!email.endsWith("@centi.com.br")) {
    throw new Error("Usuários internos devem possuir e-mail corporativo @centi.com.br.");
  }

  const org = await prisma.organization.findFirst();
  if (!org) {
    throw new Error("Organização Centi não configurada.");
  }

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    throw new Error("Já existe um usuário cadastrado com este e-mail.");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      organizationId: org.id,
      name,
      email,
      passwordHash,
      role: role || "ANALISTA",
      isActive: true,
    },
  });

  revalidatePath("/configuracoes");
}
