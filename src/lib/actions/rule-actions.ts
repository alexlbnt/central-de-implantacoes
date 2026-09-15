"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/server-session";
import prisma from "@/lib/db/prisma";
import { RuleStatus } from "@prisma/client";

/**
 * Cria uma nova particularidade municipal ou regra de negócio.
 * Permite vincular opcionalmente a um Departamento específico do município.
 */
export async function createBusinessRuleAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Não autenticado: Faça login para registrar particularidades.");
  }

  const projectId = (formData.get("projectId") as string)?.trim();
  const title = (formData.get("title") as string)?.trim();
  const category = (formData.get("category") as string)?.trim() || "PARTICULARIDADE_MUNICIPAL";
  const departmentIdRaw = (formData.get("departmentId") as string)?.trim();
  const departmentCodeRaw = (formData.get("departmentCode") as string)?.trim();
  const informantName = (formData.get("informantName") as string)?.trim() || null;
  const clientVerbalText = (formData.get("clientVerbalText") as string)?.trim();
  const technicalOpinion = (formData.get("technicalOpinion") as string)?.trim() || null;

  if (!projectId) {
    throw new Error("Identificador do projeto é obrigatório.");
  }
  if (!title) {
    throw new Error("O título da particularidade é obrigatório.");
  }
  if (!clientVerbalText) {
    throw new Error("O relato verbal do cliente é obrigatório.");
  }

  // Verifica pertencimento do projeto à organização do usuário (Prevenção IDOR)
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: user.organizationId },
  });
  if (!project) {
    throw new Error("Projeto não encontrado ou você não possui permissão de acesso.");
  }

  let validDepartmentId: string | null = null;
  let derivedDepartmentCode: string | null = departmentCodeRaw || null;

  // Se um departamento foi selecionado, valida se pertence a este projeto
  if (departmentIdRaw && departmentIdRaw !== "" && departmentIdRaw !== "none") {
    const dept = await prisma.department.findFirst({
      where: {
        id: departmentIdRaw,
        entity: {
          projectId,
        },
      },
    });

    if (!dept) {
      throw new Error("O departamento selecionado não pertence a este município.");
    }

    validDepartmentId = dept.id;
    if (!derivedDepartmentCode) {
      derivedDepartmentCode = dept.name;
    }
  }

  const status: RuleStatus = technicalOpinion ? RuleStatus.EM_VALIDACAO : RuleStatus.RASCUNHO;

  const rule = await prisma.businessRuleVersion.create({
    data: {
      projectId,
      departmentId: validDepartmentId,
      departmentCode: derivedDepartmentCode,
      title,
      category,
      informantName,
      clientVerbalText,
      technicalOpinion,
      status,
    },
    include: {
      department: true,
    },
  });

  // Trilha de Auditoria
  await prisma.auditLog.create({
    data: {
      organizationId: user.organizationId,
      projectId,
      actorId: user.id,
      actorName: user.name,
      action: "CREATE",
      targetType: "BusinessRuleVersion",
      targetId: rule.id,
      changedFields: JSON.stringify({
        title,
        category,
        departmentId: validDepartmentId,
        informantName,
        status,
      }),
      justification: "Registro de particularidade municipal / regra de negócio",
    },
  });

  revalidatePath("/wiki");
  return { success: true, ruleId: rule.id };
}

/**
 * Edita uma particularidade municipal já cadastrada.
 * Permite alterar título, departamento vinculado, categoria, informante,
 * relato verbal, parecer técnico e status.
 */
