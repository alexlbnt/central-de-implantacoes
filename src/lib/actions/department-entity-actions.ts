"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/server-session";
import prisma from "@/lib/db/prisma";
import { EntityType, IssuePriority } from "@prisma/client";

/**
 * Validação rigorosa de privilégio do Administrador Geral.
 * Impede execução indevida por outros perfis (Líder, Analista, Representante Municipal, etc.)
 */
async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN_GERAL") {
    throw new Error(
      "Acesso negado: Somente o Administrador Geral possui permissão para criar, editar ou excluir a estrutura de departamentos e instâncias setoriais."
    );
  }
  return user;
}

// =============================================================================
// INSTÂNCIAS SETORIAIS (ENTIDADES)
// =============================================================================

export async function createEntityAction(formData: FormData) {
  const admin = await requireAdmin();

  const projectId = formData.get("projectId") as string;
  const name = (formData.get("name") as string)?.trim();
  const type = (formData.get("type") as EntityType) || "PREFEITURA";
  const identifier = (formData.get("identifier") as string)?.trim() || null;
  const notes = (formData.get("notes") as string)?.trim() || null;

  if (!projectId || !name) {
    throw new Error("Projeto e Nome da Instância Setorial são obrigatórios.");
  }

  // Verifica pertencimento do projeto à organização do administrador
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: admin.organizationId },
  });

  if (!project) {
    throw new Error("Projeto não encontrado ou não pertence à sua organização.");
  }

  const entity = await prisma.entity.create({
    data: {
      projectId,
      name,
      type,
      identifier,
      notes,
    },
  });

  // Registra Trilha de Auditoria
  await prisma.auditLog.create({
    data: {
      organizationId: admin.organizationId,
      projectId,
      actorId: admin.id,
      actorName: admin.name,
      action: "CREATE",
      targetType: "Entity",
      targetId: entity.id,
      changedFields: JSON.stringify({ name, type, identifier, notes }),
      justification: "Criação de nova instância setorial pelo Administrador Geral",
    },
  });

  revalidatePath("/departamentos");
  revalidatePath("/");
  return { success: true, entityId: entity.id };
}

export async function updateEntityAction(formData: FormData) {
  const admin = await requireAdmin();

  const entityId = formData.get("entityId") as string;
  const name = (formData.get("name") as string)?.trim();
  const type = (formData.get("type") as EntityType) || "PREFEITURA";
  const identifier = (formData.get("identifier") as string)?.trim() || null;
  const notes = (formData.get("notes") as string)?.trim() || null;

  if (!entityId || !name) {
    throw new Error("ID da Instância e Nome são obrigatórios.");
  }

  const existing = await prisma.entity.findUnique({
    where: { id: entityId },
    include: { project: true },
  });

  if (!existing || existing.project.organizationId !== admin.organizationId) {
    throw new Error("Instância Setorial não encontrada ou sem permissão de acesso.");
  }

  const updated = await prisma.entity.update({
    where: { id: entityId },
    data: {
      name,
      type,
      identifier,
      notes,
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: admin.organizationId,
      projectId: existing.projectId,
      actorId: admin.id,
      actorName: admin.name,
      action: "UPDATE",
      targetType: "Entity",
      targetId: entityId,
      changedFields: JSON.stringify({
        before: { name: existing.name, type: existing.type, identifier: existing.identifier, notes: existing.notes },
        after: { name, type, identifier, notes },
      }),
      justification: "Edição cadastral de instância setorial pelo Administrador Geral",
    },
  });

  revalidatePath("/departamentos");
  revalidatePath("/");
  return { success: true, entityId: updated.id };
}

export async function deleteEntityAction(formData: FormData) {
  const admin = await requireAdmin();

  const entityId = formData.get("entityId") as string;
  if (!entityId) {
    throw new Error("ID da Instância Setorial é obrigatório.");
  }

  const existing = await prisma.entity.findUnique({
    where: { id: entityId },
    include: { project: true, departments: true },
  });

  if (!existing || existing.project.organizationId !== admin.organizationId) {
    throw new Error("Instância Setorial não encontrada ou sem permissão.");
  }

  await prisma.entity.delete({
    where: { id: entityId },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: admin.organizationId,
      projectId: existing.projectId,
      actorId: admin.id,
      actorName: admin.name,
      action: "DELETE",
      targetType: "Entity",
      targetId: entityId,
      changedFields: JSON.stringify({
        deletedEntityName: existing.name,
        departmentsCount: existing.departments.length,
      }),
      justification: "Exclusão definitiva de instância setorial pelo Administrador Geral",
    },
  });

  revalidatePath("/departamentos");
  revalidatePath("/");
  return { success: true };
}

// =============================================================================
// DEPARTAMENTOS (SETORES)
// =============================================================================

