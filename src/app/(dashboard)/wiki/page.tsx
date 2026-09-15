import React from "react";
import { getCurrentUser } from "@/lib/auth/server-session";
import prisma from "@/lib/db/prisma";
import { WikiRulesManager } from "@/components/wiki/WikiRulesManager";

export default async function WikiRegrasPage({
  searchParams,
}: {
  searchParams?: Promise<{ projectId?: string; category?: string }>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;

  const project = await prisma.project.findFirst({
    where: params?.projectId ? { id: params.projectId } : {},
    include: {
      municipality: true,
      rules: {
        where: params?.category ? { category: params.category } : {},
        include: {
          department: {
            include: {
              entity: {
                select: { name: true },
              },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  if (!project) {
    return <div className="p-8 text-center text-slate-600">Nenhum projeto encontrado.</div>;
  }

  // Busca todos os departamentos pertencentes a este projeto (através de suas entidades)
  const departmentsData = await prisma.department.findMany({
    where: {
      entity: {
        projectId: project.id,
      },
    },
    include: {
      entity: {
        select: {
          name: true,
        },
      },
    },
    orderBy: [
      { entity: { name: "asc" } },
      { name: "asc" },
    ],
  });

  const departments = departmentsData.map((d) => ({
    id: d.id,
    name: d.name,
    entityName: d.entity?.name || "Município",
  }));

  const isAdminOrLeader = user?.role === "ADMIN_GERAL" || user?.role === "LIDER_PROJETO";

  return (
    <WikiRulesManager
      projectId={project.id}
      projectName={project.name}
      rules={project.rules}
      departments={departments}
      isAdminOrLeader={isAdminOrLeader}
    />
  );
}
