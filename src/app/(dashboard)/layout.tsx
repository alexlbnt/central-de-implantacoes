import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server-session";
import prisma from "@/lib/db/prisma";
import { AppLayout } from "@/components/layout/AppLayout";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // Busca projetos onde o usuário tem acesso ou todos se for Admin
  const projects = await prisma.project.findMany({
    where:
      user.role === "ADMIN_GERAL"
        ? {}
        : {
            memberships: {
              some: { userId: user.id },
            },
          },
    select: {
      id: true,
      name: true,
      isDemo: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const currentProject = projects[0];

  return (
    <AppLayout
      projects={projects}
      currentProjectId={currentProject?.id}
      isDemoProject={currentProject?.isDemo}
      projectName={currentProject?.name}
    >
      {children}
    </AppLayout>
  );
}
