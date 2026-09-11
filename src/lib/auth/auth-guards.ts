import { UserRole } from "@prisma/client";

export interface UserSessionContext {
  userId: string;
  organizationId: string;
  role: UserRole;
  projectMemberships: Array<{ projectId: string; role: UserRole }>;
  departmentAssignments: Array<{ departmentId: string; isLead: boolean }>;
}

export interface ResourceAccessCheck {
  allowed: boolean;
  reason?: string;
}

/**
 * Validador universal de autorização e proteção contra IDOR
 */
export class AuthGuard {
  /**
   * Verifica se o usuário tem acesso a um projeto específico
   */
  public static canAccessProject(context: UserSessionContext, projectId: string): ResourceAccessCheck {
    if (context.role === UserRole.ADMIN_GERAL) {
      return { allowed: true };
    }

    const hasMembership = context.projectMemberships.some((m) => m.projectId === projectId);
    if (!hasMembership) {
      return {
        allowed: false,
        reason: "Acesso negado: você não possui membresia autorizada neste projeto de implantação.",
      };
    }

    return { allowed: true };
  }

  /**
   * Verifica se o usuário pode acessar um departamento específico
   */
  public static canAccessDepartment(
    context: UserSessionContext,
    projectId: string,
    departmentId: string
  ): ResourceAccessCheck {
    const projectAccess = this.canAccessProject(context, projectId);
    if (!projectAccess.allowed) {
      return projectAccess;
    }

    // Se for Administrador, Líder do projeto, DC, QA ou BA no projeto, tem visão de todos os departamentos do projeto
    const member = context.projectMemberships.find((m) => m.projectId === projectId);
    if (
      context.role === UserRole.ADMIN_GERAL ||
      member?.role === UserRole.LIDER_PROJETO ||
      member?.role === UserRole.DC ||
      member?.role === UserRole.QA ||
      member?.role === UserRole.BA
    ) {
      return { allowed: true };
    }

    // Se for Representante Municipal ou Analista com atribuição específica
    const hasAssignment = context.departmentAssignments.some((d) => d.departmentId === departmentId);
    if (!hasAssignment) {
      return {
        allowed: false,
        reason: "Acesso restrito: seu perfil possui acesso limitado aos seus departamentos atribuídos.",
      };
    }

    return { allowed: true };
  }

  /**
   * Verifica se o usuário tem permissão para visualizar itens confidenciais / notas internas Centi.
   * Representantes Municipais e Leitores externos são ESTRITAMENTE VEDADOS de acessar notas internas.
   */
  public static canViewInternalNotes(context: UserSessionContext): boolean {
    if (context.role === UserRole.REPRESENTANTE_MUNICIPAL || context.role === UserRole.LEITOR) {
      return false;
    }
    return true;
  }

  /**
   * Verifica permissão para validação técnica formal de prontidão (exclusiva do Líder do projeto).
   * Administrador geral NÃO tem prerrogativa de atestar tecnicamente sem o papel de Líder.
   */
  public static canValidateReadiness(context: UserSessionContext, projectId: string): ResourceAccessCheck {
    const member = context.projectMemberships.find((m) => m.projectId === projectId);
    if (member?.role === UserRole.LIDER_PROJETO) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: "A validação técnica formal de prontidão e homologação de processos é ato privativo do Líder do Projeto.",
    };
  }

  /**
   * Verifica se o usuário tem permissão para criar, editar ou excluir Departamentos e Instâncias Setoriais.
   * Prerrogativa exclusiva do Administrador Geral (ADMIN_GERAL).
   */
  public static canManageDepartmentsAndEntities(context: UserSessionContext): ResourceAccessCheck {
    if (context.role === UserRole.ADMIN_GERAL) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: "Acesso negado: Somente o Administrador Geral possui permissão para criar, editar ou excluir a estrutura de departamentos e instâncias setoriais.",
    };
  }

  /**
   * Verifica se o usuário tem permissão para criar, editar ou excluir membros da Equipe Técnica.
   * Prerrogativa autorizada para o Administrador Geral (ADMIN_GERAL) e Líder do Projeto (LIDER_PROJETO).
   */
  public static canManageTechnicalTeam(
    context: UserSessionContext,
    projectId: string
  ): ResourceAccessCheck {
    if (context.role === UserRole.ADMIN_GERAL) {
      return { allowed: true };
    }

    const member = context.projectMemberships.find((m) => m.projectId === projectId);
    if (member?.role === UserRole.LIDER_PROJETO || context.role === UserRole.LIDER_PROJETO) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: "Acesso negado: Somente o Administrador Geral e o Líder de Implantação possuem permissão para gerenciar a Equipe Técnica.",
    };
  }
}
