import { getServerSession } from "next-auth";
import { authOptions } from "./auth-options";
import prisma from "../db/prisma";
import { UserRole } from "@prisma/client";
import { UserSessionContext } from "./auth-guards";

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
