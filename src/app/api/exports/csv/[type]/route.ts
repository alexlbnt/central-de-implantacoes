import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server-session";
import prisma from "@/lib/db/prisma";
import { generateCsv } from "@/lib/exports/csv-generator";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { type } = await params;
  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json({ error: "Parâmetro projectId é obrigatório." }, { status: 400 });
  }

  // Verifica acesso ao projeto
  const membership = await prisma.projectMembership.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId: user.id,
      },
    },
  });

  if (user.role !== "ADMIN_GERAL" && !membership) {
    return NextResponse.json({ error: "Acesso não autorizado a este projeto." }, { status: 403 });
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    return NextResponse.json({ error: "Projeto não encontrado." }, { status: 404 });
  }

  let csvContent = "";
  let filename = `export_${type}_${new Date().toISOString().slice(0, 10)}.csv`;

  if (type === "pendencias") {
    const issues = await prisma.issue.findMany({
      where: { projectId },
      include: {
        department: true,
        assignee: true,
        author: true,
      },
      orderBy: { codeNumber: "asc" },
    });

    const headers = [
      "Código",
      "Título",
      "Tipo",
      "Prioridade",
      "Status",
      "Impedimento (Bloqueador)",
      "Condição de Espera",
      "Departamento",
      "Responsável",
      "Relator",
      "Prazo Fatal",
      "Criado Em",
    ];

    const rows = issues.map((i) => [
      `${project.codePrefix}-${String(i.codeNumber).padStart(3, "0")}`,
      i.title,
      i.type,
      i.priority,
      i.status,
      i.isOperationalBlocker ? "SIM" : "NÃO",
      i.waitingCondition,
      i.department?.name || "Geral",
      i.assignee?.name || "Não atribuído",
      i.author?.name || "Sistema",
      i.dueDate ? i.dueDate.toISOString().slice(0, 10) : "",
      i.createdAt.toISOString().slice(0, 10),
    ]);

    csvContent = generateCsv(headers, rows);
    filename = `pendencias_${project.codePrefix}_${new Date().toISOString().slice(0, 10)}.csv`;
  } else if (type === "departamentos") {
    const departments = await prisma.department.findMany({
      where: { entity: { projectId } },
      include: {
        entity: true,
        municipalResponsible: true,
        criticalProcesses: true,
        deliverables: true,
      },
      orderBy: { name: "asc" },
    });

    const headers = [
      "Entidade",
      "Departamento",
      "Status Operacional",
      "Responsável Municipal",
      "Processos Críticos",
      "Total de Entregas",
      "Revalidação Necessária",
      "Data Última Homologação",
    ];

    const rows = departments.map((d) => [
      d.entity.name,
      d.name,
      d.operationalStatus,
      d.municipalResponsible?.name || "Não definido",
      d.criticalProcesses.length,
      d.deliverables.length,
      d.revalidationRequired ? "SIM" : "NÃO",
      d.leaderValidatedAt ? d.leaderValidatedAt.toISOString().slice(0, 10) : "Nunca",
    ]);

    csvContent = generateCsv(headers, rows);
    filename = `departamentos_${project.codePrefix}_${new Date().toISOString().slice(0, 10)}.csv`;
  } else if (type === "acoes") {
    const tasks = await prisma.task.findMany({
      where: { decision: { meeting: { projectId } } },
      include: {
        decision: {
          include: {
            meeting: true,
          },
        },
      },
      orderBy: { dueDateFatal: "asc" },
    });

    const headers = [
      "ID Tarefa",
      "Título da Ação",
      "Decisão da Ata",
      "Responsável",
      "Prazo Fatal",
      "Status",
      "Concluída Em",
    ];

    const rows = tasks.map((t) => [
      t.id,
      t.title,
      t.decision ? `Decisão #${t.decision.number} (Ata ${t.decision.meeting.meetingDate.toISOString().slice(0, 10)})` : "Avulsa",
      t.responsibleName,
      t.dueDateFatal.toISOString().slice(0, 10),
      t.isCompleted ? "CONCLUÍDA" : "PENDENTE",
      t.completedAt ? t.completedAt.toISOString().slice(0, 10) : "",
    ]);

    csvContent = generateCsv(headers, rows);
    filename = `plano_acoes_${project.codePrefix}_${new Date().toISOString().slice(0, 10)}.csv`;
  } else {
    return NextResponse.json({ error: "Tipo de exportação CSV inválido." }, { status: 400 });
  }

  return new Response(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  });
}
