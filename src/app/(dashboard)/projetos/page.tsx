import React from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/server-session";
import prisma from "@/lib/db/prisma";
import { FolderGit2, Plus, Calendar, CheckCircle2, Shield, Sparkles } from "lucide-react";
import { revalidatePath } from "next/cache";

export default async function ProjetosPage() {
  const user = await getCurrentUser();

  const projects = await prisma.project.findMany({
    where:
      user?.role === "ADMIN_GERAL"
        ? {}
        : {
            memberships: {
              some: { userId: user?.id },
            },
          },
    include: {
      municipality: true,
      entities: {
        include: {
          departments: true,
        },
      },
      memberships: {
        include: { user: true },
      },
      _count: {
        select: {
          issues: true,
          documents: true,
        },
      },
    },
    orderBy: [{ isDemo: "asc" }, { createdAt: "desc" }],
  });

  // Server Action para criar novo projeto (Assistente simplificado)
  async function createProjectAction(formData: FormData) {
    "use server";
    const name = formData.get("name") as string;
    const municipalityName = formData.get("municipalityName") as string;
    const state = (formData.get("state") as string) || "GO";
    const codePrefix = ((formData.get("codePrefix") as string) || "MUN").toUpperCase();
    const isDemo = formData.get("isDemo") === "true";

    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Não autenticado");

    // Upsert do município
    const mun = await prisma.municipality.upsert({
      where: {
        name_state_organizationId: {
          name: municipalityName,
          state,
          organizationId: currentUser.organizationId,
        },
      },
      update: {},
      create: {
        name: municipalityName,
        state,
        organizationId: currentUser.organizationId,
      },
    });

    const newProject = await prisma.project.create({
      data: {
        organizationId: currentUser.organizationId,
        municipalityId: mun.id,
        name,
        codePrefix,
        isDemo,
        memberships: {
          create: [{ userId: currentUser.id, role: currentUser.role }],
        },
        entities: {
          create: [
            {
              name: `Prefeitura Municipal de ${municipalityName}`,
              type: "PREFEITURA",
              departments: {
                create: [
                  { name: "Recursos Humanos / Folha", operationalStatus: "NAO_AVALIADO" },
                  { name: "Contabilidade", operationalStatus: "NAO_AVALIADO" },
                  { name: "Compras e Licitações", operationalStatus: "NAO_AVALIADO" },
                  { name: "Almoxarifado", operationalStatus: "NAO_AVALIADO" },
                ],
              },
            },
          ],
        },
      },
    });

    revalidatePath("/projetos");
    revalidatePath("/");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Projetos de Implantação
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Gerenciamento de municípios, entidades e instâncias ERP Centi.
          </p>
        </div>
      </div>

      {/* Formulário Rápido de Criação de Projeto */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Plus className="w-4 h-4 text-centi-700" />
          Novo Projeto de Implantação
        </h2>

        <form action={createProjectAction} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Nome do Projeto</label>
            <input
              type="text"
              name="name"
              required
              placeholder="Ex: Implantação ERP - São Patrício"
              className="w-full p-2 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Município</label>
            <input
              type="text"
              name="municipalityName"
              required
              placeholder="Ex: São Patrício"
              className="w-full p-2 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">UF</label>
            <input
              type="text"
              name="state"
              defaultValue="GO"
              maxLength={2}
              className="w-full p-2 border border-slate-300 rounded-lg text-xs uppercase"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Prefixo de Tickets</label>
            <input
              type="text"
              name="codePrefix"
              defaultValue="SP"
              maxLength={4}
              className="w-full p-2 border border-slate-300 rounded-lg text-xs uppercase"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full py-2 px-3 bg-centi-900 hover:bg-centi-950 text-white rounded-lg font-medium text-xs transition-colors shadow-xs"
            >
              Criar Projeto
            </button>
          </div>
        </form>
      </div>

      {/* Lista de Projetos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projects.map((proj) => {
          const totalDepts = proj.entities.reduce((acc, e) => acc + e.departments.length, 0);

          return (
            <div
              key={proj.id}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-base text-slate-900 flex items-center gap-1.5">
                      {proj.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {proj.municipality.name} - {proj.municipality.state}  |  Prefixo: <span className="font-mono font-semibold">{proj.codePrefix}</span>
                    </p>
                  </div>

                  {proj.isDemo ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      <Sparkles className="w-3 h-3 text-amber-700" />
                      DEMO
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      REAL
                    </span>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs py-2 bg-slate-50 rounded-lg border border-slate-100">
                  <div>
                    <div className="text-slate-400 text-[10px] uppercase font-semibold">Entidades</div>
                    <div className="font-bold text-slate-800">{proj.entities.length}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px] uppercase font-semibold">Departamentos</div>
                    <div className="font-bold text-slate-800">{totalDepts}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px] uppercase font-semibold">Pendências</div>
                    <div className="font-bold text-slate-800">{proj._count.issues}</div>
                  </div>
                </div>

                <p className="mt-3 text-xs text-slate-600 line-clamp-2">
                  {proj.description || "Sem descrição cadastrada."}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  Fase: <strong className="text-slate-700">{proj.phase}</strong>
                </span>
                <Link
                  href={`/?projectId=${proj.id}`}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-medium transition-colors"
                >
                  Abrir no Painel
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