function parseModuleIds(formData: FormData): string[] {
  const rawList = formData.getAll("moduleIds");
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

export async function createDepartmentAction(formData: FormData) {
  const admin = await requireAdmin();

  const entityId = formData.get("entityId") as string;
  const name = (formData.get("name") as string)?.trim();
  const criticality = (formData.get("criticality") as IssuePriority) || "ALTA";
  const municipalResponsibleId = (formData.get("municipalResponsibleId") as string)?.trim() || null;
  const moduleIds = parseModuleIds(formData);

  if (!entityId || !name) {
    throw new Error("Instância Setorial e Nome do Departamento são obrigatórios.");
  }

  const entity = await prisma.entity.findUnique({
    where: { id: entityId },
    include: { project: true },
  });

  if (!entity || entity.project.organizationId !== admin.organizationId) {
    throw new Error("Instância Setorial não encontrada.");
  }

  const department = await prisma.$transaction(async (tx) => {
    const dept = await tx.department.create({
      data: {
        entityId,
        name,
        criticality,
        municipalResponsibleId: municipalResponsibleId || null,
        operationalStatus: "NAO_AVALIADO",
      },
    });

    if (moduleIds.length > 0) {
      await tx.departmentModule.createMany({
        data: moduleIds.map((moduleId) => ({ departmentId: dept.id, moduleId })),
      });
    }

    return dept;
  });

  await prisma.auditLog.create({
    data: {
      organizationId: admin.organizationId,
      projectId: entity.projectId,
      actorId: admin.id,
      actorName: admin.name,
      action: "CREATE",
      targetType: "Department",
      targetId: department.id,
      changedFields: JSON.stringify({ name, entityId, criticality, moduleIds }),
      justification: "Criação de departamento pelo Administrador Geral",
    },
  });

  revalidatePath("/departamentos");
  revalidatePath("/");
  return { success: true, departmentId: department.id };
}

export async function updateDepartmentAction(formData: FormData) {
  const admin = await requireAdmin();

  const departmentId = formData.get("departmentId") as string;
  const entityId = formData.get("entityId") as string;
  const name = (formData.get("name") as string)?.trim();
  const criticality = (formData.get("criticality") as IssuePriority) || "ALTA";
  const municipalResponsibleId = (formData.get("municipalResponsibleId") as string)?.trim() || null;
  const moduleIds = parseModuleIds(formData);

  if (!departmentId || !entityId || !name) {
    throw new Error("ID do Departamento, Instância e Nome são obrigatórios.");
  }

  const existing = await prisma.department.findUnique({
    where: { id: departmentId },
    include: { entity: { include: { project: true } }, modules: true },
  });

  if (!existing || existing.entity.project.organizationId !== admin.organizationId) {
    throw new Error("Departamento não encontrado ou sem permissão.");
  }

  // Atualiza departamento e sincroniza módulos associados
  await prisma.$transaction(async (tx) => {
    await tx.department.update({
      where: { id: departmentId },
      data: {
        entityId,
        name,
        criticality,
        municipalResponsibleId: municipalResponsibleId || null,
      },
    });

    await tx.departmentModule.deleteMany({
      where: { departmentId },
    });

    if (moduleIds.length > 0) {
      await tx.departmentModule.createMany({
        data: moduleIds.map((moduleId) => ({ departmentId, moduleId })),
      });
    }
  });

  await prisma.auditLog.create({
    data: {
      organizationId: admin.organizationId,
      projectId: existing.entity.projectId,
      actorId: admin.id,
      actorName: admin.name,
      action: "UPDATE",
      targetType: "Department",
      targetId: departmentId,
      changedFields: JSON.stringify({
        before: { name: existing.name, entityId: existing.entityId, criticality: existing.criticality },
        after: { name, entityId, criticality, moduleIds },
      }),
      justification: "Edição cadastral de departamento pelo Administrador Geral",
    },
  });

  revalidatePath("/departamentos");
  revalidatePath(`/departamentos/${departmentId}`);
  revalidatePath("/");
  return { success: true };
}

export async function deleteDepartmentAction(formData: FormData) {
  const admin = await requireAdmin();

  const departmentId = formData.get("departmentId") as string;
  if (!departmentId) {
    throw new Error("ID do Departamento é obrigatório.");
  }

  const existing = await prisma.department.findUnique({
    where: { id: departmentId },
    include: { entity: { include: { project: true } } },
  });

  if (!existing || existing.entity.project.organizationId !== admin.organizationId) {
    throw new Error("Departamento não encontrado ou sem permissão.");
  }

  await prisma.department.delete({
    where: { id: departmentId },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: admin.organizationId,
      projectId: existing.entity.projectId,
      actorId: admin.id,
      actorName: admin.name,
      action: "DELETE",
      targetType: "Department",
      targetId: departmentId,
      changedFields: JSON.stringify({ deletedDepartmentName: existing.name }),
      justification: "Exclusão definitiva de departamento pelo Administrador Geral",
    },
  });

  revalidatePath("/departamentos");
  revalidatePath("/");
  return { success: true };
}
