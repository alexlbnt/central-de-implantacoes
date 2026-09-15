import React from "react";
import Link from "next/link";
import { getCurrentUser, getAuthorizedProjectId } from "@/lib/auth/server-session";
import prisma from "@/lib/db/prisma";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  calculateDeliverableProgress,
  calculateAutonomyIndex,
  calculateOperationalDepartmentsSummary,
  filterOverdueActions,
} from "@/lib/domain/indicator-calculator";
import {
  Building2,
  CheckCircle2,
  AlertOctagon,
  Clock,
  GraduationCap,
  FileSignature,
  RefreshCw,
  CalendarDays,
  UserCheck,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default async function DashboardOverviewPage({
  searchParams,
}: {
  searchParams?: Promise<{ projectId?: string }>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;
  const authorizedProjectId = await getAuthorizedProjectId(params?.projectId);

  if (!authorizedProjectId) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-slate-200 p-8">
        <h2 className="text-lg font-bold text-slate-800">Nenhum projeto atribuído ou acesso não autorizado</h2>
        <p className="text-sm text-slate-600 mt-2">Você não possui membresia autorizada neste projeto ou nenhum município está cadastrado.</p>
        <Link
          href="/projetos"
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-centi-900 text-white rounded-lg text-sm font-medium"
        >
          Ir para Projetos
        </Link>
      </div>
    );
  }

  // Busca projeto ativo com isolamento seguro (IDOR)
  const project = await prisma.project.findUnique({
    where: { id: authorizedProjectId },
    include: {
      municipality: true,
      entities: {
        include: {
          departments: {
            include: {
              municipalResponsible: true,
              assignments: { include: { user: true } },
              criticalProcesses: {
                include: {
                  testExecutions: { orderBy: { executedAt: "desc" }, take: 1 },
                  autonomyReqs: true,
                },
              },
              deliverables: true,
              issues: { where: { status: { notIn: ["CONCLUIDA", "CANCELADA"] } } },
            },
          },
        },
      },
      issues: {
        where: { status: { notIn: ["CONCLUIDA", "CANCELADA"] } },
        include: { department: true, assignee: true },
      },
      risks: { where: { status: { not: "ENCERRADO" } } },
    },
  });

  if (!project) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-slate-200 p-8">
        <h2 className="text-lg font-bold text-slate-800">Nenhum projeto encontrado</h2>
        <p className="text-sm text-slate-600 mt-2">Crie um novo projeto ou selecione outro município.</p>
        <Link
          href="/projetos"
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-centi-900 text-white rounded-lg text-sm font-medium"
        >
          Ir para Projetos
        </Link>
      </div>
    );
  }

  // Coleta todos os departamentos das entidades
  const allDepartments = project.entities.flatMap((e) =>
    e.departments.map((d) => ({
      ...d,
      entityName: e.name,
      operationalStatus: d.operationalStatus as "BLOQUEADO" | "NAO_AVALIADO" | "EM_PREPARACAO" | "OPERACAO_ASSISTIDA" | "OPERACIONAL",
    }))
  );

  // 1. Resumo dos Departamentos Operacionais
  const deptSummary = calculateOperationalDepartmentsSummary(allDepartments);

  // 2. Progresso de Entregas Obrigatórias
  const allDeliverables = allDepartments.flatMap((d) => d.deliverables);
  const deliverableProgress = calculateDeliverableProgress(allDeliverables);

  // 3. Autonomia Global
  const allAutonomyReqs = allDepartments.flatMap((d) =>
    d.criticalProcesses.flatMap((p) => p.autonomyReqs)
  );
  const autonomyProgress = calculateAutonomyIndex(allAutonomyReqs);

  // 4. Bloqueios Críticos e Ações Vencidas
  const activeBlockers = project.issues.filter((i) => i.isOperationalBlocker);
  const overdueActions = filterOverdueActions(
    project.issues.map((i) => ({ id: i.id, title: i.title, dueDate: i.dueDate, status: i.status }))
  );
  const waitingMunicipal = project.issues.filter(
    (i) => i.waitingCondition === "AGUARDANDO_MUNICIPIO"
  );

  // Lista "Meu dia" (tarefas atribuídas ao usuário logado)
  const myDayIssues = project.issues.filter((i) => i.assigneeId === user?.id);

  const nowFormatted = new Date().toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Painel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Painel de Implantação
            </h1>
            {project.isDemo && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                <Sparkles className="w-3 h-3 text-amber-700" />
                DEMO
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            <strong>{project.name}</strong> ({project.municipality?.name || "Município"} - {project.municipality?.state || "UF"}) &bull; Fase: <strong className="text-slate-700">{project.phase}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/governanca"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <span>Preparar Ata Semanal</span>
          </Link>
          <Link
            href="/pendencias"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-centi-900 text-white rounded-lg text-xs font-semibold hover:bg-centi-950 transition-colors shadow-xs"
          >
            <span>Nova Pendência</span>
          </Link>
        </div>
      </div>

      {/* 4 Indicadores Principais de Alto Impacto */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Departamentos Operacionais"
          value={deptSummary.operationalRatioText}
          subtitle={`${deptSummary.operational} prontos de ${allDepartments.length} setores`}
          variant={deptSummary.blocked > 0 ? "danger" : deptSummary.operational > 0 ? "success" : "default"}
          icon={<Building2 className="w-5 h-5" />}
          href="/departamentos"
        />

        <MetricCard
          title="Progresso de Entregas"
          value={deliverableProgress.displayText}
          numerator={deliverableProgress.numerator}
          denominator={deliverableProgress.denominator}
          subtitle="Entregas ativas validadas"
          icon={<CheckCircle2 className="w-5 h-5" />}
          href="/processos"
        />

        <MetricCard
          title="Autonomia Comprovada"
          value={autonomyProgress.displayText}
          numerator={autonomyProgress.numerator}
          denominator={autonomyProgress.denominator}
          subtitle="Operadores homologados"
          icon={<GraduationCap className="w-5 h-5" />}
          href="/treinamentos"
        />

        <MetricCard
          title="Bloqueios Ativos"
          value={activeBlockers.length}
          subtitle={activeBlockers.length === 0 ? "Nenhum setor travado" : "Exigem ação prioritária"}
          variant={activeBlockers.length > 0 ? "danger" : "success"}
          icon={<AlertOctagon className="w-5 h-5" />}
          href="/pendencias?filtro=bloqueios"
        />
      </div>

      {/* Faixa Compacta de Alertas Rápidos */}
      <div className="flex flex-wrap items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
          Atenção Rápida:
        </span>

        <Link
          href="/pendencias?filtro=vencidas"
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-colors ${
            overdueActions.length > 0
              ? "bg-amber-100/80 text-amber-900 hover:bg-amber-100 border border-amber-300/80"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <CalendarDays className="w-3.5 h-3.5 text-amber-600" />
          <span>Ações Vencidas: <strong>{overdueActions.length}</strong></span>
        </Link>

        <Link
          href="/pendencias?filtro=aguardando_municipio"
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-colors ${
            waitingMunicipal.length > 0
              ? "bg-blue-50 text-blue-900 hover:bg-blue-100 border border-blue-200"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-blue-600" />
          <span>Aguardando Município: <strong>{waitingMunicipal.length}</strong></span>
        </Link>

        <Link
          href="/departamentos?filtro=revalidacao"
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-colors ${
            deptSummary.revalidationRequired > 0
              ? "bg-orange-50 text-orange-900 hover:bg-orange-100 border border-orange-200"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5 text-orange-600" />
          <span>Revalidação (&gt; 7 dias): <strong>{deptSummary.revalidationRequired}</strong></span>
        </Link>

        <Link
          href="/documentos"
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
        >
          <FileSignature className="w-3.5 h-3.5 text-slate-500" />
          <span>Assinaturas Pendentes: <strong>{project.issues.filter((i) => i.waitingType === "ASSINATURA").length}</strong></span>
        </Link>
      </div>

      {/* Seção Central Dividida: Tabela de Departamentos + Painéis de Atenção */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tabela Central de Departamentos (2 colunas no desktop) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Situação dos Departamentos
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Progresso funcional, responsáveis e bloqueios por setor.
              </p>
            </div>
            <Link
              href="/departamentos"
              className="text-xs font-semibold text-centi-700 hover:text-centi-900 inline-flex items-center gap-1"
            >
              Ver todos <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-3">Entidade / Departamento</th>
                  <th className="py-2.5 px-3">Responsáveis</th>
                  <th className="py-2.5 px-3">Situação</th>
                  <th className="py-2.5 px-3">Entregas</th>
                  <th className="py-2.5 px-3">Autonomia</th>
                  <th className="py-2.5 px-3">Impedimento / Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allDepartments.map((dept) => {
                  const deptDeliverables = dept.deliverables;
                  const prog = calculateDeliverableProgress(deptDeliverables);
                  const deptAutonomy = dept.criticalProcesses.flatMap((p) => p.autonomyReqs);
                  const auto = calculateAutonomyIndex(deptAutonomy);

                  const analistaName = dept.assignments[0]?.user.name || "A definir";
                  const municipalName = dept.municipalResponsible?.name || "A definir";
                  const blocker = dept.issues.find((i) => i.isOperationalBlocker);

                  return (
                    <tr
                      key={dept.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    >
                      <td className="py-3 px-3">
                        <Link href={`/departamentos/${dept.id}`} className="block">
                          <div className="font-semibold text-slate-900 group-hover:text-centi-800">
                            {dept.name}
                          </div>
                          <div className="text-[11px] text-slate-500">{dept.entityName}</div>
                        </Link>
                      </td>

                      <td className="py-3 px-3 text-[11px]">
                        <div><span className="font-medium text-slate-700">Centi:</span> {analistaName}</div>
                        <div><span className="font-medium text-slate-700">Mun:</span> {municipalName}</div>
                      </td>

                      <td className="py-3 px-3">
                        <StatusBadge
                          status={dept.operationalStatus}
                          revalidationRequired={dept.revalidationRequired}
                        />
                      </td>

                      <td className="py-3 px-3 font-mono text-[11px]">
                        {prog.displayText}
                      </td>

                      <td className="py-3 px-3 font-mono text-[11px]">
                        {auto.displayText}
                      </td>

                      <td className="py-3 px-3 text-[11px]">
                        {blocker ? (
                          <span className="text-red-700 font-medium line-clamp-1" title={blocker.title}>
                            ⛔ {blocker.title}
                          </span>
                        ) : dept.lastDiagnosisNote ? (
                          <span className="text-slate-600 line-clamp-1" title={dept.lastDiagnosisNote}>
                            {dept.lastDiagnosisNote}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Sem impedimentos</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Coluna Direita: "Precisa da sua Atenção" e "Meu Dia" */}
        <div className="space-y-6">
          {/* Precisa da sua atenção */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <AlertOctagon className="w-4 h-4 text-red-600" />
                Precisa da sua atenção
              </h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                {activeBlockers.length + overdueActions.length}
              </span>
            </div>

            <div className="mt-3 space-y-2.5 text-xs">
              {activeBlockers.length === 0 && overdueActions.length === 0 ? (
                <div className="py-6 text-center text-slate-500">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p>Nenhum bloqueio ou pendência vencida no momento.</p>
                </div>
              ) : (
                <>
                  {activeBlockers.map((b) => (
                    <Link
                      key={b.id}
                      href={`/pendencias?id=${b.id}`}
                      className="block p-2.5 rounded-lg bg-red-50/50 border border-red-200 hover:bg-red-50 transition-colors"
                    >
                      <div className="flex items-center justify-between text-red-900 font-semibold">
                        <span>[BLOQUEIO] SP-{String(b.codeNumber).padStart(3, "0")}</span>
                        <span className="text-[10px] text-red-700">{b.department?.name}</span>
                      </div>
                      <p className="mt-1 text-slate-700 line-clamp-2">{b.title}</p>
                    </Link>
                  ))}

                  {overdueActions.map((a) => (
                    <Link
                      key={a.id}
                      href={`/pendencias?id=${a.id}`}
                      className="block p-2.5 rounded-lg bg-amber-50/50 border border-amber-200 hover:bg-amber-50 transition-colors"
                    >
                      <div className="flex items-center justify-between text-amber-900 font-semibold">
                        <span>[VENCIDA] Prazo Fatal</span>
                        <span className="text-[10px] text-amber-700 font-mono">
                          {a.dueDate?.toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      <p className="mt-1 text-slate-700 line-clamp-1">{a.title}</p>
                    </Link>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Meu Dia */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-centi-700" />
                Meu Dia ({user?.name?.split(" ")[0]})
              </h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {myDayIssues.length}
              </span>
            </div>

            <div className="mt-3 space-y-2 text-xs">
              {myDayIssues.length === 0 ? (
                <p className="py-4 text-center text-slate-500 text-xs">
                  Você não tem pendências atribuídas pendentes de ação.
                </p>
              ) : (
                myDayIssues.map((issue) => (
                  <Link
                    key={issue.id}
                    href={`/pendencias?id=${issue.id}`}
                    className="block p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
                  >
                    <div className="font-medium text-slate-900 line-clamp-1">
                      {issue.title}
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                      <span>{issue.department?.name || "Projeto"}</span>
                      <span className="font-medium text-centi-800">{issue.status}</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