export async function updateBusinessRuleAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Não autenticado: Faça login para editar particularidades.");
  }

  const ruleId = (formData.get("ruleId") as string)?.trim();
  const title = (formData.get("title") as string)?.trim();
  const category = (formData.get("category") as string)?.trim() || "PARTICULARIDADE_MUNICIPAL";
  const departmentIdRaw = (formData.get("departmentId") as string)?.trim();
  const informantName = (formData.get("informantName") as string)?.trim() || null;
  const clientVerbalText = (formData.get("clientVerbalText") as string)?.trim();
  const technicalOpinion = (formData.get("technicalOpinion") as string)?.trim() || null;
  const statusRaw = (formData.get("status") as string)?.trim();

  if (!ruleId) {
    throw new Error("Identificador da particularidade é obrigatório.");
  }
  if (!title) {
    throw new Error("O título da particularidade é obrigatório.");
  }
  if (!clientVerbalText) {
    throw new Error("O relato verbal do cliente é obrigatório.");
  }

  // Localiza a regra existente e valida se pertence à organização do usuário (Prevenção IDOR)
  const existing = await prisma.businessRuleVersion.findUnique({
    where: { id: ruleId },
    include: { project: true, department: true },
  });

  if (!existing || existing.project.organizationId !== user.organizationId) {
    throw new Error("Particularidade não encontrada ou você não possui permissão para editá-la.");
  }

  let newDepartmentId: string | null = null;
  let newDepartmentCode: string | null = null;

  // Se departamento foi selecionado, valida se pertence ao mesmo projeto
  if (departmentIdRaw && departmentIdRaw !== "" && departmentIdRaw !== "none") {
    const dept = await prisma.department.findFirst({
      where: {
        id: departmentIdRaw,
        entity: {
          projectId: existing.projectId,
        },
      },
    });

    if (!dept) {
      throw new Error("O departamento selecionado não pertence a este município.");
    }

    newDepartmentId = dept.id;
    newDepartmentCode = dept.name;
  }

  // Determinação do status
  let newStatus: RuleStatus = existing.status;
  if (statusRaw && Object.values(RuleStatus).includes(statusRaw as RuleStatus)) {
    newStatus = statusRaw as RuleStatus;
  } else if (technicalOpinion && existing.status === RuleStatus.RASCUNHO) {
    newStatus = RuleStatus.EM_VALIDACAO;
  }

  // Se foi marcada como VALIDADA e ainda não possui validador, atribui o usuário atual
  let validatorName = existing.validatorName;
  let effectiveDate = existing.effectiveDate;
  if (newStatus === RuleStatus.VALIDADA && !existing.validatorName) {
    validatorName = user.name;
    effectiveDate = new Date();
  }

  const updated = await prisma.businessRuleVersion.update({
    where: { id: ruleId },
    data: {
      title,
      category,
      departmentId: newDepartmentId,
      departmentCode: newDepartmentCode,
      informantName,
      clientVerbalText,
      technicalOpinion,
      status: newStatus,
      validatorName,
      effectiveDate,
      versionNumber: { increment: 1 },
      version: { increment: 1 },
    },
  });

  // Trilha de Auditoria
  await prisma.auditLog.create({
    data: {
      organizationId: user.organizationId,
      projectId: existing.projectId,
      actorId: user.id,
      actorName: user.name,
      action: "UPDATE",
      targetType: "BusinessRuleVersion",
      targetId: updated.id,
      changedFields: JSON.stringify({
        title,
        category,
        previousDepartmentId: existing.departmentId,
        newDepartmentId,
        informantName,
        status: newStatus,
        version: updated.version,
      }),
      justification: "Edição de particularidade municipal e atualização de departamento",
    },
  });

  revalidatePath("/wiki");
  return { success: true, ruleId: updated.id };
}

/**
 * Valida e homologa uma particularidade municipal pelo Líder de Implantação ou BA.
 */
export async function validateBusinessRuleAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Não autenticado: Faça login para validar regras.");
  }

  const ruleId = (formData.get("ruleId") as string)?.trim();
  const status = (formData.get("status") as RuleStatus) || RuleStatus.VALIDADA;

  if (!ruleId) {
    throw new Error("Identificador da particularidade é obrigatório.");
  }

  const existing = await prisma.businessRuleVersion.findUnique({
    where: { id: ruleId },
    include: { project: true },
  });

  if (!existing || existing.project.organizationId !== user.organizationId) {
    throw new Error("Particularidade não encontrada ou acesso negado.");
  }

  const updated = await prisma.businessRuleVersion.update({
    where: { id: ruleId },
    data: {
      status,
      validatorName: user.name || "Líder de Implantação",
      effectiveDate: status === RuleStatus.VALIDADA ? new Date() : undefined,
      version: { increment: 1 },
    },
  });

  // Trilha de Auditoria
  await prisma.auditLog.create({
    data: {
      organizationId: user.organizationId,
      projectId: existing.projectId,
      actorId: user.id,
      actorName: user.name,
      action: "VALIDATE",
      targetType: "BusinessRuleVersion",
      targetId: updated.id,
      changedFields: JSON.stringify({ status, validatorName: user.name }),
      justification: "Homologação técnica de particularidade municipal",
    },
  });

  revalidatePath("/wiki");
  return { success: true };
}

/**
 * Exclui uma particularidade municipal (Líder ou Admin).
 */
export async function deleteBusinessRuleAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Não autenticado: Faça login para excluir regras.");
  }

  const ruleId = (formData.get("ruleId") as string)?.trim();
  if (!ruleId) {
    throw new Error("Identificador da particularidade é obrigatório.");
  }

  const existing = await prisma.businessRuleVersion.findUnique({
    where: { id: ruleId },
    include: { project: true },
  });

  if (!existing || existing.project.organizationId !== user.organizationId) {
    throw new Error("Particularidade não encontrada ou acesso negado.");
  }

  await prisma.businessRuleVersion.delete({
    where: { id: ruleId },
  });

  // Trilha de Auditoria
  await prisma.auditLog.create({
    data: {
      organizationId: user.organizationId,
      projectId: existing.projectId,
      actorId: user.id,
      actorName: user.name,
      action: "DELETE",
      targetType: "BusinessRuleVersion",
      targetId: ruleId,
      changedFields: JSON.stringify({ title: existing.title }),
      justification: "Exclusão de particularidade municipal",
    },
  });

  revalidatePath("/wiki");
  return { success: true };
}
