import React from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/server-session";
import prisma from "@/lib/db/prisma";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Building2, Plus, ArrowRight, ShieldCheck, AlertOctagon } from "lucide-react";

export default async function DepartamentosPage({
  searchParams,
}: {
  searchParams?: Promise<{ projectId?: string; filtro?: string }>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;

  const project = await prisma.project.findFirst({
    where: params?.projectId ? { id: params.projectId } : {},
    include: {
      entities: {
        include: {
          departments: {
            include: {
              municipalResponsible: true,
              assignments: { include: { user: true } },
              criticalProcesses: true,
              deliverables: true,
              issues: { where: { isOperationalBlocker: true, status: { notIn: ["CONCLUIDA", "CANCELADA"] } } },
            },
          },
        },
      },
    },
  });

  if (!project) {
    return <div className="p-8 text-center text-slate-600">Nenhum projeto selecionado.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Departamentos e Instâncias Setoriais
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Projeto: <strong>{project.name}</strong>  |  Estrutura por Entidade (Prefeitura, Câmara e Autarquias).
          </p>
        </div>
      </div>

      {/* Listagem Agrupada por Entidade */}
      <div className="space-y-6">
        {project.entities.map((entity) => (
          <div key={entity.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-centi-800" />
                <h2 className="font-bold text-sm text-slate-900">{entity.name}</h2>
                <span className="text-[11px] font-semibold text-slate-500 uppercase px-2 py-0.5 rounded bg-white border border-slate-200">
                  {entity.type}
                </span>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {entity.departments.length} departamentos
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {entity.departments.map((dept) => {
                const analista = dept.assignments[0]?.user.name || "A definir";
                const municipal = dept.municipalResponsible?.name || "A definir";
                const hasBlocker = dept.issues.length > 0;

                return (
                  <div
                    key={dept.id}
                    className="p-4 sm:px-6 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <Link
                          href={`/departamentos/${dept.id}`}
                          className="font-semibold text-slate-900 hover:text-centi-800 text-sm"
                        >
                          {dept.name}
                        </Link>
                        <StatusBadge
                          status={dept.operationalStatus}
                          revalidationRequired={dept.revalidationRequired}
                        />
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                        <span>Analista Centi: <strong className="text-slate-700">{analista}</strong></span>
                        <span>Resp. Municipal: <strong className="text-slate-700">{municipal}</strong></span>
                        <span>Processos Críticos: <strong className="text-slate-700">{dept.criticalProcesses.length}</strong></span>
                      </div>

                      {hasBlocker && (
                        <div className="text-xs text-red-700 font-semibold flex items-center gap-1.5 pt-0.5">
                          <AlertOctagon className="w-3.5 h-3.5 text-red-600" />
                          <span>Bloqueio Ativo: {dept.issues[0].title}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/departamentos/${dept.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors"
                      >
                        <span>Gerenciar / Validar</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
