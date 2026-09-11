"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { getCurrentUser } from "@/lib/auth/server-session";
import prisma from "@/lib/db/prisma";
import { UserRole } from "@prisma/client";

/**
 * Valida se o usuário autenticado possui privilégio de gerenciamento da Equipe Técnica:
 * Permitido exclusivamente para:
 * 1. Administrador Geral (ADMIN_GERAL)
 * 2. Líder de Projeto designado neste projeto (LIDER_PROJETO)
 */
async function requireTeamManager(projectId: string) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Não autenticado: Faça login para continuar.");
  }

  if (!projectId) {
    throw new Error("Identificador do projeto é obrigatório.");
  }

  // Se for Administrador Geral, acesso concedido
  if (user.role === "ADMIN_GERAL") {
    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId: user.organizationId },
    });
    if (!project) {
      throw new Error("Projeto não encontrado ou não pertence à sua organização.");
    }
    return { user, project };
  }

  // Se não for Admin Geral, verifica se é Líder designado no projeto
  const membership = await prisma.projectMembership.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId: user.id,
      },
    },
    include: { project: true },
  });

  if (!membership || membership.role !== "LIDER_PROJETO") {
    throw new Error(
      "Acesso negado: Somente o Administrador Geral e o Líder de Implantação possuem permissão para gerenciar a Equipe Técnica."
    );
  }

  return { user, project: membership.project };
}

/**
 * Helper para extrair array de IDs de departamentos de um FormData,
 * suportando tanto múltiplos campos 'departmentIds' quanto JSON string.
 */
function parseDepartmentIds(formData: FormData): string[] {
  const rawList = formData.getAll("departmentIds");
  const result: string[] = [];
  for (const item of rawList) {
    if (typeof item === "string") {
      const trimmed = item.trim();
      if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            result.push(...parsed.map(String).filter(Boolean));
            continue;
          }
        } catch {}
      }
      if (trimmed) {
        result.push(trimmed);
      }
    }
  }
  return Array.from(new Set(result));
}

// =============================================================================
// SERVER ACTIONS: GESTÃO DA EQUIPE TÉCNICA
// =============================================================================

/**
 * Cria ou aloca um membro na Equipe Técnica do projeto:
 * - mode === 'new_user': Cria conta Centi e vincula ao projeto com papel e departamentos
 * - mode === 'existing_user': Aloca um usuário Centi existente ao projeto
 */
