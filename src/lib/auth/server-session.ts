import { getServerSession } from "next-auth";
import { authOptions } from "./auth-options";
import prisma from "../db/prisma";
import { UserRole } from "@prisma/client";
import { UserSessionContext, AuthGuard } from "./auth-guards";

export async function getCurrentUser() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return null;
    }
    return session.user as {
      id: string;
      name: string;
      email: string;
      role: UserRole;
      organizationId: string;
      organizationName: string;
    };
  } catch (error: any) {
    if (error?.digest === "DYNAMIC_SERVER_USAGE" || error?.message?.includes("Dynamic server usage")) {
      throw error;
    }
    console.warn("Aviso ao obter sessão do usuário:", error);
    return null;
  }
}

export async function getCurrentUserContext(): Promise<UserSessionContext | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      memberships: true,
      departmentAssignments: true,
    },
  });

  if (!dbUser) return null;

  return {
    userId: dbUser.id,
    organizationId: dbUser.organizationId,
    role: dbUser.role,
    projectMemberships: dbUser.memberships.map((m) => ({ projectId: m.projectId, role: m.role })),
    departmentAssignments: dbUser.departmentAssignments.map((d) => ({
      departmentId: d.departmentId,
      isLead: d.isLead,
    })),
  };
}

/**
 * Retorna de forma segura e com proteção contra IDOR o projectId autorizado para o usuário atual.
 * Se o usuário for ADMIN_GERAL, permite acessar qualquer projeto da sua organização.
 * Se for analista ou outro perfil restrito, valida a membresia via AuthGuard. Em caso de acesso
 * indevido, faz o fallback estrito para o primeiro projeto onde possui membresia válida.
 */
export async function getAuthorizedProjectId(requestedProjectId?: string): Promise<string | null> {
  const context = await getCurrentUserContext();
  if (!context) return null;

  if (context.role === UserRole.ADMIN_GERAL) {
    if (requestedProjectId) {
      const p = await prisma.project.findFirst({
        where: { id: requestedProjectId, organizationId: context.organizationId },
        select: { id: true },
      });
      if (p) return p.id;
    }
    const defaultProj = await prisma.project.findFirst({
      where: { organizationId: context.organizationId },
      orderBy: [{ isDemo: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    });
    return defaultProj?.id || null;
  }

  // Usuário restrito (Analista, BA, Líder, etc.)
  if (requestedProjectId) {
    const access = AuthGuard.canAccessProject(context, requestedProjectId);
    if (access.allowed) {
      return requestedProjectId;
    }
  }

  // Fallback seguro: primeiro projeto onde o usuário possui membresia autorizada
  const firstMembership = context.projectMemberships[0];
  return firstMembership ? firstMembership.projectId : null;
}

