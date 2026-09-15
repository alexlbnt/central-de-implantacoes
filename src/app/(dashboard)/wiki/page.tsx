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
  const params = searchParams ? await searchParams : undefined;

  const projectWhere = params?.projectId
    ? { id: params.projectId }
    : user?.organizationId
    ? { organizationId: user.organizationId }
    : {};

  let project = null;
  let departments: Array<{ id: string; name: string; entityName: string }> = [];

  // 1. Tenta carregar projeto e regras com a relação completa de departamentos
  try {
    project = await prisma.project.findFirst({
      where: projectWhere,
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

    if (project) {
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

      departments = departmentsData.map((d) => ({
        id: d.id,
        name: d.name,
        entityName: d.entity?.name || "Município",
      }));
    }
  } catch (err) {
    console.warn(
      "Aviso: Consulta com relação de departamento falhou (sincronização do schema pendente em produção):",
      err
    );

    // 2. Modo Resiliente / Fallback de Compatibilidade:
    // Carrega projeto e regras sem join de departamento caso a coluna departmentId ainda não tenha sido criada no banco
    try {
      project = await prisma.project.findFirst({
        where: projectWhere,
        include: {
          municipality: true,
          rules: {
            where: params?.category ? { category: params.category } : {},
            orderBy: { updatedAt: "desc" },
          },
        },
      });

      if (project) {
        try {
          const departmentsData = await prisma.department.findMany({
            where: {
              entity: {
                projectId: project.id,
              },
            },
            include: {
              entity: {
                select: { name: true },
              },
            },
            orderBy: [
              { entity: { name: "asc" } },
              { name: "asc" },
            ],
          });

          departments = departmentsData.map((d) => ({
            id: d.id,
            name: d.name,
            entityName: d.entity?.name || "Município",
          }));
        } catch {
          departments = [];
        }
      }
    } catch (fallbackErr) {
      console.error("Erro crítico ao carregar projeto no fallback:", fallbackErr);
      return (
        <div className="p-8 text-center text-slate-600">
          Não foi possível carregar as informações do projeto. Por favor, tente novamente mais tarde.
        </div>
      );
    }
  }

  if (!project) {
    return <div className="p-8 text-center text-slate-600">Nenhum projeto encontrado.</div>;
  }

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