export async function createTeamMemberAction(formData: FormData) {
  const projectId = formData.get("projectId") as string;
  const { user: actor, project } = await requireTeamManager(projectId);

  const mode = (formData.get("mode") as string) || "new_user";
  const role = (formData.get("role") as UserRole) || "ANALISTA";
  const departmentIds = parseDepartmentIds(formData);

  // Validação dos departamentos pertencentes ao projeto
  let validDepartmentIds: string[] = [];
  if (departmentIds.length > 0) {
    const validDepts = await prisma.department.findMany({
      where: {
        id: { in: departmentIds },
        entity: { projectId },
      },
      select: { id: true },
    });
    validDepartmentIds = validDepts.map((d) => d.id);
  }

  let targetUserId = "";
  let memberName = "";

  if (mode === "new_user") {
    const name = (formData.get("name") as string)?.trim();
    const email = (formData.get("email") as string)?.trim()?.toLowerCase();
    const password = (formData.get("password") as string)?.trim() || "Centi@2026";

    if (!name || !email) {
      throw new Error("Nome e E-mail do membro técnico são obrigatórios.");
    }

    // Verifica unicidade de e-mail
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new Error("Já existe um usuário cadastrado com este e-mail.");
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const created = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          organizationId: project.organizationId,
          name,
          email,
          passwordHash,
          role,
          isActive: true,
        },
      });

      await tx.projectMembership.create({
        data: {
          projectId,
          userId: newUser.id,
          role,
        },
      });

      if (validDepartmentIds.length > 0) {
        await tx.departmentAssignment.createMany({
          data: validDepartmentIds.map((deptId) => ({
            departmentId: deptId,
            userId: newUser.id,
            isLead: role === "LIDER_PROJETO",
          })),
        });
      }

      return newUser;
    });

    targetUserId = created.id;
    memberName = created.name;

    await prisma.auditLog.create({
      data: {
        organizationId: project.organizationId,
        projectId,
        actorId: actor.id,
        actorName: actor.name,
        action: "CREATE",
        targetType: "TeamMember",
        targetId: targetUserId,
        changedFields: JSON.stringify({
          mode: "new_user",
          name,
          email,
          role,
          departmentIds: validDepartmentIds,
        }),
        justification: "Cadastro e alocação de novo membro na Equipe Técnica do projeto.",
      },
    });
  } else {
    // Modo: Alocar usuário existente da organização
    const userId = formData.get("userId") as string;
    if (!userId) {
      throw new Error("Selecione um usuário Centi para alocar.");
    }

    const targetUser = await prisma.user.findFirst({
      where: { id: userId, organizationId: project.organizationId, isActive: true },
    });
    if (!targetUser) {
      throw new Error("Usuário não encontrado na organização ou inativo.");
    }

    const existingMembership = await prisma.projectMembership.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });
    if (existingMembership) {
      throw new Error(
        "Este usuário já faz parte da equipe deste projeto. Utilize a opção de edição para alterar seus dados ou atribuições."
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.projectMembership.create({
        data: {
          projectId,
          userId,
          role,
        },
      });

      if (validDepartmentIds.length > 0) {
        // Remove eventuais atribuições antigas deste usuário no projeto antes de inserir as novas
        await tx.departmentAssignment.deleteMany({
          where: {
            userId,
            department: { entity: { projectId } },
          },
        });

        await tx.departmentAssignment.createMany({
          data: validDepartmentIds.map((deptId) => ({
            departmentId: deptId,
            userId,
            isLead: role === "LIDER_PROJETO",
          })),
        });
      }
    });

    targetUserId = targetUser.id;
    memberName = targetUser.name;

    await prisma.auditLog.create({
      data: {
        organizationId: project.organizationId,
        projectId,
        actorId: actor.id,
        actorName: actor.name,
        action: "CREATE",
        targetType: "TeamMember",
        targetId: targetUserId,
        changedFields: JSON.stringify({
          mode: "existing_user",
          userId,
          name: targetUser.name,
          role,
          departmentIds: validDepartmentIds,
        }),
        justification: "Alocação de membro existente da Centi na Equipe Técnica do projeto.",
      },
    });
  }

  revalidatePath("/equipe");
  revalidatePath("/departamentos");
  revalidatePath("/");
  return { success: true, userId: targetUserId, name: memberName };
}

/**
 * Atualiza os dados e atribuições de um membro da Equipe Técnica:
 * - Papel no projeto (role)
 * - Nome e E-mail cadastrais do usuário
 * - Sincronização dos departamentos atribuídos ao analista no projeto
 */
export async function updateTeamMemberAction(formData: FormData) {
  const projectId = formData.get("projectId") as string;
  const { user: actor, project } = await requireTeamManager(projectId);

  const membershipId = formData.get("membershipId") as string;
  const userId = formData.get("userId") as string;
  const role = (formData.get("role") as UserRole) || "ANALISTA";
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim()?.toLowerCase();
  const departmentIds = parseDepartmentIds(formData);

  if (!membershipId || !userId || !name || !email) {
    throw new Error("Dados obrigatórios ausentes para atualização do membro.");
  }

  const existingMembership = await prisma.projectMembership.findUnique({
    where: { id: membershipId },
    include: { user: true },
  });

  if (!existingMembership || existingMembership.projectId !== projectId) {
    throw new Error("Vínculo de membro do projeto não encontrado.");
  }

  // Verifica se o e-mail foi alterado e se já existe em outra conta
  if (email !== existingMembership.user.email) {
    const emailConflict = await prisma.user.findFirst({
      where: { email, id: { not: userId } },
    });
    if (emailConflict) {
      throw new Error("Já existe outro usuário cadastrado com este e-mail.");
    }
  }

  // Validação dos departamentos no projeto
  const validDepts = await prisma.department.findMany({
    where: {
      id: { in: departmentIds },
      entity: { projectId },
    },
    select: { id: true },
  });
  const validDepartmentIds = validDepts.map((d) => d.id);

  await prisma.$transaction(async (tx) => {
    // 1. Atualiza papel no projeto
    await tx.projectMembership.update({
      where: { id: membershipId },
      data: { role },
    });

    // 2. Atualiza dados do usuário
    await tx.user.update({
      where: { id: userId },
      data: { name, email },
    });

    // 3. Sincroniza atribuições nos departamentos deste projeto
    await tx.departmentAssignment.deleteMany({
      where: {
        userId,
        department: { entity: { projectId } },
      },
    });

    if (validDepartmentIds.length > 0) {
      await tx.departmentAssignment.createMany({
        data: validDepartmentIds.map((deptId) => ({
          departmentId: deptId,
          userId,
          isLead: role === "LIDER_PROJETO",
        })),
      });
    }
  });

  await prisma.auditLog.create({
    data: {
      organizationId: project.organizationId,
      projectId,
      actorId: actor.id,
      actorName: actor.name,
      action: "UPDATE",
      targetType: "TeamMember",
      targetId: userId,
      changedFields: JSON.stringify({
        before: {
          name: existingMembership.user.name,
          email: existingMembership.user.email,
          role: existingMembership.role,
        },
        after: {
          name,
          email,
          role,
          departmentIds: validDepartmentIds,
        },
      }),
      justification: "Atualização cadastral e redistribuição departamental de membro técnico.",
    },
  });

  revalidatePath("/equipe");
  revalidatePath("/departamentos");
  revalidatePath("/");
  return { success: true };
}

/**
 * Remove o membro da Equipe Técnica do projeto:
 * - Desassocia o usuário da membresia do projeto (ProjectMembership)
 * - Remove todas as alocações departamentais deste usuário no projeto
 * - Mantém a conta do usuário intacta na organização Centi
 */
export async function removeTeamMemberAction(formData: FormData) {
  const projectId = formData.get("projectId") as string;
  const { user: actor, project } = await requireTeamManager(projectId);

  const membershipId = formData.get("membershipId") as string;
  const userId = formData.get("userId") as string;
  const force = formData.get("force") === "true";

  if (!membershipId || !userId) {
    throw new Error("Identificadores de vínculo e usuário são obrigatórios.");
  }

  const existingMembership = await prisma.projectMembership.findUnique({
    where: { id: membershipId },
    include: { user: true },
  });

  if (!existingMembership || existingMembership.projectId !== projectId) {
    throw new Error("Vínculo de membro técnico não encontrado neste projeto.");
  }

  // Verificação de segurança: Se for Líder, verifica se há outro líder ativo
  if (existingMembership.role === "LIDER_PROJETO" && !force) {
    const leaderCount = await prisma.projectMembership.count({
      where: { projectId, role: "LIDER_PROJETO" },
    });
    if (leaderCount <= 1) {
      throw new Error(
        "Este usuário é o único Líder de Projeto designado. Defina outro Líder antes de removê-lo para evitar desgovernança."
      );
    }
  }

  // Executa desassociação e limpeza de departamentos do projeto
  await prisma.$transaction(async (tx) => {
    // 1. Remove atribuições departamentais no projeto
    await tx.departmentAssignment.deleteMany({
      where: {
        userId,
        department: { entity: { projectId } },
      },
    });

    // 2. Remove membresia do projeto
    await tx.projectMembership.delete({
      where: { id: membershipId },
    });
  });

  await prisma.auditLog.create({
    data: {
      organizationId: project.organizationId,
      projectId,
      actorId: actor.id,
      actorName: actor.name,
      action: "DELETE",
      targetType: "TeamMember",
      targetId: userId,
      changedFields: JSON.stringify({
        removedMemberName: existingMembership.user.name,
        removedMemberEmail: existingMembership.user.email,
        removedRole: existingMembership.role,
      }),
      justification: "Desalocação formal de membro da Equipe Técnica do projeto.",
    },
  });

  revalidatePath("/equipe");
  revalidatePath("/departamentos");
  revalidatePath("/");
  return { success: true };
}
